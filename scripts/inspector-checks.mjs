import assert from 'node:assert/strict';
import {makeDeckFixture} from '../tests/deck-fixtures.mjs';
import {makeSearchDeck} from './slide-search-checks.mjs';

/** Check element search and independent persistent native category toggles. */
export async function checkInspector(browser,origin) {
  browser.errors=[];
  await browser.navigate(origin);
  await browser.until('!!document.querySelector("#demo") && !document.querySelector("#demo").disabled','inspector ready');
  const sectionIds=['search','layout','move','guides','text-fit','selection'];
  assert.equal(await browser.evaluate('document.querySelectorAll(".inspector-section").length'),6,'every editing category is collapsible');
  assert.equal(await browser.evaluate('document.querySelector("#element-search-query").disabled'),true,'search requires a deck');
  await browser.evaluate(`(async()=>{
    globalThis.makeDeckFixture=${makeDeckFixture.toString()};globalThis.makeSearchDeck=${makeSearchDeck.toString()};
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('vendor/jszip.min.js',document.baseURI);script.onload=resolve;script.onerror=reject;document.head.append(script)});
    globalThis.inspectorSample=await (await fetch(new URL('sample.pptx',document.baseURI))).arrayBuffer();
    globalThis.inspectorFixture=await makeSearchDeck(JSZip,inspectorSample,12);
    globalThis.openInspectorFile=(blob,name)=>{const data=new DataTransfer();data.items.add(new File([blob],name));const input=document.querySelector('#file');input.files=data.files;input.dispatchEvent(new Event('change',{bubbles:true}))};
    openInspectorFile(inspectorFixture,'inspector.pptx');
  })()`);
  await browser.until('document.querySelector("#filename").textContent==="inspector.pptx" && !document.querySelector("#download").disabled','inspector fixture loaded');
  await browser.until('[...document.querySelectorAll("#stage iframe")].every(f=>f.contentDocument?.querySelector("[data-pptx-mover]"))','inspector frames ready');
  await browser.evaluate(`globalThis.inspectorFrames=[...document.querySelectorAll('#stage iframe')].map(frame=>({frame,doc:frame.contentDocument}));
    globalThis.inspectorEncodes=0;const encode=JSZip.prototype.generateAsync;JSZip.prototype.generateAsync=function(...args){inspectorEncodes++;return encode.apply(this,args)};
    globalThis.inspectorFrameWrites=0;const desc=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,'srcdoc');Object.defineProperty(HTMLIFrameElement.prototype,'srcdoc',{...desc,set(value){inspectorFrameWrites++;return desc.set.call(this,value)}});void 0;`);
  const fill=async query=>{
    await browser.evaluate(`(()=>{const input=document.querySelector('#element-search-query');input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(query)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await browser.evaluate('new Promise(resolve=>requestAnimationFrame(resolve))');
  };
  const selected=()=>browser.evaluate('Number(document.querySelector(".selection-number").textContent)');
  const checked=()=>browser.evaluate('[...document.querySelectorAll(".slide-item input")].map(input=>input.checked)');
  const apply=async action=>{
    await browser.evaluate(`document.querySelector('#element-search-${action}').click()`);
    await browser.evaluate('new Promise(resolve=>requestAnimationFrame(resolve))');
  };
  const initialScope=await checked();
  await fill('Alpha');
  assert.equal(await selected(),0,'typing never selects objects automatically');
  assert.ok(await browser.evaluate('document.querySelector("#element-search-count").textContent.includes("3개 요소 · 3개 슬라이드")'),'scope-aware match count');
  await apply('select');assert.equal(await selected(),3,'group, table and unmounted object selected');
  assert.deepEqual(await checked(),initialScope,'element search never changes slide scope');
  assert.equal(await browser.evaluate('!!document.querySelector("#slide-1 [data-selection-id=\\\"802\\\"]")'),true,'group wrapper is selected');
  assert.equal(await browser.evaluate('!!document.querySelector("#slide-1 [data-selection-id=\\\"803\\\"]")'),false,'group child is not selected independently');
  assert.equal(await browser.evaluate('!!document.querySelector("#slide-11 iframe")'),false,'offscreen match does not force iframe creation');
  await fill('BodyOnlyNeedle');await apply('select');assert.equal(await selected(),4,'new matches add to unrelated selected objects');
  await fill('Alpha');await apply('remove');assert.equal(await selected(),1,'remove only matching objects');
  await fill('Search group');await apply('select');assert.equal(await selected(),2,'object names are searchable');
  await fill('연간   매출'.normalize('NFD'));assert.ok(await browser.evaluate('document.querySelector("#element-search-count").textContent.includes("1개 요소")'),'full text and split runs');
  await fill('[a+b].*');assert.ok(await browser.evaluate('document.querySelector("#element-search-count").textContent.includes("1개 요소")'),'literal punctuation');
  for(const query of ['','   ','MasterOnlyNeedle','not-found']) {
    await fill(query);
    assert.equal(await browser.evaluate('document.querySelector("#element-search-select").disabled && document.querySelector("#element-search-remove").disabled'),true,'empty/unavailable matches disabled');
    assert.equal(await selected(),2,'queries preserve selection');
  }
  await fill('Alpha');
  await browser.evaluate(`const input=document.querySelector('#element-search-query');input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,keyCode:229,bubbles:true}));`);
  assert.equal(await selected(),2,'IME Enter is not a selection action');
  await browser.evaluate("document.querySelector('#element-search-query').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));");
  for(const [modifiers,expected] of [[0,4],[8,1]]) {
    await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,modifiers});
    await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,modifiers});
    await browser.until(`Number(document.querySelector('.selection-number').textContent)===${expected}`,'element search keyboard action');
  }
  // Changing checked scope refreshes matches without dropping remembered selections elsewhere.
  await browser.evaluate("document.querySelector('#range').value='3';document.querySelector('#apply-range').click();");
  assert.ok(await browser.evaluate('document.querySelector("#element-search-count").textContent.includes("1개 요소 · 1개 슬라이드")'),'search follows checked scope');
  await apply('select');assert.equal(await selected(),1);
  await browser.evaluate("document.querySelector('#select-all').click();");
  await browser.until('Number(document.querySelector(".selection-number").textContent)===2','unchecked object selection remembered');
  assert.ok(await browser.evaluate('document.querySelector("#element-search-count").textContent.includes("3개 요소 · 3개 슬라이드")'),'matches refresh with scope');
  // Native details must never unmount inputs or revert a user's open/closed choices.
  await browser.evaluate(`globalThis.inspectorNodes=[...document.querySelectorAll('.inspector input,.inspector select,.inspector button')];
    document.querySelector('#move-mode').value='relative';document.querySelector('#move-mode').dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelector('#x').value='12.34';document.querySelector('#y').value='-4.56';
    document.querySelector('#fit-scope').value='selected';document.querySelector('#fit-scope').dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelector('#guides-snap').click();`);
  for(const id of sectionIds)await browser.evaluate(`(()=>{const section=document.querySelector('#editor-section-${id}');if(section.open)section.querySelector('summary').click();})()`);
  assert.equal(await browser.evaluate('document.querySelectorAll(".inspector-section[open]").length'),0,'categories close independently');
  await browser.evaluate("document.querySelector('#select-none').click();document.querySelector('#select-all').click();");
  await browser.evaluate('new Promise(resolve=>requestAnimationFrame(resolve))');
  assert.equal(await browser.evaluate('document.querySelectorAll(".inspector-section[open]").length'),0,'search/selection rerenders do not reopen categories');
  assert.equal(await browser.evaluate('!document.querySelector("#undo").closest(".inspector-section")'),true,'undo remains outside collapsed categories');
  for(const id of sectionIds)await browser.evaluate(`document.querySelector('#editor-section-${id}>summary').click()`);
  assert.equal(await browser.evaluate('document.querySelectorAll(".inspector-section[open]").length'),6,'categories open independently');
  assert.equal(await browser.evaluate('inspectorNodes.every(node=>node.isConnected)'),true,'input DOM identity survives collapse');
  assert.deepEqual(await browser.evaluate('[document.querySelector("#x").value,document.querySelector("#y").value,document.querySelector("#fit-scope").value,document.querySelector("#guides-snap").checked]'),['12.34','-4.56','selected',false],'input drafts/preferences survive');
  assert.equal(await browser.evaluate('document.querySelector("#element-search-query").value'),'Alpha','query survives collapse');
  await browser.evaluate("document.querySelector('#editor-section-layout>summary').focus()");
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await browser.until('!document.querySelector("#editor-section-layout").open','keyboard collapses category');
  await browser.evaluate("document.querySelector('#editor-section-layout>summary').click()");
  // Editing remains wired after toggling every category.
  await apply('remove');assert.equal(await selected(),1,'search actions remain wired');
  await fill('BodyOnlyNeedle');
  await browser.evaluate("document.querySelector('#x').value='1';document.querySelector('#y').value='0';document.querySelector('#move').click();");
  await browser.until('!document.querySelector("#undo").disabled','move after category toggles');
  assert.ok(await browser.evaluate('document.querySelector("#slide-0 iframe").contentDocument.querySelector("[data-pptx-mover=\\\"801\\\"]").style.transform.includes("translate")'),'selected body moves');
  await browser.evaluate("document.querySelector('#editor-section-move>summary').click();document.querySelector('#undo').click();");
  assert.equal(await browser.evaluate('document.querySelector("#slide-0 iframe").contentDocument.querySelector("[data-pptx-mover=\\\"801\\\"]").style.transform'),'','undo works while move category is closed');
  assert.equal(await browser.evaluate('inspectorFrames.every(({frame,doc})=>frame.isConnected && frame.contentDocument===doc)'),true,'categories/search preserve preview documents');
  assert.equal(await browser.evaluate('inspectorFrameWrites'),0,'categories/search do not reload frames');
  assert.equal(await browser.evaluate('inspectorEncodes'),0,'categories/search do not encode ZIP');
  assert.deepEqual(await checked(),initialScope);
  await browser.evaluate("openInspectorFile(new Blob(['invalid']),'broken.pptx')");
  await browser.until('!document.querySelector("#notice").hidden && !document.querySelector("#download").disabled','failed import');
  assert.equal(await browser.evaluate('document.querySelector("#element-search-query").value'),'BodyOnlyNeedle','failed file preserves element query');
  assert.ok(await browser.evaluate('document.querySelector("#element-search-count").textContent.includes("1개 요소")'),'failed file preserves element index');
  await browser.evaluate("document.querySelector('#editor-section-search>summary').click();");
  await browser.evaluate("(async()=>openInspectorFile(await makeDeckFixture(JSZip,inspectorSample,1),'replacement.pptx'))()");
  await browser.until('document.querySelector("#filename").textContent==="replacement.pptx" && !document.querySelector("#download").disabled','replacement file');
  assert.equal(await browser.evaluate('document.querySelector("#element-search-query").value'),'','new file resets element query');
  assert.equal(await browser.evaluate('document.querySelector("#editor-section-search").open'),false,'new file preserves category preference');
  await browser.evaluate("document.querySelector('#editor-section-search>summary').click();");
  await fill('BodyOnlyNeedle');assert.ok(await browser.evaluate('document.querySelector("#element-search-count").textContent.includes("0개 요소")'),'new file has no stale element matches');
  assert.deepEqual(browser.errors,[],'inspector errors');
  console.log('PASS inspector: scoped text/name search, groups, add/remove, keyboard/IME, independent category toggles, persistent drafts, undo, lifecycle and frame/ZIP reuse');
}
