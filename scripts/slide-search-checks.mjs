import assert from 'node:assert/strict';
import {makeDeckFixture} from '../tests/deck-fixtures.mjs';

/** Generate long, split-run, group, and table texts that do not occur in slide titles. */
export async function makeSearchDeck(JSZip,sample,count) {
  const zip=await JSZip.loadAsync(await globalThis.makeDeckFixture(JSZip,sample,count));
  const run=text=>`<a:r><a:t>${text}</a:t></a:r>`;
  const shape=(id,text)=>`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Search body"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="900000" y="4000000"/><a:ext cx="7000000" cy="1500000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p>${text}</a:p></p:txBody></p:sp>`;
  const snippets=new Map([
    [1,shape(801,run('설명'.repeat(70)+' BodyOnlyNeedle ')+run('연')+run('간 ')+run('매출'))],
    [2,`<p:grpSp><p:nvGrpSpPr><p:cNvPr id="802" name="Search group"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="6858000"/><a:chOff x="0" y="0"/><a:chExt cx="12192000" cy="6858000"/></a:xfrm></p:grpSpPr>${shape(803,run('ALPHA 그룹'))}</p:grpSp>`],
    [3,`<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="804" name="Search table"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="900000" y="4000000"/><a:ext cx="7000000" cy="1500000"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr/><a:tblGrid><a:gridCol w="7000000"/></a:tblGrid><a:tr h="1500000"><a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p>${run('alpha [a+b].* 표')}</a:p></a:txBody><a:tcPr/></a:tc></a:tr></a:tbl></a:graphicData></a:graphic></p:graphicFrame>`],
    [count,shape(805,run('Alpha 마지막'))],
  ]);
  for(const [index,text] of snippets) {
    const path=`ppt/slides/slide${index}.xml`;
    zip.file(path,(await zip.file(path).async('string')).replace('</p:spTree>',text+'</p:spTree>'));
  }
  const master='ppt/slideMasters/slideMaster1.xml';
  zip.file(master,(await zip.file(master).async('string')).replace('</p:spTree>',shape(806,run('MasterOnlyNeedle'))+'</p:spTree>'));
  return zip.generateAsync({type:'blob'});
}

