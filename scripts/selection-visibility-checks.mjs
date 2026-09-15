import assert from 'node:assert/strict';
import {makeDeckFixture} from '../tests/deck-fixtures.mjs';

/** @param {object} browser DevTools client. @param {string} origin App URL. */
export async function checkSelectionVisibility(browser,origin) {
  browser.errors=[];await browser.navigate(origin);
  await browser.until('!!document.querySelector("#demo")&&!document.querySelector("#demo").disabled','visibility editor ready');
  await browser.evaluate(`(async()=>{
    globalThis.makeDeckFixture=${makeDeckFixture.toString()};
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('vendor/jszip.min.js',document.baseURI);script.onload=resolve;script.onerror=reject;document.head.append(script);});
    const blob=await makeDeckFixture(JSZip,await (await fetch(new URL('sample.pptx',document.baseURI))).arrayBuffer(),4);
    const dt=new DataTransfer();dt.items.add(new File([blob],'visibility.pptx'));const input=document.querySelector('#file');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await browser.until('!document.querySelector("#download").disabled','visibility deck ready');
  const visible=()=>browser.evaluate('[...document.querySelectorAll(".slide-card")].filter(card=>!card.hidden).map(card=>Number(card.id.slice(6))+1)');
  const scope=value=>browser.evaluate(`document.querySelector('#range').value=${JSON.stringify(value)};document.querySelector('#apply-range').click()`);
  const toggle=id=>browser.evaluate(`document.querySelector('#${id}').click()`);
  assert.deepEqual(await visible(),[1,2,3,4]);
  assert.equal(await browser.evaluate('!!document.querySelector(".sidebar #editor-section-selection") && !document.querySelector(".inspector #editor-section-selection")'),true,'selection results live in the left sidebar');
  assert.equal(await browser.evaluate('!!(document.querySelector("#slide-list").compareDocumentPosition(document.querySelector("#editor-section-selection")) & Node.DOCUMENT_POSITION_FOLLOWING)'),true,'selection results follow the slide list');

  assert.equal(await browser.evaluate('document.querySelector("#only-with-selection").checked'),false);
  await browser.evaluate('document.querySelector("#only-with-selection").closest(".option-chip").click()');
  assert.deepEqual(await visible(),[],'chip background toggles its checkbox');
  await browser.evaluate('document.querySelector("#only-with-selection").closest(".option-chip").querySelector(".option-help").click()');
  assert.equal(await browser.evaluate('document.querySelector("#only-with-selection").checked'),true,'help does not toggle its option');
  await browser.evaluate('document.querySelector("#only-with-selection").focus()');
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  assert.deepEqual(await visible(),[1,2,3,4],'native keyboard checkbox interaction is preserved');
  await scope('1,3');
  await browser.evaluate(`const input=document.querySelector('#element-search-query');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Text 2');input.dispatchEvent(new Event('input',{bubbles:true}));`);
  await browser.until('!document.querySelector("#element-search-select").disabled','search selected slides');
  await toggle('element-search-select');await scope('1-4');
  assert.deepEqual(await browser.evaluate('[...document.querySelectorAll(".sidebar .selection-row:not(.miss)")].map(row=>Number(row.dataset.selectionSlide))'),[0,2],'separate result cards identify each selected slide');
  assert.equal(await browser.evaluate('document.querySelectorAll(".sidebar .selection-row.miss").length'),2,'unmatched slides have distinct cards');
  assert.deepEqual(await browser.evaluate('[...document.querySelectorAll(".slide-item")].map(row=>Number(row.dataset.selectedCount))'),[1,0,1,0],'slide rows show selected element counts');

  await browser.evaluate('globalThis.visibilityFrames=[...document.querySelectorAll("#stage iframe")].map(frame=>({frame,doc:frame.contentDocument}));void 0;');
  await toggle('only-with-selection');assert.deepEqual(await visible(),[1,3]);
  await toggle('only-checked');assert.deepEqual(await visible(),[1,3],'both view conditions apply');
  assert.equal(await browser.evaluate('document.querySelector("#undo").disabled'),true,'view filtering adds no undo history');
  await scope('3');assert.deepEqual(await visible(),[3]);
  await scope('1-4');assert.deepEqual(await visible(),[1,3],'scope changes preserve remembered selections');
  await toggle('delete-selection');assert.deepEqual(await visible(),[]);
  assert.equal(await browser.evaluate('document.querySelector("#no-visible-slides").hidden'),false,'empty result explains recovery');
  await toggle('undo');assert.deepEqual(await visible(),[1,3],'undo reveals restored selections');
  await toggle('clear-selection');assert.deepEqual(await visible(),[]);
  await toggle('only-with-selection');assert.deepEqual(await visible(),[1,2,3,4]);
  assert.equal(await browser.evaluate('[...document.querySelectorAll(".hit-overlay [data-selection-id]")].length'),0,'revealed slides have no stale selection outlines');
  assert.equal(await browser.evaluate('visibilityFrames.every(({frame,doc})=>frame.contentDocument===doc)'),true,'filtering reuses mounted previews');
  await toggle('only-with-selection');
  await toggle('language-en');
  await browser.until('document.querySelector("#no-visible-slides").textContent.startsWith("No slides contain selected elements")','English empty result');
  await toggle('language-ko');await toggle('only-with-selection');await toggle('only-checked');
  assert.deepEqual(await visible(),[1,2,3,4]);
  assert.deepEqual(browser.errors,[]);
  console.log('PASS selection visibility: filter intersection, selection/scope changes, deletion/undo, empty recovery, bilingual hints and frame reuse');
}
