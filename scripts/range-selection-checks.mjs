import {checkAlignment} from './alignment-checks.mjs';
import assert from 'node:assert/strict';
import {makeDeckFixture} from '../tests/deck-fixtures.mjs';

/** Deterministic shapes for browser selection checks; positions use 960px preview units. */
async function makeSelectionDeck(JSZip,sample,count) {
  const zip=await JSZip.loadAsync(await globalThis.makeDeckFixture(JSZip,sample,count));
  const shape=(id,name,x,y,w,h,extra='')=>`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}" ${extra}/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x*12700}" y="${y*12700}"/><a:ext cx="${w*12700}" cy="${h*12700}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="7799DD"/></a:solidFill></p:spPr></p:sp>`;
  const shapes=shape(101,'A',100,100,100,70)+shape(102,'B',240,120,100,70)+shape(103,'C',400,100,100,70)+shape(104,'D',120,270,100,50)+shape(105,'E',400,270,120,80)+shape(106,'Hidden',130,110,10,10,'hidden="1"');
  for(let index=1;index<=count;index++) {
    const path=`ppt/slides/slide${index}.xml`;
    const doc=new DOMParser().parseFromString(await zip.file(path).async('string'),'application/xml');
    const tree=doc.getElementsByTagNameNS('*','spTree')[0];
    for(const node of [...tree.children])if(!['nvGrpSpPr','grpSpPr'].includes(node.localName))node.remove();
    const xml=new XMLSerializer().serializeToString(doc);
    zip.file(path,xml.replace('</p:spTree>',(index===2?shape(90,'Background',0,0,960,540):'')+shapes+'</p:spTree>'));
  }
  return zip.generateAsync({type:'blob'});
}

/**
 * Verify real pointer range selection and preserve preview/ZIP/movement invariants.
 * @param {object} browser DevTools client.
 * @param {string} origin Production or development URL, including deployment base.
 * @param {number} count Number of fixture slides (use 12 to include unmounted targets).
 */