/** @param {object} browser DevTools client. @param {string} origin Application root or subpath. */
export async function checkSlideSearch(browser,origin) {
  browser.errors=[];
  await browser.navigate(origin);
  await browser.until('!!document.querySelector("#demo") && !document.querySelector("#demo").disabled','search editor ready');
  assert.equal(await browser.evaluate('document.querySelector("#slide-search-query").disabled'),true,'search requires a deck');
  await browser.evaluate(`(async()=>{
    globalThis.makeDeckFixture=${makeDeckFixture.toString()};globalThis.makeSearchDeck=${makeSearchDeck.toString()};
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('vendor/jszip.min.js',document.baseURI);script.onload=resolve;script.onerror=reject;document.head.append(script)});
    globalThis.searchSample=await (await fetch(new URL('sample.pptx',document.baseURI))).arrayBuffer();
    globalThis.searchFixture=await makeSearchDeck(JSZip,searchSample,12);
    globalThis.openSearchFile=(blob,name)=>{const transfer=new DataTransfer();transfer.items.add(new File([blob],name));const input=document.querySelector('#file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}))};
    openSearchFile(searchFixture,'search.pptx');
  })()`);
  await browser.until('document.querySelector("#filename").textContent==="search.pptx" && !document.querySelector("#download").disabled','search deck ready');
  await browser.until('[...document.querySelectorAll("#stage iframe")].every(f=>f.contentDocument?.querySelector("[data-pptx-mover]"))','search frames ready');
  await browser.evaluate(`globalThis.searchFrames=[...document.querySelectorAll('#stage iframe')].map(frame=>({frame,doc:frame.contentDocument}));
    globalThis.searchEncodes=0;const encode=JSZip.prototype.generateAsync;JSZip.prototype.generateAsync=function(...args){searchEncodes++;return encode.apply(this,args)};
    globalThis.searchFrameWrites=0;const descriptor=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,'srcdoc');Object.defineProperty(HTMLIFrameElement.prototype,'srcdoc',{...descriptor,set(value){searchFrameWrites++;return descriptor.set.call(this,value)}});
    document.querySelector('#range').value='1,5';document.querySelector('#apply-range').click();void 0;`);
  const checked=()=>browser.evaluate('[...document.querySelectorAll(".slide-item input")].flatMap((input,index)=>input.checked?[index]:[])');
  const matches=()=>browser.evaluate('[...document.querySelectorAll(".slide-item")].flatMap((row,index)=>row.classList.contains("search-match")?[index]:[])');
  const fill=async query=>{
    await browser.evaluate(`(()=>{const input=document.querySelector('#slide-search-query');input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(query)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await browser.evaluate('new Promise(resolve=>requestAnimationFrame(resolve))');
  };
  const enter=async(modifiers=0)=>{
    await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,modifiers});
    await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,modifiers});
    await browser.evaluate('new Promise(resolve=>requestAnimationFrame(resolve))');
  };
  await fill(' aLpHa ');assert.deepEqual(await matches(),[1,2,11],'body, group, table and unmounted matches');
  assert.deepEqual(await checked(),[0,4],'typing does not alter scope');
  await browser.evaluate('document.querySelector("#search-select").click()');
  await browser.until('document.querySelector("#slide-search-count").textContent.includes("3개 선택됨")','matching scope added');
  assert.deepEqual(await checked(),[0,1,2,4,11],'add matches preserves unrelated scope');
  await browser.evaluate('document.querySelector("#search-remove").click()');
  await browser.until('document.querySelector("#slide-search-count").textContent.includes("0개 선택됨")','matching scope removed');
  assert.deepEqual(await checked(),[0,4]);
  await fill('BodyOnlyNeedle');assert.deepEqual(await matches(),[0],'full text beyond label limit');
  assert.equal(await browser.evaluate('document.querySelector(".slide-label").textContent.includes("BodyOnlyNeedle")'),false,'not a title match');
  await fill('연간   매출'.normalize('NFD'));assert.deepEqual(await matches(),[0],'Unicode and adjacent runs');
  await fill('[a+b].*');assert.deepEqual(await matches(),[2],'literal punctuation');
  for(const query of ['','   ','not-found','MasterOnlyNeedle']) {
    await fill(query);assert.deepEqual(await matches(),[]);
    assert.equal(await browser.evaluate('document.querySelector("#search-select").disabled && document.querySelector("#search-remove").disabled'),true);
    await enter();assert.deepEqual(await checked(),[0,4],'empty/missing query cannot select all');
  }
  await fill('Alpha');
  await browser.evaluate(`const input=document.querySelector('#slide-search-query');input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,keyCode:229,bubbles:true}));`);
  assert.deepEqual(await checked(),[0,4],'IME Enter does not apply the search');
  await browser.evaluate("document.querySelector('#slide-search-query').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));");
  await enter();assert.deepEqual(await checked(),[0,1,2,4,11],'Enter adds matches');
  await enter(8);assert.deepEqual(await checked(),[0,4],'Shift+Enter removes matches');
  // Removing a scope does not erase remembered object selections.
  await browser.evaluate("document.querySelector('.slide-surface').dispatchEvent(new KeyboardEvent('keydown',{key:'a',ctrlKey:true,bubbles:true}));");
  await browser.until('Number(document.querySelector(".selection-number").textContent)>0','object selection before search scope change');
  const selected=await browser.evaluate('Number(document.querySelector(".selection-number").textContent)');
  await fill('BodyOnlyNeedle');await browser.evaluate('document.querySelector("#search-remove").click()');
  assert.deepEqual(await checked(),[4]);
  await browser.evaluate('document.querySelector("#search-select").click()');
  await browser.until(`Number(document.querySelector('.selection-number').textContent)===${selected}`,'remembered object selection restored');
  assert.equal(await browser.evaluate('document.querySelector("#undo").disabled'),true,'search actions add no edit history');
  assert.equal(await browser.evaluate('searchFrames.every(({frame,doc})=>frame.isConnected && frame.contentDocument===doc)'),true,'query/scope reuse frames');
  assert.equal(await browser.evaluate('searchFrameWrites'),0,'query/scope do not reload frames');
  assert.equal(await browser.evaluate('searchEncodes'),0,'query/scope do not encode ZIP');
  assert.equal(await browser.evaluate('document.querySelectorAll(".slide-card").length'),12,'deselecting does not delete slides');
  // Failed imports retain the old query/index, and exports retain every slide XML.
  await browser.evaluate("openSearchFile(new Blob(['invalid']),'broken.pptx')");
  await browser.until('!document.querySelector("#notice").hidden && !document.querySelector("#download").disabled','invalid file rejected');
  assert.equal(await browser.evaluate('document.querySelector("#slide-search-query").value'),'BodyOnlyNeedle');
  assert.deepEqual(await matches(),[0]);
  await browser.evaluate(`const createURL=URL.createObjectURL;URL.createObjectURL=function(blob){globalThis.searchExport=blob;return createURL.call(this,blob)};
    const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(!this.download)click.call(this)};
    document.querySelector('#download').click();`);
  await browser.until('!!globalThis.searchExport && !document.querySelector("#download").disabled','search export');
  assert.equal(await browser.evaluate(`(async()=>{const before=await JSZip.loadAsync(searchFixture),after=await JSZip.loadAsync(searchExport);
    for(let index=1;index<=12;index++){const path='ppt/slides/slide'+index+'.xml';if(await before.file(path).async('string')!==await after.file(path).async('string'))return false;}return true;})()`),true,'all slide XML stays unchanged');
  await browser.evaluate("(async()=>openSearchFile(await makeDeckFixture(JSZip,searchSample,1),'replacement.pptx'))()");
  await browser.until('document.querySelector("#filename").textContent==="replacement.pptx" && !document.querySelector("#download").disabled','new deck');
  assert.equal(await browser.evaluate('document.querySelector("#slide-search-query").value'),'','new file clears query');
  await fill('Alpha');assert.deepEqual(await matches(),[],'new file has a fresh index');
  assert.deepEqual(browser.errors,[],'search browser errors');
  console.log('PASS slide search: full/split/group/table text, literal/Unicode search, add/remove, keyboard/IME, scope memory, failed/new files, frame/ZIP/XML preservation');
}
