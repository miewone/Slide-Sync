import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

/** @param {object} browser DevTools client. @param {string} origin App URL for grid and edit-preservation checks. */
export async function checkPreviewGrid(browser,origin) {
  browser.errors=[];
  await browser.navigate(origin);
  await browser.until('!!document.querySelector("#demo")&&!document.querySelector("#demo").disabled','grid controls ready');
  const unaffected=await browser.evaluate(`(()=>{
    const control=document.querySelector('.preview-grid-control'),options=document.querySelector('.workspace-options');
    const before=options.getBoundingClientRect().toJSON();control.style.display='none';
    const after=options.getBoundingClientRect().toJSON();control.style.display='';return JSON.stringify(before)===JSON.stringify(after);
  })()`);
  assert.equal(unaffected,true,'grid controls do not displace existing options');
  assert.ok(await browser.evaluate('parseFloat(getComputedStyle(document.querySelector(".preview-grid-times")).fontSize)<=9'),'small multiplication separator');
  await browser.evaluate('document.querySelector("#demo").click()');
  await browser.until('!document.querySelector("#download").disabled&&!!document.querySelector("#stage iframe")','sample loaded');
  await browser.until('document.querySelector("#stage iframe").contentDocument?.querySelector("[data-pptx-mover]")','first frame ready');
  const columns=()=>browser.evaluate('getComputedStyle(document.querySelector("#stage")).gridTemplateColumns.split(" ").length');
  assert.equal(await browser.evaluate('document.querySelector("#preview-grid-default").getAttribute("aria-pressed")'),'true','responsive default on startup');
  assert.equal(await browser.evaluate('document.querySelector("#stage").classList.contains("preview-grid")'),false,'default retains original responsive styles');
  await browser.evaluate('document.querySelector("#preview-grid-2").click()');
  await browser.until('document.querySelector("#stage").classList.contains("preview-grid")','two by two applied');
  assert.equal(await columns(),2);
  await browser.evaluate(`globalThis.gridCards=[...document.querySelectorAll('.slide-card')];
    globalThis.gridFrames=[...document.querySelectorAll('#stage iframe')].map(frame=>({frame,doc:frame.contentDocument}));
    document.querySelector('.slide-surface').dispatchEvent(new KeyboardEvent('keydown',{key:'a',ctrlKey:true,bubbles:true}));
    document.querySelector('#move-mode').value='relative';document.querySelector('#move-mode').dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelector('#x').value='0.25';document.querySelector('#y').value='0';document.querySelector('#move').click();`);
  await browser.until('!document.querySelector("#undo").disabled','edit before grid change');
  const selection=await browser.evaluate('document.querySelector(".selection-number").textContent');
  const before=await browser.evaluate('gridFrames[0].doc.querySelector("[data-pptx-mover]").style.transform');
  await browser.evaluate('document.querySelector("#preview-grid-4").click()');
  await browser.until('getComputedStyle(document.querySelector("#stage")).gridTemplateColumns.split(" ").length===4','four columns');
  assert.equal(await browser.evaluate('document.querySelectorAll(".slide-card:not([hidden])").length'),8,'all slides remain in the scrolling grid');
  assert.equal(await browser.evaluate('document.querySelector(".selection-number").textContent'),selection);
  assert.equal(await browser.evaluate('gridCards.every(card=>card.isConnected)&&gridFrames.every(({frame,doc})=>frame.contentDocument===doc)'),true,'reuse cards and frame documents');
  assert.equal(await browser.evaluate('gridFrames[0].doc.querySelector("[data-pptx-mover]").style.transform'),before);
  assert.equal(await browser.evaluate('document.querySelectorAll(".slide-item input:checked").length'),8,'scope unchanged');
  const fill=async(id,value)=>{
    await browser.evaluate(`(()=>{const input=document.querySelector('#preview-grid-${id}');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await browser.evaluate('new Promise(resolve=>requestAnimationFrame(resolve))');
  };
  await fill('columns','3');await fill('rows','2');
  assert.equal(await columns(),3);
  await browser.until(`(()=>{const stage=document.querySelector('#stage'),style=getComputedStyle(stage);
    const row=parseFloat(style.gridAutoRows),gap=parseFloat(style.rowGap);
    return Math.abs(row*2+gap+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom)-stage.clientHeight)<2;})()`,'custom rows fit viewport');
  await fill('columns','0');assert.equal(await columns(),3,'invalid zero does not change layout');
  await fill('columns','');assert.equal(await columns(),3,'empty draft does not change layout');
  await fill('columns','3');
  await browser.evaluate('document.querySelector("#undo").click()');
  await browser.until('gridFrames[0].doc.querySelector("[data-pptx-mover]").style.transform===""','undo still restores edit');
  await browser.evaluate('document.querySelector("#preview-grid-2").click();document.querySelector("#stage").scrollTop=100000');
  await browser.until('!!document.querySelector(".slide-card:last-of-type iframe")','last slide reachable by scrolling');
  await browser.evaluate('document.querySelector("#preview-grid-default").click()');
  await browser.until('!document.querySelector("#stage").classList.contains("preview-grid")','restore responsive layout');
  assert.equal(await browser.evaluate('gridCards.every(card=>card.isConnected)&&gridFrames.every(({frame,doc})=>frame.contentDocument===doc)'),true,'returning to default preserves previews');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1100,height:1000,deviceScaleFactor:1,mobile:false});
  await browser.until('getComputedStyle(document.querySelector("#stage")).gridTemplateColumns.split(" ").length===1','default follows original narrow window layout');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  if(origin==='http://127.0.0.1:4179') {
    await browser.evaluate('document.querySelector("#stage").scrollTop=0;document.querySelector("#preview-grid-4").click()');
    await browser.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    await writeFile('artifacts/preview-grid-4.png',Buffer.from((await browser.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
    await browser.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
    await browser.evaluate('document.querySelector("#preview-grid-2").click()');
    await browser.until('getComputedStyle(document.querySelector("#stage")).gridTemplateColumns.split(" ").length===2','mobile keeps selected columns');
    assert.equal(await browser.evaluate('(()=>{const rect=document.querySelector(".preview-grid-control").getBoundingClientRect();return rect.left>=0&&rect.right<=innerWidth})()'),true,'compact controls fit mobile width');
    await writeFile('artifacts/preview-grid-mobile.png',Buffer.from((await browser.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
    await browser.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  }
  assert.deepEqual(browser.errors,[],'grid changes have no browser errors');
  console.log('PASS preview grid: compact controls, 2×2/4×4/3×2, continuous scroll, validation, preserved scope/selection/frames/undo');
}
