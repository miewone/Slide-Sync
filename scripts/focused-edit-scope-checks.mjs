import assert from 'node:assert/strict';

/** Verify focused edit isolation and remembered scope using the zoom fixture. @param {object} browser Client. @param {boolean} native Native mode. */
export async function checkFocusedEditScope(browser,native){
  const prefix=native?'native-':'',stage=native?'.native-stage':'#stage',selector=`#${prefix}zoom-edit-scope`;
  const checks=()=>browser.evaluate(`[...document.querySelectorAll('${native?'.native-page-row':'.slide-item'} input[type=checkbox]')].map(e=>e.checked)`);
  const beforeChecks=await checks();
  const choose=async value=>{await browser.evaluate(`(()=>{const el=document.querySelector('${selector}');el.value='${value}';el.dispatchEvent(new Event('change',{bubbles:true}));})()`);await browser.evaluate('new Promise(resolve=>requestAnimationFrame(resolve))');};
  const count=()=>browser.evaluate(`Number(document.querySelector('${native?'#native-selection-summary .selection-number, .native-selection-summary>strong':'.selection-number'}').textContent)`);
  const originalCount=await count();await choose('page');assert.equal(await count(),2,'page scope only exposes current selected elements');
  assert.deepEqual(await checks(),beforeChecks,'scope picker preserves slide checks');
  if(!native){
    await browser.evaluate(`document.querySelector('#resize-width').value='120';document.querySelector('#resize-height').value='100';document.querySelector('#resize-apply').click()`);
    assert.equal(await browser.evaluate(`document.querySelectorAll('#stage iframe').length`),1,'page-only edit renders one frame');
    const focus=await browser.evaluate(`document.querySelector('#stage').dataset.zoomFocus`);assert.equal(focus,'0');
    await browser.evaluate(`document.querySelector('#zoom-reset').click()`);
    await browser.until(`!document.querySelector('#stage').dataset.zoomAnimating`,'reset animation completes');
    await browser.until(`!!document.querySelector('#slide-2 iframe')?.contentDocument?.querySelector('[data-pptx-mover="101"]')`,'other page restored');
    assert.equal(await browser.evaluate(`document.querySelector('#slide-2 iframe').contentDocument.querySelector('[data-pptx-mover="101"]').style.transform`),'','other page geometry was not edited');
    assert.match(await browser.evaluate(`document.querySelector('#slide-0 iframe').contentDocument.querySelector('[data-pptx-mover="101"]').style.transform`),/scale/,'focused page was edited');
    assert.equal(await count(),originalCount,'leaving zoom restores the previous selection scope');
    await browser.evaluate(`document.querySelector('#undo').click();document.querySelector('#resize-width').value='100';`);
    const point=await browser.evaluate(`(()=>{const r=document.querySelector('#slide-0 .slide-surface').getBoundingClientRect();return {x:r.left+30,y:r.top+30}})()`);
    await browser.send('Input.dispatchMouseEvent',{type:'mouseWheel',...point,deltaX:0,deltaY:-100,modifiers:2});
    await browser.until(`document.querySelector('#stage').dataset.zoomFocus==='0'&&!document.querySelector('#stage').dataset.zoomAnimating`,'focus returns');
  }
  await choose('selection');assert.equal(await count(),originalCount,'switching back restores all remembered selections');assert.deepEqual(await checks(),beforeChecks);
  assert.equal(await browser.evaluate(`document.querySelector('${selector}').closest('.zoom-control')!==null`),true,'edit scope is inside floating zoom panel');
}
