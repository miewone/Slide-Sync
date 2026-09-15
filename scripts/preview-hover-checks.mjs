import assert from 'node:assert/strict';
import {makeDeckFixture} from '../tests/deck-fixtures.mjs';

/** @param {object} browser DevTools client. @param {string} origin Application root or subpath. */
export async function checkPreviewHover(browser,origin) {
  browser.errors=[];
  await browser.navigate(origin);
  await browser.until('!!document.querySelector("#demo") && !document.querySelector("#demo").disabled','hover app ready');
  await browser.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:30,y:20});
  await browser.evaluate(`(async()=>{
    globalThis.makeDeckFixture=${makeDeckFixture.toString()};
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('vendor/jszip.min.js',document.baseURI);script.onload=resolve;script.onerror=reject;document.head.append(script)});
    const sample=await (await fetch(new URL('sample.pptx',document.baseURI))).arrayBuffer();
    const blob=await makeDeckFixture(JSZip,sample,30),transfer=new DataTransfer();transfer.items.add(new File([blob],'hover.pptx'));
    const input=document.querySelector('#file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await browser.until('document.querySelector("#filename").textContent==="hover.pptx" && !document.querySelector("#download").disabled','hover fixture');
  await browser.evaluate(`document.querySelector('#range').value='1';document.querySelector('#apply-range').click();
    document.querySelector('#slide-29').scrollIntoView({block:'center'});document.querySelector('.sidebar').scrollTop=0;`);
  await browser.until('!!document.querySelector("#slide-29 iframe")?.contentDocument?.querySelector("[data-pptx-mover]")','last slide visible');
  assert.equal(await browser.evaluate('(()=>{const row=document.querySelector(".slide-item[data-slide-index=\\\"29\\\"]").getBoundingClientRect(),sidebar=document.querySelector(".sidebar").getBoundingClientRect();return row.top>sidebar.bottom})()'),true,'corresponding sidebar row starts out of view');
  await browser.evaluate(`document.querySelector('#slide-search-query').focus({preventScroll:true});
    globalThis.hoverFrameDocs=[...document.querySelectorAll('#stage iframe')].map(frame=>({frame,doc:frame.contentDocument}));
    globalThis.hoverStageTop=document.querySelector('#stage').scrollTop;globalThis.hoverPageTop=window.scrollY;globalThis.hoverInput=document.activeElement;`);
  const move=async index=>{
    const position=await browser.evaluate(`(()=>{const r=document.querySelector('#slide-${index} .slide-surface').getBoundingClientRect();return {x:r.left+r.width*.6,y:r.top+r.height*.4}})()`);
    await browser.send('Input.dispatchMouseEvent',{type:'mouseMoved',...position});
    await browser.until(`document.querySelector('.slide-item.preview-hover')?.dataset.slideIndex==='${index}'`,'sidebar follows preview '+index);
  };
  await move(29);
  assert.equal(await browser.evaluate('(()=>{const row=document.querySelector(".slide-item.preview-hover").getBoundingClientRect(),sidebar=document.querySelector(".sidebar").getBoundingClientRect();return row.top>=sidebar.top-1 && row.bottom<=sidebar.bottom+1})()'),true,'sidebar automatically reveals the hovered row');
  assert.equal(await browser.evaluate('document.querySelector("#stage").scrollTop===hoverStageTop && window.scrollY===hoverPageTop'),true,'hover scrolling stays inside sidebar');
  assert.equal(await browser.evaluate('document.activeElement===hoverInput'),true,'hover keeps keyboard focus on the search input');
  assert.deepEqual(await browser.evaluate('[...document.querySelectorAll(".slide-item input")].flatMap((input,index)=>input.checked?[index]:[])'),[0],'hover does not activate an unchecked slide');
  assert.equal(await browser.evaluate('Number(document.querySelector(".selection-number").textContent)'),0,'hover does not select objects');
  assert.equal(await browser.evaluate('document.querySelector("#undo").disabled'),true,'hover does not edit the deck');
  await move(28);
  assert.equal(await browser.evaluate('document.querySelectorAll(".slide-item.preview-hover").length'),1,'only one sidebar row is highlighted');
  await browser.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:30,y:20});
  await browser.until('document.querySelectorAll(".slide-item.preview-hover").length===0','pointer leave clears highlight');
  assert.equal(await browser.evaluate('hoverFrameDocs.every(({frame,doc})=>frame.isConnected && frame.contentDocument===doc)'),true,'hover preserves preview documents');
  // Replacement must clear old row indices, including those outside the next deck's range.
  await move(29);
  await browser.evaluate('document.querySelector("#demo").click()');
  await browser.until('document.querySelectorAll(".slide-card").length===3 && !document.querySelector("#download").disabled','replacement deck');
  assert.equal(await browser.evaluate('[...document.querySelectorAll(".slide-item.preview-hover")].every(row=>Number(row.dataset.slideIndex)<3)'),true,'replacement has no stale hovered index');
  assert.deepEqual(browser.errors,[],'preview hover browser errors');
  console.log('PASS preview hover: sidebar highlight/reveal, pointer leave, no scope/selection/focus changes, no preview/page scroll and frame reuse');
}