export async function checkRangeSelection(browser,origin,count=12) {
  browser.errors=[];
  await browser.navigate(origin);
  await browser.until('!!document.querySelector("#demo") && !document.querySelector("#demo").disabled','range editor ready');
  await browser.evaluate(`(async()=>{
    globalThis.makeDeckFixture=${makeDeckFixture.toString()};globalThis.makeSelectionDeck=${makeSelectionDeck.toString()};
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('vendor/jszip.min.js',document.baseURI);script.onload=resolve;script.onerror=reject;document.head.append(script)});
    const sample=await (await fetch(new URL('sample.pptx',document.baseURI))).arrayBuffer();
    const blob=await makeSelectionDeck(JSZip,sample,${count});const transfer=new DataTransfer();transfer.items.add(new File([blob],'selection.pptx'));
    const file=document.querySelector('#file');file.files=transfer.files;file.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await browser.until('!document.querySelector("#download").disabled && !!document.querySelector("#slide-0 iframe")?.contentDocument?.querySelector("[data-pptx-mover]")','range fixture loaded');
  await browser.evaluate(`globalThis.rangeFrames=[...document.querySelectorAll('#stage iframe')].map(frame=>({frame,doc:frame.contentDocument}));
    globalThis.rangeEncodes=0;const originalEncode=JSZip.prototype.generateAsync;JSZip.prototype.generateAsync=function(...args){rangeEncodes++;return originalEncode.apply(this,args)};
    globalThis.rangeFrameWrites=0;const descriptor=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,'srcdoc');Object.defineProperty(HTMLIFrameElement.prototype,'srcdoc',{...descriptor,set(value){rangeFrameWrites++;return descriptor.set.call(this,value)}});void 0;`);
  const position=async(index,x,y)=>browser.evaluate(`(()=>{const r=document.querySelector('#slide-${index} .slide-surface').getBoundingClientRect();return {x:r.left+${x}/960*r.width,y:r.top+${y}/540*r.height}})()`);
  const ids=async(index=0)=>browser.evaluate(`[...document.querySelectorAll('#slide-${index} .hit-overlay [data-selection-id]')].map(n=>n.dataset.selectionId).sort()`);
  const number=async()=>browser.evaluate('Number(document.querySelector(".selection-number").textContent)');
  const rectangle=async(from,to,{index=0,modifiers=0,cancel,inspect}={})=>{
    const a=await position(index,...from),b=await position(index,...to);
    await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',...a,button:'left',clickCount:1,modifiers});
    await browser.send('Input.dispatchMouseEvent',{type:'mouseMoved',...b,button:'left',buttons:1,modifiers});
    await browser.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    if(inspect)await inspect();
    if(cancel==='escape')await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
    if(cancel==='pointercancel')await browser.evaluate(`document.querySelector('#slide-${index} .slide-surface').dispatchEvent(new PointerEvent('pointercancel',{pointerId:1,bubbles:true}));`);
    await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',...b,button:'left',clickCount:1,modifiers});
    await browser.evaluate('new Promise(resolve=>requestAnimationFrame(resolve))');
  };
  await rectangle([20,60],[360,210],{inspect:async()=>{
    assert.equal(await number(),0,'draft does not change selection');
    assert.equal(await browser.evaluate('getComputedStyle(document.querySelector("#slide-0 .box-selection")).display!=="none"'),true,'visible rectangle during drag');
  }});
  assert.deepEqual(await ids(),['101','102']);assert.equal(await number(),2*count,'same range across all checked slides');
  assert.equal(await browser.evaluate('document.querySelector("#undo").disabled'),true,'selection adds no undo history');
  // Additive modifiers are independent of Shift-constrained item movement.
  for(const modifiers of [2,8,4]) {
    await rectangle([20,60],[360,210]);
    await rectangle([380,80],[520,190],{modifiers});
    assert.deepEqual(await ids(),['101','102','103'],'Ctrl/Shift/Meta add to the selection');
  }
  await rectangle([360,210],[20,60]);assert.deepEqual(await ids(),['101','102'],'reverse drag');
  await rectangle([380,80],[520,190],{cancel:'escape'});assert.deepEqual(await ids(),['101','102'],'Escape restores previous selection');
  await rectangle([380,80],[520,190],{cancel:'pointercancel'});assert.deepEqual(await ids(),['101','102'],'pointer cancellation restores previous selection');
  await rectangle([20,60],[450,210]);assert.deepEqual(await ids(),['101','102'],'partially covered C is excluded');
  // Source slide 2 has a full-slide background; explicit mode allows starting over it.
  await browser.evaluate('document.querySelector("#box-select-mode").click()');
  await rectangle([20,60],[360,210],{index:1});assert.deepEqual(await ids(1),['101','102'],'range mode works over a background shape');
  await browser.evaluate('document.querySelector("#box-select-mode").click()');
  assert.equal(await browser.evaluate('rangeFrames.every(({frame,doc})=>frame.isConnected && frame.contentDocument===doc)'),true,'range selection preserves existing iframe documents');
  assert.equal(await browser.evaluate('rangeFrameWrites'),0,'no frame reload for range selection');
  assert.equal(await browser.evaluate('rangeEncodes'),0,'no ZIP encoding for range selection');
  if(count>3) {
    assert.equal(await browser.evaluate(`!!document.querySelector('#slide-${count-1} iframe')`),false,'last selected slide need not have an iframe');
    await browser.evaluate(`document.querySelector('#slide-${count-1}').scrollIntoView({block:'center'});`);
    await browser.until(`!!document.querySelector('#slide-${count-1} iframe')?.contentDocument?.querySelector('[data-pptx-mover]')`,'unmounted selection enters viewport');
    assert.deepEqual(await ids(count-1),['101','102'],'offscreen selection appears on scroll');
    await browser.evaluate("document.querySelector('#slide-0').scrollIntoView({block:'start'});");
    await browser.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  }
  // Scope replacement touches only checked slides and preserves remembered unchecked IDs.
  await browser.evaluate("document.querySelector('#range').value='1,3';document.querySelector('#apply-range').click();");
  await rectangle([380,80],[520,190]);assert.equal(await number(),2);assert.deepEqual(await ids(),['103']);
  await browser.evaluate("document.querySelector('#select-all').click();");
  await browser.until(`Number(document.querySelector('.selection-number').textContent)===${2*count-2}`,'unchecked selections preserved');
  // Normal item dragging must still move, and undo must preserve the selected set.
  const a=await position(0,450,135),b={x:a.x+25,y:a.y+10};
  await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',...a,button:'left',clickCount:1});
  await browser.send('Input.dispatchMouseEvent',{type:'mouseMoved',...b,button:'left',buttons:1});
  await browser.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',...b,button:'left',clickCount:1});
  await browser.until('!document.querySelector("#undo").disabled','existing item drag commits');
  assert.ok(await browser.evaluate('document.querySelector("#slide-0 iframe").contentDocument.querySelector("[data-pptx-mover=\'103\']").style.transform.includes("translate")'),'item movement still works');
  await browser.evaluate('document.querySelector("#undo").click()');
  assert.equal(await browser.evaluate('document.querySelector("#slide-0 iframe").contentDocument.querySelector("[data-pptx-mover=\'103\']").style.transform'),'','item movement undo');
  assert.deepEqual(await ids(),['103']);
  await checkAlignment(browser,rectangle);
  assert.deepEqual(browser.errors,[],'range selection has no browser errors');
  console.log(`PASS range selection (${count} slides): rectangle, scope, modifiers, cancellation, containment, background mode, offscreen state, frame/ZIP reuse and item movement`);
}
