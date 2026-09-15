import {previewResources} from '../src/services/PreviewResources.js';
import {tagRenderer, cachePreview, syncPreviewPositions} from '../src/editor/preview-cache.js';
import {loadDeck, setPosition, serialize, exportDeck, refreshSlide, parseXml} from '../src/editor/core.js';

const assert = (condition, message) => { if (!condition) throw Error(message); };
const close = (actual, expected, message) => assert(Math.abs(actual-expected)<1, `${message}: ${actual} vs ${expected}`);
try {
  const directory = '/artifacts/preview-format-fixtures/';
  const file = new URLSearchParams(location.search).get('file');
  const manifest = await (await fetch(directory+'manifest.json')).json();
  const item = manifest.find(entry => entry.file === file);
  assert(item, 'fixture must be listed in the generated manifest');
  const bytes = await (await fetch(directory+file)).arrayBuffer();
  const JSZip = await previewResources.loadZip();
  const {init} = await previewResources.loadRenderer();
  const deck = await loadDeck(bytes, JSZip);
  assert(deck.slides.length === item.cases.length, 'standalone package slide count');
  // Check every package XML part and internal relationship, not just renderable slides.
  for (const entry of Object.values(deck.zip.files).filter(entry => !entry.dir)) {
    if (!/\.(xml|rels)$/.test(entry.name)) continue;
    const doc = parseXml(await entry.async('string'), entry.name);
    if (!entry.name.endsWith('.rels')) continue;
    const base = entry.name === '_rels/.rels' ? '' : entry.name.replace(/_rels\/[^/]+\.rels$/, '');
    for (const rel of doc.documentElement.children) {
      assert(rel.getAttribute('TargetMode') !== 'External', 'fixtures contain no external dependencies');
      const target = new URL(rel.getAttribute('Target'), 'https://fixture.local/'+base).pathname.slice(1);
      assert(deck.zip.file(target), `relationship target exists: ${target}`);
    }
  }
  const preview = init(document.querySelector('#preview'), {width:960, mode:'list', staticPreview:true});
  await preview.load(bytes);
  tagRenderer(preview.htmlRender);
  const report = [];
  for (const [index, entry] of item.cases.entries()) {
    preview.htmlRender.renderSlide(index);
    const slide = deck.slides[index];
    const root = cachePreview(preview.wrapper.lastElementChild, slide);
    const shape = id => root.querySelector(`[data-pptx-element="${id}"]`);
    const text = id => shape(id).querySelector('.text-wrapper');
    const span = id => text(id).querySelector('span');
    const table = shape(86)?.querySelector('table');
    if (entry.kind === 'table') {
      const element = slide.elements.find(element => element.id === '86');
      close(element.g.w, entry.widths.reduce((a,b)=>a+b,0), 'selection width');
      close(element.g.h, entry.heights.reduce((a,b)=>a+b,0), 'selection height');
      close(table.offsetWidth, element.g.w/12700, 'rendered table width');
      close(table.offsetHeight, element.g.h/12700, 'rendered table height');
      assert(table.rows.length === entry.heights.length, 'row count');
      assert(table.querySelectorAll('col').length === entry.widths.length, 'column count');
      if (entry.merge) {
        assert(table.rows[0].cells.length===2 && table.rows[1].cells.length===2, 'covered merge cells omitted');
        assert(table.rows[0].cells[0].colSpan===2 && table.rows[0].cells[1].rowSpan===2, 'merge spans retained');
      } else {
        entry.widths.forEach((width, col) => close(table.rows[0].cells[col].offsetWidth, width/12700, 'individual column width'));
      }
    } else if (entry.kind === 'placeholder') {
      assert(span(83).style.fontSize==='14px' && span(83).style.fontWeight==='bold', 'idx 3 body style');
      assert(span(85).style.fontSize==='13px' && span(85).style.fontWeight!=='bold', 'idx 2 heading style');
    } else if (entry.kind === 'default-index') {
      assert(span(89).style.fontSize==='11px' && span(90).style.fontSize==='11px', 'omitted and explicit zero index');
    } else if (entry.kind === 'fonts') {
      assert(span(83).style.fontFamily.includes('Arial'), 'inherited font retained');
      assert(span(85).style.fontFamily.includes('Courier New'), 'explicit font overrides inherited font');
      assert(span(89).style.fontFamily.includes('Courier New'), 'latin-only font retained');
    } else {
      for (const target of [text(83), table]) {
        assert(!/undefined|\[object Object\]/.test(target.textContent), 'no synthetic text artifacts');
        if (entry.kind==='breaks') {
          assert(target.querySelectorAll('br').length===2, 'two explicit line breaks');
          assert(target.textContent==='FirstSecondThird', 'text order around breaks');
          const spans = [...target.querySelectorAll('span')];
          assert(spans[0].getBoundingClientRect().top < spans[1].getBoundingClientRect().top && spans[1].getBoundingClientRect().top < spans[2].getBoundingClientRect().top, 'three visibly separate lines');
        } else assert(target.textContent==='BeforeAfter', 'empty and missing text render empty');
      }
    }
    const element = slide.elements.find(element => element.id === (table ? '86' : '83')) || slide.elements.find(element => element.id==='89');
    const before = serialize(slide.doc);
    const geometry = {...element.g};
    setPosition(element, geometry.x+12700, geometry.y);
    slide.dirty = true;
    syncPreviewPositions(root, slide);
    assert(root.querySelector(`[data-pptx-mover="${element.id}"]`).style.transform==='translate(1px, 0px)', 'visible movement');
    const reopened = await loadDeck(await exportDeck(deck), JSZip);
    close(reopened.slides[index].elements.find(candidate=>candidate.id===element.id).g.x, geometry.x+12700, 'edited export/reimport');
    slide.doc = parseXml(before);
    slide.dirty = false;
    refreshSlide(slide);
    syncPreviewPositions(root, slide);
    assert(root.querySelector(`[data-pptx-mover="${element.id}"]`).style.transform==='', 'undo restores preview');
    report.push({id:entry.id, status:'PASS'});
  }
  const exported = await JSZip.loadAsync(await exportDeck(deck));
  const original = await JSZip.loadAsync(bytes);
  for (const entry of Object.values(original.files).filter(entry => !entry.dir)) {
    const before = await entry.async('uint8array');
    const after = await exported.file(entry.name).async('uint8array');
    assert(before.length===after.length && before.every((value,index)=>value===after[index]), `undo export preserves package part: ${entry.name}`);
  }
  globalThis.fixtureReport = {file, cases:report, checks:['package XML/relationships','preview','move','undo','edited export/reimport','original part preservation']};
  document.querySelector('#result').textContent = `PASS ${file}: ${report.length} cases`;
} catch (error) {
  document.querySelector('#result').textContent = 'FAIL: '+error.stack;
}
