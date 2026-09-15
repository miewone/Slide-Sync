import assert from 'node:assert/strict';

/** @param {object} browser DevTools client. @param {string} origin App root or deployment base. */
export async function checkPreviewActivation(browser,origin) {
  browser.errors=[];
  await browser.navigate(origin);
  await browser.until('!!document.querySelector("#demo") && !document.querySelector("#demo").disabled','activation app ready');
  await browser.evaluate('document.querySelector("#demo").click()');
  await browser.until('!document.querySelector("#download").disabled && document.querySelectorAll("#stage iframe").length===8','activation sample');
  await browser.until('[...document.querySelectorAll("#stage iframe")].every(frame=>frame.contentDocument?.querySelector("[data-pptx-mover]"))','activation frame content');
  await browser.evaluate(`globalThis.activationFrames=[...document.querySelectorAll('#stage iframe')].map(frame=>({frame,doc:frame.contentDocument}));
    globalThis.activationEncodes=0;const encode=JSZip.prototype.generateAsync;JSZip.prototype.generateAsync=function(...args){activationEncodes++;return encode.apply(this,args)};
    globalThis.activationFrameWrites=0;const desc=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,'srcdoc');Object.defineProperty(HTMLIFrameElement.prototype,'srcdoc',{...desc,set(value){activationFrameWrites++;return desc.set.call(this,value)}});
    document.querySelector('.slide-surface').dispatchEvent(new KeyboardEvent('keydown',{key:'a',ctrlKey:true,bubbles:true}));void 0;`);
  await browser.until('Number(document.querySelector(".selection-number").textContent)>0','remember selections');
  const counts=await browser.evaluate('[0,1,2].map(index=>document.querySelectorAll("#slide-"+index+" [data-selection-id]").length)');
  const checked=()=>browser.evaluate('[...document.querySelectorAll(".slide-item input")].flatMap((input,index)=>input.checked?[index]:[])');
  const point=async(index,x=.3,y=.01)=>browser.evaluate(`(()=>{const r=document.querySelector('#slide-${index} .slide-surface').getBoundingClientRect();return {x:r.left+r.width*${x},y:r.top+r.height*${y}}})()`);
  const gesture=async(index,{x=.3,y=.01,drag=false,button='left'}={})=>{
    const start=await point(index,x,y),end=drag?{x:start.x+25,y:start.y+25}:start;
    await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',...start,button,clickCount:1});
    if(drag)await browser.send('Input.dispatchMouseEvent',{type:'mouseMoved',...end,button,buttons:1});
    await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',...end,button,clickCount:1});
    await browser.evaluate('new Promise(resolve=>requestAnimationFrame(resolve))');
  };
  await browser.evaluate("document.querySelector('#range').value='1';document.querySelector('#apply-range').click();");
  await gesture(1);
  assert.deepEqual(await checked(),[0,1],'preview click adds only that slide');
  assert.equal(await browser.evaluate('Number(document.querySelector(".selection-number").textContent)'),counts[0]+counts[1],'activation restores remembered selection without selecting the clicked object');
  assert.equal(await browser.evaluate('document.querySelector("#slide-1 .card-head input").checked'),true,'card checkbox synchronized');
  assert.equal(await browser.evaluate('document.querySelector("#slide-1").classList.contains("inactive")'),false,'inactive styling removed');
  assert.equal(await browser.evaluate('document.querySelector("#undo").disabled'),true,'activation is not an edit');
  await browser.evaluate("document.querySelector('#slide-1 .card-head input').click();");
  await browser.until('!document.querySelector("#slide-1 .card-head input").checked','checkbox deselection');
  assert.deepEqual(await checked(),[0],'checkbox click can still deactivate');
  await browser.evaluate("document.querySelector('#select-none').click();");
  await gesture(2,{x:.8,y:.65});
  assert.deepEqual(await checked(),[2],'blank preview click activates from empty scope');
  assert.equal(await browser.evaluate('Number(document.querySelector(".selection-number").textContent)'),counts[2],'blank activation preserves remembered objects');
  await browser.evaluate('document.querySelector("#clear-selection").click()');
  await gesture(2);
  assert.equal(await browser.evaluate('Number(document.querySelector(".selection-number").textContent)'),1,'second click performs normal object selection');
  await gesture(1,{drag:true});
  assert.deepEqual(await checked(),[1,2],'starting on an inactive object activates the slide');
  assert.equal(await browser.evaluate('document.querySelector("#undo").disabled'),true,'activation gesture cannot accidentally move objects');
  assert.equal(await browser.evaluate('activationFrames.every(({doc})=>[...doc.querySelectorAll("[data-pptx-mover]")].every(node=>!node.style.transform))'),true,'coordinates unchanged by activation');
  // Keyboard activation and ignored secondary/right pointers use the same scope rules.
  await browser.evaluate("document.querySelector('#select-none').click();document.querySelector('#slide-0 .slide-surface').focus();");
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await browser.until('document.querySelector("#slide-0 .card-head input").checked','Enter activation');
  assert.deepEqual(await checked(),[0]);
  await browser.evaluate("document.querySelector('#slide-1 .slide-surface').focus();");
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await browser.until('document.querySelector("#slide-1 .card-head input").checked','Space activation');
  assert.deepEqual(await checked(),[0,1]);
  await browser.evaluate(`const surface=document.querySelector('#slide-2 .slide-surface');
    surface.dispatchEvent(new PointerEvent('pointerdown',{button:2,pointerId:88,isPrimary:true,bubbles:true}));
    surface.dispatchEvent(new PointerEvent('pointerdown',{button:0,pointerId:99,isPrimary:false,bubbles:true}));`);
  assert.deepEqual(await checked(),[0,1],'right and secondary pointers do not activate');
  // Capture the activation before the guide's own drag listener.
  await browser.evaluate("document.querySelector('#guide-horizontal').click();document.querySelector('#guides-edit').click();");
  const guidePosition=await browser.evaluate('document.querySelector("#guide-position").value');
  await gesture(2,{x:.4,y:.5,drag:true});
  assert.deepEqual(await checked(),[0,1,2]);
  assert.equal(await browser.evaluate('document.querySelector("#guide-position").value'),guidePosition,'activation over a guide does not move it');
  await browser.evaluate("document.querySelector('#undo').click();document.querySelector('#guides-edit').click();");
  assert.equal(await browser.evaluate('document.querySelectorAll(".guide-line").length'),0,'one undo removes the original guide addition');
  assert.equal(await browser.evaluate('activationFrames.every(({frame,doc})=>frame.isConnected && frame.contentDocument===doc)'),true,'activation reuses iframe documents');
  assert.equal(await browser.evaluate('activationFrameWrites'),0,'no frame reload');
  assert.equal(await browser.evaluate('activationEncodes'),0,'no ZIP encoding');
  // While loading, previews remain non-interactive, even if the old deck is visible.
  await browser.evaluate(`document.querySelector('#select-none').click();
    const original=JSZip.loadAsync;let resume;const gate=new Promise(resolve=>{resume=resolve});
    JSZip.loadAsync=(...args)=>gate.then(()=>original.apply(JSZip,args));
    globalThis.resumeActivationLoad=()=>{JSZip.loadAsync=original;resume()};document.querySelector('#demo').click();`);
  await browser.until('!!document.querySelector(".topbar.busy")','suspended load');
  await gesture(0);
  assert.deepEqual(await checked(),[],'busy preview cannot activate');
  await browser.evaluate('resumeActivationLoad()');
  await browser.until('!document.querySelector("#download").disabled','resumed load');
  assert.deepEqual(await checked(),[0,1,2,3,4,5,6,7],'file loading completes normally');
  assert.deepEqual(browser.errors,[],'preview activation browser errors');
  console.log('PASS preview activation: additive scope, remembered selection, first-click-only, checkbox, keyboard, guide/busy guards and frame/ZIP reuse');
}
