import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

/** @param {object} browser DevTools client with the 12-slide search fixture already loaded. */
export async function checkElementNames(browser) {
  const focus=async()=>{
    await browser.evaluate("document.querySelector('#element-search-query').focus()");
    await browser.until('!!document.querySelector("#element-search-names")','name catalogue opens');
  };
  const names=()=>browser.evaluate('[...document.querySelectorAll(".element-name-label")].map(node=>node.textContent)');
  const choose=async name=>{
    const point=await browser.evaluate(`(()=>{const button=[...document.querySelectorAll('.element-name-item')].find(node=>node.querySelector('.element-name-label').textContent===${JSON.stringify(name)});button.scrollIntoView({block:'nearest'});const r=button.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
    await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
    await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
    await browser.until(`document.querySelector('#element-search-query').value===${JSON.stringify(name)} && !document.querySelector('#delete-selection').disabled`,'catalogue choice applied');
  };
  await focus();
  assert.ok((await names()).includes('Search group'),'group name visible');
  assert.equal((await names()).filter(name=>name==='Text 2').length,1,'duplicate names consolidated');
  assert.ok(await browser.evaluate('[...document.querySelectorAll(".element-name-item")].some(node=>node.textContent.includes("Text 2") && node.textContent.includes("12개"))'),'duplicate count visible');
  assert.equal(await browser.evaluate('(()=>{const a=document.querySelector("#element-search-query").getBoundingClientRect(),p=document.querySelector("#element-search-names").getBoundingClientRect();return p.right<a.left && p.left>=0 && p.bottom<=innerHeight})()'),true,'catalogue fits to input left');
  const shot=await browser.send('Page.captureScreenshot',{format:'png'});
  await writeFile('artifacts/element-names.png',Buffer.from(shot.data,'base64'));
  await choose('Search group');
  await browser.until('Number(document.querySelector(".selection-number").textContent)===1','click selects named group');
  assert.equal(await browser.evaluate('document.querySelector("#slide-1 .selection-name-label").textContent'),'Search group','group selection label');
  assert.equal(await browser.evaluate('document.querySelector("#element-search-query").value'),'Search group');
  assert.equal(await browser.evaluate('document.querySelector("#undo").disabled'),true,'catalogue selection creates no edit');
  await choose('Search table');
  await browser.until('Number(document.querySelector(".selection-number").textContent)===2','name choice adds to selection');
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
  await browser.until('document.activeElement?.classList.contains("element-name-item")','keyboard enters catalogue');
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await browser.until('!document.querySelector("#element-search-names")','Escape closes');
  assert.equal(await browser.evaluate('document.activeElement.id'),'element-search-query','Escape restores input focus');
  assert.equal(await browser.evaluate('Number(document.querySelector(".selection-number").textContent)'),2,'Escape does not clear chosen elements');
  await browser.evaluate("document.querySelector('#range').value='3';document.querySelector('#apply-range').click();document.querySelector('#range').focus();");
  await focus();
  assert.equal((await names()).includes('Search group'),false,'unchecked names excluded');
  assert.ok((await names()).includes('Search table'),'checked table visible');
  await browser.evaluate("document.querySelector('#clear-selection').click()");
  await choose('Search table');
  await browser.evaluate("document.querySelector('#delete-selection').click()");
  assert.equal(await browser.evaluate('document.querySelector("#slide-2 .selection-name-label").hidden'),true,'deleted selection hides badge');
  await focus();
  assert.equal((await names()).includes('Search table'),false,'deleted name removed');
  await browser.evaluate("document.querySelector('#undo').click()");
  await focus();
  assert.ok((await names()).includes('Search table'),'undo restores name');
  assert.equal(await browser.evaluate('document.querySelector("#slide-2 .selection-name-label").hidden'),false,'undo restores badge');
  await browser.evaluate("document.querySelector('#select-none').click()");
  await focus();
  assert.equal((await names()).length,0,'empty scope has no names');
  assert.ok(await browser.evaluate('document.querySelector(".element-name-empty").textContent.includes("체크")'),'empty state explains scope');
  await browser.evaluate("document.querySelector('#select-all').click();document.querySelector('#range').focus();");
  await browser.until('!document.querySelector("#element-search-names")','outside focus dismisses');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:540,height:800,deviceScaleFactor:1,mobile:false});
  await focus();
  assert.equal(await browser.evaluate('(()=>{const p=document.querySelector("#element-search-names").getBoundingClientRect();return p.left>=0 && p.right<=innerWidth && p.top>=0 && p.bottom<=innerHeight})()'),true,'narrow viewport stays within bounds');
  await browser.evaluate("document.querySelector('#editor-section-search>summary').click()");
  await browser.until('!document.querySelector("#element-search-names")','collapse dismisses catalogue');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await browser.evaluate("document.querySelector('#editor-section-search>summary').click();document.querySelector('#clear-selection').click();document.querySelector('#element-search-query').focus();document.querySelector('#element-search-query').blur();window.scrollTo(0,0);");
  await checkSelectionLabel(browser);
  console.log('PASS element names: focus/left placement, duplicate counts, click/add selection, keyboard, scope, delete/undo, empty state, dismissal and narrow viewport');
}

/** @param {object} browser Loaded search fixture; verify actual clicks and badge geometry on its first slide. */
async function checkSelectionLabel(browser) {
  await browser.evaluate("document.querySelector('#range').value='1';document.querySelector('#apply-range').click();document.querySelector('#slide-0').scrollIntoView({block:'center'});");
  const click=async(x,y,modifiers=0)=>{
    const point=await browser.evaluate(`(()=>{const r=document.querySelector('#slide-0 .slide-surface').getBoundingClientRect();return {x:r.left+r.width*${x},y:r.top+r.height*${y}}})()`);
    await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1,modifiers});
    await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1,modifiers});
  };
  await click(.3,.18);
  await browser.until('document.querySelector("#slide-0 .selection-name-label")?.textContent==="Text 2"','click exposes element name');
  assert.equal(await browser.evaluate(`(()=>{const surface=document.querySelector('#slide-0 .slide-surface'),label=surface.querySelector('.selection-name-label').getBoundingClientRect(),box=surface.querySelector('[data-selection-id] polygon').getBoundingClientRect(),r=surface.getBoundingClientRect();return Math.abs(label.left-box.left)<2 && label.bottom<=box.top && label.top>r.top+5 && getComputedStyle(surface.querySelector('.selection-name-label')).pointerEvents==='none'})()`),true,'badge follows selection top-left rather than slide corner, without capturing clicks');
  await click(.25,.46,8);
  await browser.until('document.querySelector("#slide-0 .selection-name-label")?.textContent==="Text 2 외 1개"','multi-selection summary');
  const left=()=>browser.evaluate('document.querySelector("#slide-0 .selection-name-label").getBoundingClientRect().left');
  const before=await left();
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  assert.ok(await left()>before,'badge follows movement');
  await browser.evaluate("document.querySelector('#undo').click()");
  assert.ok(Math.abs(await left()-before)<1,'undo restores badge position');
  const shot=await browser.send('Page.captureScreenshot',{format:'png'});
  await writeFile('artifacts/selection-name.png',Buffer.from(shot.data,'base64'));
  await browser.evaluate("document.querySelector('#clear-selection').click();document.querySelector('#select-all').click()");
  assert.equal(await browser.evaluate('document.querySelector("#slide-0 .selection-name-label").hidden'),true,'clearing hides badge');
}
