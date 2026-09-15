import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

/** Verify whole-box formatting, scope, export preservation and clone-safe undo in browser XML/DOM. @param {object} browser DevTools client. @param {string} origin Dev server. */
export async function checkTextFormat(browser,origin) {
  await browser.navigate(origin);
  await browser.until('!!document.querySelector("#demo")&&!document.querySelector("#demo").disabled','format ready');
  assert.equal(await browser.evaluate('document.querySelector("#text-format-size").disabled'),true);
  const result=await browser.evaluate(`(async()=>{
    const core=await import('/src/editor/core.js');
    const {TextFormat}=await import('/src/editor/TextFormat.js');
    const fit=await import('/src/editor/text-fit.js');
    const preview=await import('/src/editor/preview-cache.js');
    const {previewResources}=await import('/src/services/PreviewResources.js');
    const Zip=await previewResources.loadZip();
    const deck=await core.loadDeck(await (await fetch('/sample.pptx')).arrayBuffer(),Zip);
    const slide=deck.slides[0],element=slide.elements.find(e=>fit.textBoxInfo(e));
    const original=core.serialize(slide.doc),textBefore=core.descendants(element.node,'t').map(n=>n.textContent);
    const other=core.serialize(deck.slides[1].doc);
    const selection=new Map([[0,new Set([element.id])],[1,new Set(deck.slides[1].elements.map(e=>e.id))]]);
    const candidates=TextFormat.candidates(deck,new Set([0]),selection);
    if(candidates.length!==1)throw Error('checked scope ignored');
    const root=document.createElement('div');root.className='slide-wrapper';
    root.innerHTML='<div data-pptx-element="'+element.id+'"><div class="text-wrapper" style="font-size:20px"><p><span style="font-size:18px;font-weight:300">Original</span></p></div></div>';
    preview.cachePreview(root,slide);
    const initial=root.querySelector('span').style.cssText;
    const size=TextFormat.apply(candidates,{size:32});preview.syncPreviewPositions(root,slide);
    const bold=TextFormat.apply(candidates,{bold:true});preview.syncPreviewPositions(root,slide);
    const span=root.querySelector('span');
    if(parseFloat(span.style.fontSize)!==32*fit.textBoxInfo(element).fontScale||span.style.fontWeight!=='700')throw Error('preview size/weight');
    const late=root.cloneNode(true);preview.syncPreviewPositions(late,slide);
    if(late.querySelector('span').style.cssText!==span.style.cssText)throw Error('late mount');
    if(JSON.stringify(textBefore)!==JSON.stringify(core.descendants(element.node,'t').map(n=>n.textContent)))throw Error('text changed');
    const normal=TextFormat.apply(candidates,{bold:false});preview.syncPreviewPositions(root,slide);
    if(span.style.fontWeight!=='400')throw Error('normal weight');
    core.restore(deck,normal);preview.syncPreviewPositions(root,slide);
    const exported=await Zip.loadAsync(await core.exportDeck(deck));
    const xml=core.parseXml(await exported.file(slide.path).async('string'));
    const body=core.descendants(xml,'sp').find(n=>core.descendants(n,'cNvPr')[0]?.getAttribute('id')===element.id);
    if(core.descendants(body,'rPr').some(n=>n.getAttribute('sz')!=='3200'||n.getAttribute('b')!=='1'))throw Error('export formatting');
    if(core.serialize(deck.slides[1].doc)!==other)throw Error('unchecked slide changed');
    const source=await Zip.loadAsync(deck.original);
    for(const path of Object.keys(source.files).filter(path=>!source.files[path].dir&&path!==slide.path)){
      if(await source.file(path).async('base64')!==await exported.file(path).async('base64'))throw Error('unrelated package part changed: '+path);
    }
    core.restore(deck,bold);preview.syncPreviewPositions(root,slide);
    if(span.style.fontWeight!=='300'||parseFloat(span.style.fontSize)!==32*fit.textBoxInfo(slide.elements.find(e=>e.id===element.id)).fontScale)throw Error('independent bold undo');
    core.restore(deck,size);preview.syncPreviewPositions(root,slide);preview.syncPreviewPositions(late,slide);
    if(core.serialize(slide.doc)!==original||span.style.cssText!==initial||late.querySelector('span').style.cssText!==initial)throw Error('full undo: '+JSON.stringify({xml:core.serialize(slide.doc)===original,span:span.style.cssText,late:late.querySelector('span').style.cssText,initial}));
    for(const invalid of [0,401,NaN,Infinity]){
      let rejected=false;try{TextFormat.apply(TextFormat.candidates(deck,new Set([0]),selection),{size:invalid});}catch{rejected=true;}
      if(!rejected||core.serialize(slide.doc)!==original)throw Error('validation atomicity');
    }
    return {name:element.name,id:element.id};
  })()`);
  assert.ok(result.id);
  await browser.evaluate('document.querySelector("#demo").click()');
  await browser.until('!document.querySelector("#download").disabled','format sample loaded');
  await browser.evaluate(`(()=>{
    const input=document.querySelector('#element-search-query');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(result.name)});
    input.dispatchEvent(new Event('input',{bubbles:true}));
  })()`);
  await browser.until('!document.querySelector("#element-search-select").disabled','format search result');
  await browser.evaluate('document.querySelector("#element-search-select").click()');
  await browser.until('!document.querySelector("#text-format-size").disabled','selected box formatting enabled');
  await browser.evaluate(`globalThis.formatFrame=document.querySelector('#slide-0 iframe');
    globalThis.formatDocument=formatFrame.contentDocument;
    document.querySelector('#text-format-size').value='32';document.querySelector('#text-format-size').dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelector('#text-format-bold').click();`);
  assert.equal(await browser.evaluate(`document.querySelector('#text-format-size').value`),'32');
  assert.equal(await browser.evaluate(`formatDocument.querySelector('[data-pptx-mover="${result.id}"] .text-wrapper span').style.fontWeight`),'700');
  await browser.evaluate(`document.querySelector('#text-format-bold').click()`);
  assert.equal(await browser.evaluate(`formatDocument.querySelector('[data-pptx-mover="${result.id}"] .text-wrapper span').style.fontWeight`),'400');
  await browser.evaluate(`document.querySelector('#undo').click()`);
  assert.equal(await browser.evaluate(`formatDocument.querySelector('[data-pptx-mover="${result.id}"] .text-wrapper span').style.fontWeight`),'700');
  assert.equal(await browser.evaluate(`formatDocument===document.querySelector('#slide-0 iframe').contentDocument`),true,'formatting reuses frame');
  await browser.evaluate(`document.querySelector('#text-format-toolbar').scrollIntoView({block:'center'})`);
  assert.equal(await browser.evaluate(`!!document.querySelector('.workspace-bar #text-format-toolbar')&&!document.querySelector('.inspector #text-format-toolbar')`),true,'toolbar belongs to workspace bar');
  await browser.evaluate(`document.querySelector('#text-format-increase').click()`);
  assert.equal(await browser.evaluate(`document.querySelector('#text-format-size').value`),'33');
  await browser.evaluate(`document.querySelector('#text-format-decrease').click()`);
  assert.equal(await browser.evaluate(`document.querySelector('#text-format-size').value`),'32');
  assert.equal(await browser.evaluate(`document.querySelector('#text-format-bold').getAttribute('aria-pressed')`),'true');
  const shortcut=async key=>{
    await browser.evaluate(`document.querySelector('#slide-0 .slide-surface').focus()`);
    await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key,code:'Key'+key.toUpperCase(),modifiers:2,windowsVirtualKeyCode:key.toUpperCase().charCodeAt(0)});
    await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key,code:'Key'+key.toUpperCase(),modifiers:2,windowsVirtualKeyCode:key.toUpperCase().charCodeAt(0)});
  };
  await shortcut('z');
  assert.equal(await browser.evaluate(`document.querySelector('#text-format-size').value`),'33','Ctrl+Z undoes font size');
  await shortcut('y');
  assert.equal(await browser.evaluate(`document.querySelector('#text-format-size').value`),'32','Ctrl+Y redoes font size');
  await shortcut('z');
  await browser.evaluate(`document.querySelector('#text-format-bold').click()`);
  assert.equal(await browser.evaluate(`document.querySelector('#redo').disabled`),true,'new edit discards redo');
  await shortcut('z');await shortcut('y');
  assert.equal(await browser.evaluate(`document.querySelector('#text-format-bold').getAttribute('aria-pressed')`),'false','bold redo');
  await browser.evaluate(`document.querySelector('#delete-selection').click()`);
  assert.equal(await browser.evaluate(`formatDocument.querySelector('[data-pptx-mover="${result.id}"]').hidden`),true);
  await shortcut('z');
  assert.equal(await browser.evaluate(`formatDocument.querySelector('[data-pptx-mover="${result.id}"]').hidden`),false,'delete undo restores object');
  await shortcut('y');
  assert.equal(await browser.evaluate(`formatDocument.querySelector('[data-pptx-mover="${result.id}"]').hidden`),true,'delete redo hides object');
  await shortcut('z');
  const guides=await browser.evaluate(`document.querySelectorAll('.guide-line').length`);
  await browser.evaluate(`document.querySelector('#guide-horizontal').click()`);
  const added=await browser.evaluate(`document.querySelectorAll('.guide-line').length`);
  assert.ok(added>guides);
  await shortcut('z');assert.equal(await browser.evaluate(`document.querySelectorAll('.guide-line').length`),guides);
  await shortcut('y');assert.equal(await browser.evaluate(`document.querySelectorAll('.guide-line').length`),added,'guide redo');
  await browser.evaluate(`document.querySelector('#text-format-toolbar').scrollIntoView({block:'center'})`);
  const controls=await browser.evaluate(`['delete-selection','undo','redo'].map(id=>{const box=document.getElementById(id).getBoundingClientRect();return {top:box.top,width:box.width,height:box.height};})`);
  assert.ok(controls.every(box=>box.top===controls[0].top&&box.width<=36&&box.height<=32),'delete/undo/redo share a compact row');
  const screenshot=await browser.send('Page.captureScreenshot',{format:'png'});
  await writeFile('artifacts/text-format.png',Buffer.from(screenshot.data,'base64'));
  console.log('PASS text formatting: scope, size, bold on/off, unchanged text/package parts, late preview, undo and validation');
}
