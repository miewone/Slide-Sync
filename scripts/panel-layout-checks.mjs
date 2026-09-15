import assert from 'node:assert/strict';

/** @param {object} browser DevTools client. @param {string} origin App URL. */
export async function checkPanelLayout(browser,origin) {
  browser.errors=[];await browser.navigate(origin);
  await browser.evaluate('localStorage.removeItem("slide-sync-panel-widths")');await browser.navigate(origin);
  await browser.until('!!document.querySelector("#demo")&&!document.querySelector("#demo").disabled','panel layout ready');
  const widths=()=>browser.evaluate(`({left:document.querySelector('.sidebar').getBoundingClientRect().width,right:document.querySelector('.inspector').getBoundingClientRect().width,center:document.querySelector('.workspace').getBoundingClientRect().width})`);
  const drag=async(side,dx,cancel=false)=>{
    const point=await browser.evaluate(`(()=>{const r=document.querySelector('.panel-resizer-${side}').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+120}})()`);
    await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
    await browser.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x+dx,y:point.y,button:'left',buttons:1});
    if(cancel)await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
    await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x+dx,y:point.y,button:'left',clickCount:1});
    await browser.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  };
  await browser.evaluate('document.querySelector("#demo").click()');
  await browser.until('!document.querySelector("#download").disabled','layout sample loaded');
  await browser.evaluate(`document.querySelector('.slide-surface').dispatchEvent(new KeyboardEvent('keydown',{key:'a',ctrlKey:true,bubbles:true}));`);
  await browser.until('Number(document.querySelector(".selection-number").textContent)>0','selection before resizing');
  await browser.evaluate(`globalThis.layoutFrames=[...document.querySelectorAll('#stage iframe')].map(frame=>({frame,doc:frame.contentDocument}));
    globalThis.layoutSelection=document.querySelector('.selection-number').textContent;void 0;`);
  const initial=await widths();await drag('left',80);const afterLeft=await widths();
  assert.ok(Math.abs(afterLeft.left-initial.left-80)<=1);assert.equal(afterLeft.right,initial.right);
  await drag('right',-60);const saved=await widths();assert.ok(Math.abs(saved.right-initial.right-60)<=1);
  assert.ok(saved.center>=300);
  assert.equal(await browser.evaluate('layoutFrames.every(({frame,doc})=>frame.contentDocument===doc)'),true,'resizing preserves preview documents');
  assert.equal(await browser.evaluate('document.querySelector(".selection-number").textContent===layoutSelection'),true,'resizing preserves element selection');
  assert.equal(await browser.evaluate('document.querySelector("#undo").disabled'),true,'resizing creates no PPTX edit history');
  await drag('left',70,true);assert.deepEqual(await widths(),saved,'Escape cancels the layout draft');
  await browser.navigate(origin);await browser.until('!!document.querySelector("#demo")&&!document.querySelector("#demo").disabled','saved layout restored');
  assert.deepEqual(await widths(),saved,'panel widths survive reload');
  await browser.evaluate('document.querySelector(".panel-resizer-left").focus()');
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  assert.equal((await widths()).left,saved.left+10,'keyboard separator adjustment');
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Home',code:'Home',windowsVirtualKeyCode:36});
  assert.equal((await widths()).left,216,'Home restores default width');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:760,height:1000,deviceScaleFactor:1,mobile:false});
  assert.equal(await browser.evaluate('getComputedStyle(document.querySelector(".panel-resizer-left")).display'),'none','narrow view uses the responsive layout');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await browser.until('getComputedStyle(document.querySelector(".panel-resizer-left")).display!=="none" && document.querySelector(".panel-resizer-right").getAttribute("aria-valuemax")=="480"','desktop dividers and measured width restored');
  await browser.evaluate('document.querySelector(".panel-resizer-right").focus()');
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Home',code:'Home',windowsVirtualKeyCode:36});
  assert.equal((await widths()).right,278);
  assert.deepEqual(browser.errors,[]);
  console.log('PASS panel layout: pointer/keyboard resize, minimum center, cancel, reload persistence, responsive view and editor preservation');
}
