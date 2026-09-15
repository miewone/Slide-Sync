import {previewResources} from '../src/services/PreviewResources.js';
import {PreviewTheme} from '../src/editor/preview-theme.js';
import {tagRenderer, cachePreview, syncPreviewPositions} from '../src/editor/preview-cache.js';
import {loadDeck} from '../src/editor/core.js';

const assert = (value, message) => { if (!value) throw Error(message); };
try {
  const JSZip = await previewResources.loadZip();
  const {init} = await previewResources.loadRenderer();
  const zip = await JSZip.loadAsync(await (await fetch('/sample.pptx')).arrayBuffer());
  const slideXML = await zip.file('ppt/slides/slide1.xml').async('string');
  const shape = slideXML.match(/<p:sp>.*?<\/p:sp>/s)[0];
  // Same ID as a slide shape deliberately exercises cross-part ID isolation.
  const art = shape.replaceAll('4268D6', 'FF0000');
  const placeholder = art.replace('id="2"', 'id="901"').replace('<p:nvPr>', '<p:nvPr><p:ph/>');
  const hidden = art.replace('id="2"', 'id="902" hidden="1"');
  for (const path of ['ppt/slideMasters/slideMaster1.xml', 'ppt/slideLayouts/slideLayout1.xml']) {
    const xml = await zip.file(path).async('string');
    zip.file(path, xml.replace('</p:spTree>', art + placeholder + hidden + '</p:spTree>'));
  }
  const buffer = await zip.generateAsync({type:'arraybuffer'});
  const deck = await loadDeck(buffer, JSZip);
  const preview = init(document.querySelector('#preview'), {width:960, height:540, mode:'list'});
  await preview.load(buffer);
  const renderer = preview.htmlRender;
  // Reproduce the missing artwork before installing the adapter.
  renderer.renderSlide(0);
  assert(!preview.wrapper.querySelector('.slide-master-wrapper').children.length, 'fixture reproduces missing master artwork');
  preview.wrapper.replaceChildren();
  new PreviewTheme(renderer).install();
  tagRenderer(renderer);
  renderer.renderSlide(0);
  let root = preview.wrapper.firstElementChild;
  for (const selector of ['.slide-master-wrapper', '.slide-layout-wrapper']) {
    const layer = root.querySelector(selector);
    assert(layer.children.length === 1, 'render artwork, omit placeholders and hidden shapes: ' + selector);
    assert(layer.querySelector('[fill="rgba(255,0,0,1)"]'), 'retain artwork color');
  }
  root = cachePreview(root, deck.slides[0]);
  const masterBefore = root.querySelector('.slide-master-wrapper').outerHTML;
  const element = deck.slides[0].elements.find(e => e.id === '2');
  element.g.x += 12700;
  assert(syncPreviewPositions(root, deck.slides[0]) === 1, 'move only matching slide element');
  assert(root.querySelector('.slide-master-wrapper').outerHTML === masterBefore, 'master remains fixed despite duplicate ID');
  element.g.x -= 12700;
  syncPreviewPositions(root, deck.slides[0]);
  assert(root.querySelector('[data-pptx-mover="2"]').style.transform === '', 'undo translation');
  const slide = preview.pptx.slides[0];
  for (const [part, tag] of [[slide, 'p:sld'], [slide.slideLayout, 'p:sldLayout']]) {
    part.source[tag].attrs ||= {};
    part.source[tag].attrs.showMasterSp = '0';
    preview.wrapper.replaceChildren();
    renderer.renderSlide(0);
    assert(!preview.wrapper.querySelector('.slide-master-wrapper').children.length, 'respect showMasterSp');
    assert(preview.wrapper.querySelector('.slide-layout-wrapper').children.length === 1, 'retain layout artwork');
    delete part.source[tag].attrs.showMasterSp;
  }
  preview.wrapper.replaceChildren();
  renderer.renderSlide(0);
  document.querySelector('#result').textContent = 'PASS: theme artwork, colors, placeholders, hidden shapes, visibility, movement and undo';
} catch (error) {
  document.querySelector('#result').textContent = 'FAIL: ' + error.stack;
}
