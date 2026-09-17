import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

/** Verify the context dialog on the deterministic range fixture. @param {object} browser DevTools client. @param {number} count Fixture pages. */
export async function checkSimilarSelection(browser,count){
  const open=async()=>{
    await browser.evaluate(`(()=>{const surface=document.querySelector('#slide-0 .slide-surface'),r=surface.getBoundingClientRect();surface.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.left+150/960*r.width,clientY:r.top+130/540*r.height}));})()`);
    await browser.until('!!document.querySelector(".similar-selection-menu")','similar menu opens');
  };
  const selected=()=>browser.evaluate('Number(document.querySelector(".selection-number").textContent)');
  await open();
  const screenshot=await browser.send('Page.captureScreenshot',{format:'png'});
  await writeFile('artifacts/similar-selection-menu.png',Buffer.from(screenshot.data,'base64'));
  await browser.evaluate('document.querySelector(".similar-selection-menu button").click()');
  await browser.until('!document.querySelector(".similar-selection-menu")','menu closes on apply');
  assert.equal(await selected(),3,'matches three shapes at different positions on current page');
  await open();
  await browser.evaluate(`(()=>{const select=document.querySelector('.similar-selection-menu select');select.value='all';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await browser.evaluate('document.querySelector(".similar-selection-menu button").click()');
  await browser.until(`Number(document.querySelector('.selection-number').textContent)===${count*3}`,'all slides matched, including unchecked and unmounted');
  assert.equal(await browser.evaluate('document.querySelector("#undo").disabled'),true,'selection does not create undo entries');
  await open();
  await browser.evaluate('document.querySelector(".similar-selection-menu input[name=layout]").click()');
  assert.equal(await browser.evaluate('document.querySelector(".similar-selection-menu button").disabled'),true,'at least one criterion is required');
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
  await browser.until('!document.querySelector(".similar-selection-menu")','Escape closes menu');
  await browser.evaluate('document.querySelector("#clear-selection").click()');
}

/** Verify native selection and scope without editing the connected document. @param {object} browser DevTools client. */
export async function checkNativeSimilarSelection(browser){
  const open=async()=>{
    await browser.evaluate(`(()=>{const target=document.querySelector('[data-object-id="shape_1"]>rect'),r=target.getBoundingClientRect();target.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.left+5,clientY:r.top+5}));})()`);
    await browser.until('!!document.querySelector(".similar-selection-menu")','native similar menu');
    await browser.evaluate(`(()=>{const input=document.querySelector('.similar-selection-menu input[name=layout]');if(!input.checked)input.click();})()`);
  };
  await open();await browser.evaluate('document.querySelector(".similar-selection-menu button").click()');
  await browser.until('Number(document.querySelector("#native-selection-summary .selection-number, .native-selection-summary>strong").textContent)===3','native page selection');
  await open();await browser.evaluate(`(()=>{const select=document.querySelector('.similar-selection-menu select');select.value='all';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await browser.evaluate('document.querySelector(".similar-selection-menu button").click()');
  await browser.until('Number(document.querySelector("#native-selection-summary .selection-number, .native-selection-summary>strong").textContent)===4','native all-slide selection');
  assert.equal(await browser.evaluate('document.querySelector("#native-undo").disabled'),true);
  await browser.evaluate('document.querySelector("#native-clear-selection").click()');
}
