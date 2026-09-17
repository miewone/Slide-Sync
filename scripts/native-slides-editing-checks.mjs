import {checkNativeResize} from './element-resize-checks.mjs';
import {checkNativeSimilarSelection} from './similar-selection-checks.mjs';
import {checkNativeImages} from './native-image-checks.mjs';
import {checkNativeSlidesRendering} from './native-slides-rendering-checks.mjs';
import {checkNativeSavedPreview} from './native-saved-preview-checks.mjs';
import assert from 'node:assert/strict';

/** Exercise native controls and actual pointer events, then undo edits to retain the caller's fixture. @param {object} browser DevTools client. */
export async function checkNativeSlidesEditing(browser){
  const click=selector=>browser.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const input=(selector,value)=>browser.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const select=(selector,value)=>browser.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const rect=()=>browser.evaluate(`(()=>{const e=document.querySelector('[data-object-id="shape_1"]>rect');return {x:+e.getAttribute('x'),y:+e.getAttribute('y'),w:+e.getAttribute('width'),h:+e.getAttribute('height')};})()`);
  assert.equal(await browser.evaluate('!!document.querySelector(".native-slides-editor>.topbar")&&!!document.querySelector(".native-slides-editor .editor-layout>.sidebar")&&!!document.querySelector(".native-slides-editor .editor-layout>.workspace")&&!!document.querySelector(".native-slides-editor .editor-layout>.inspector")'),true,'native workspace shares the original editor shell');
  await click('#native-preview-grid-4');
  assert.equal(await browser.evaluate('getComputedStyle(document.querySelector(".native-stage")).gridTemplateColumns.split(" ").length'),4);
  await click('#native-preview-grid-default');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await browser.evaluate('document.querySelector(".native-slides-editor").scrollWidth<=innerWidth'),true,'shared native editor fits mobile width');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await browser.until('!!document.querySelector("#native-slide-0 .native-layout")','native grid becomes visible');
  await checkNativeSimilarSelection(browser);
  await checkNativeResize(browser);
  await checkNativeImages(browser);
  await checkNativeSlidesRendering(browser);
  await checkNativeSavedPreview(browser);
  await input('#native-slide-search','shape_4');await click('#native-check-matches');
  assert.equal(await browser.evaluate('document.querySelectorAll(".native-page-row").length'),1);
  await input('#native-slide-search','');await input('#native-range','1');await click('#native-apply-range');
  await click('[data-native-element="shape_1"]');await input('#native-font-size','24');await click('#native-format-size');
  assert.equal(await browser.evaluate('document.querySelector("[data-object-id=shape_1] foreignObject span").style.fontSize'),'24px');
  await click('#native-undo');assert.equal(await browser.evaluate('document.querySelector("[data-object-id=shape_1] foreignObject span").style.fontSize'),'18px');
  await click('#native-redo');await click('#native-undo');
  await click('#native-format-bold');assert.equal(await browser.evaluate('document.querySelector("[data-object-id=shape_1] foreignObject span").style.fontWeight'),'400');await click('#native-undo');
  await browser.evaluate('document.querySelector("#native-preview-font").closest("details").open=true');
  await input('#native-preview-font','나눔고딕');await click('#native-preview-font-apply');await browser.until('!document.querySelector("#native-save").disabled','preview replacement font loaded');
  assert.match(await browser.evaluate('document.querySelector("[data-object-id=shape_1] foreignObject span").style.fontFamily'),/SlideSyncFont/);
  assert.equal(await browser.evaluate('document.querySelector("#native-undo").disabled'),true,'preview replacement does not edit native text style');
  await click('#native-preview-font-reset');
  const before=await rect();await click('#native-fit-height');await browser.until('!document.querySelector("#native-save").disabled','native text measured');
  assert.notEqual((await rect()).h,before.h);await click('#native-undo');assert.deepEqual(await rect(),before);
  await click('#native-fit-unwrap');await click('#native-fit-width');await browser.until('!document.querySelector("#native-save").disabled','native width measured');
  assert.notEqual((await rect()).w,before.w);await click('#native-undo');
  await select('#native-layout-target','slide');await click('[data-native-align="right"]');assert.equal((await rect()).x,620);await click('#native-undo');await select('#native-layout-target','selection');
  await input('#native-guide-position','2.54');await click('#native-guide-add');assert.equal(await browser.evaluate('document.querySelectorAll("#native-slide-0 .native-layout>line").length'),1);
  await click('#native-guide-undo');assert.equal(await browser.evaluate('document.querySelectorAll("#native-slide-0 .native-layout>line").length'),0);
  // Real pointer capture exercises dragging with checked-slide scope and one undo entry.
  await browser.evaluate('document.querySelector(".native-layout").scrollIntoView({block:"center"})');
  const second=await browser.evaluate('(()=>{const p=new DOMPoint(180,120).matrixTransform(document.querySelector(".native-layout").getScreenCTM());return {x:p.x,y:p.y};})()');
  const toggleSecond=async()=>{await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',...second,button:'left',clickCount:1,modifiers:2});await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',...second,button:'left',clickCount:1,modifiers:2});};
  await toggleSecond();assert.equal(await browser.evaluate('document.querySelector("[data-native-element=shape_2]").checked'),true,'Ctrl-click adds an unselected object');
  await toggleSecond();assert.equal(await browser.evaluate('document.querySelector("[data-native-element=shape_2]").checked'),false,'Ctrl-click removes a selected object');
  const coords=await browser.evaluate('(()=>{const s=document.querySelector(".native-layout"),m=s.getScreenCTM(),p=new DOMPoint(30,40).matrixTransform(m);return {x:p.x,y:p.y,dx:m.a*30};})()');
  await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',x:coords.x,y:coords.y,button:'left',clickCount:1});
  await browser.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:coords.x+coords.dx,y:coords.y,button:'left',buttons:1});
  await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:coords.x+coords.dx,y:coords.y,button:'left',clickCount:1});
  assert.ok(Math.abs((await rect()).x-40)<1);await click('#native-undo');assert.deepEqual(await rect(),before);
  await browser.evaluate('document.querySelector(".native-layout").focus()');
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight'});
  assert.ok((await rect()).x>before.x);await click('#native-undo');
  await click('[data-native-element="shape_1"]');await input('#native-range','1-2');await click('#native-apply-range');
  await browser.evaluate('document.querySelector(".native-layout").scrollIntoView({block:"center"})');
  const area=await browser.evaluate('(()=>{const m=document.querySelector(".native-layout").getScreenCTM(),a=new DOMPoint(0,0).matrixTransform(m),b=new DOMPoint(130,85).matrixTransform(m);return {x:a.x+1,y:a.y+1,endX:b.x,endY:b.y};})()');
  await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',x:area.x,y:area.y,button:'left',clickCount:1});
  await browser.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:area.endX,y:area.endY,button:'left',buttons:1});
  await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:area.endX,y:area.endY,button:'left',clickCount:1});
  assert.equal(await browser.evaluate('document.querySelector("[data-native-element=shape_1]").checked'),true,'box gesture selects objects');
  assert.match(await browser.evaluate('document.querySelector(".native-slides-editor [role=status]").textContent'),/적용 대상 선택: 3개/,'box selection applies across checked slides');
  await browser.evaluate('document.querySelector("#native-clear-selection").click()');
  assert.equal(await browser.evaluate('document.querySelector("#native-undo").disabled'),true);
  console.log('PASS native editing: text formatting, fit, preview fonts, slide alignment, guides, dragging, keyboard and cross-slide box selection');
}

/** Verify formatted native saving uses original objects and scoped text fields. @param {object} browser DevTools client. */
export async function checkNativeSlidesFormatSave(browser){
  await browser.evaluate('document.querySelector("[data-native-element=shape_1]").click()');
  await browser.evaluate('document.querySelector("#native-format-bold").click()');
  await browser.evaluate('document.querySelector("#native-save").click()');
  await browser.evaluate('document.querySelector("input[value=original]").click()');
  await browser.evaluate('document.querySelector("#drive-save-confirm").click()');
  await browser.until('!document.querySelector("#drive-save-dialog")','native text format saved');
  assert.equal(await browser.evaluate('driveDocuments.presentation_1.slides[0].pageElements[0].shape.text.textElements[0].textRun.style.bold'),false);
  assert.equal(await browser.evaluate('driveDocuments.presentation_1.slides[1].pageElements[0].shape.text.textElements[0].textRun.style.bold'),true);
  assert.deepEqual(await browser.evaluate('driveCalls.filter(c=>c.url.includes(":batchUpdate")).at(-1).body.requests'),[{updateTextStyle:{objectId:'shape_1',textRange:{type:'ALL'},style:{bold:false},fields:'bold'}}]);
}
