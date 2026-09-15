import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

/** Verify floating preview anchoring, resizing, focus isolation and active-slide updates. @param {object} browser DevTools client. */
export async function checkNativeSavedPreview(browser){
  const geometry=()=>browser.evaluate(`(()=>{const p=document.querySelector('#native-saved-preview').getBoundingClientRect(),c=document.querySelector('.native-render-container').getBoundingClientRect();return {x:p.x,y:p.y,width:p.width,height:p.height,left:p.left-c.left,bottom:c.bottom-p.bottom,containerWidth:c.width,containerHeight:c.height};})()`);
  const before=await geometry();assert.ok(Math.abs(before.left-12)<1&&Math.abs(before.bottom-12)<1,'preview anchors inside rendering container');
  assert.equal(await browser.evaluate('!!document.querySelector(".native-tools #native-saved-preview")'),false,'saved preview leaves the inspector');
  const handle=await browser.evaluate('(()=>{const r=document.querySelector("#native-saved-preview-resize").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');
  await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',...handle,button:'left',clickCount:1});
  await browser.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:handle.x+70,y:handle.y-40,button:'left',buttons:1});
  await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:handle.x+70,y:handle.y-40,button:'left',clickCount:1});
  const resized=await geometry();assert.ok(Math.abs(resized.width-before.width-70)<2&&Math.abs(resized.height-before.height-40)<2,'corner drag changes both dimensions');
  assert.ok(Math.abs(resized.left-12)<1&&Math.abs(resized.bottom-12)<1,'resize keeps bottom-left anchor');
  assert.equal(await browser.evaluate('document.querySelector("#native-undo").disabled'),true,'resize does not edit slides');
  const start=await browser.evaluate('(()=>{const r=document.querySelector("#native-saved-preview-resize").getBoundingClientRect();return {x:r.x+12,y:r.y+12};})()');
  await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',...start,button:'left',clickCount:1});
  await browser.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:start.x+2000,y:start.y-2000,button:'left',buttons:1});
  const bounded=await geometry();assert.ok(bounded.width<=bounded.containerWidth-23&&bounded.height<=bounded.containerHeight-23,'drag cannot escape container');
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
  await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
  await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:start.x+2000,y:start.y-2000,button:'left',clickCount:1});
  assert.equal((await geometry()).width,resized.width,'Escape cancels resizing without closing workspace');
  await browser.evaluate('document.querySelectorAll(".native-slide-link")[1].click()');
  assert.equal(await browser.evaluate('document.querySelector("#native-saved-preview header>span").textContent'),'02','preview follows selected slide');
  await browser.evaluate('document.querySelectorAll(".native-slide-link")[0].click()');
  await browser.evaluate('document.querySelector(".native-stage").scrollTop=10000');
  assert.ok(Math.abs((await geometry()).bottom-12)<1,'preview remains anchored while slides scroll');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await browser.until('document.querySelector("#native-saved-preview").clientWidth<=document.querySelector(".native-render-container").clientWidth-22','preview fits narrow rendering container');
  const mobile=await geometry();assert.ok(mobile.height<=mobile.containerHeight-23);
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await browser.evaluate('document.querySelector(".native-stage").scrollTop=0');
  await writeFile('artifacts/native-saved-preview.png',Buffer.from((await browser.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  console.log('PASS native saved preview: bottom-left anchor, corner resize, bounds, Escape, slide switching, scrolling and mobile');
}
