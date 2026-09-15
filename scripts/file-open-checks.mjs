import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

/** Verify the source chooser routes an explicit choice and leaves the OS dialog closed until then. */
export async function checkFileOpen(browser,origin){
  browser.errors=[];await browser.navigate(origin);
  await browser.until('!!document.querySelector("#open")&&!document.querySelector("#open").disabled','file open ready');
  await browser.evaluate('window.localOpenCount=0;document.querySelector("#file").click=()=>localOpenCount++');
  const click=selector=>browser.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  assert.equal(await browser.evaluate('document.querySelector("#drive-open")'),null,'header has one file-opening entry point');
  await click('#open');
  assert.equal(await browser.evaluate('document.querySelector("#file-open-dialog").open'),true);
  assert.equal(await browser.evaluate('localOpenCount'),0,'opening the chooser never opens the OS dialog');
  assert.equal(await browser.evaluate('document.querySelectorAll(".file-open-option svg").length'),2,'both sources have icons');
  await click('#file-open-close');
  await browser.until('document.activeElement.id==="open"','close restores focus');
  assert.equal(await browser.evaluate('localOpenCount'),0,'cancel opens neither source');
  await click('#open');await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await browser.until('!document.querySelector("#file-open-dialog").open','Escape closes chooser');
  await click('#open');await click('#file-open-local');
  assert.equal(await browser.evaluate('localOpenCount'),1,'folder explicitly opens the existing file input');
  assert.equal(await browser.evaluate('document.querySelector("#file-open-dialog").open'),false);
  if(origin.includes(':5179')){
    await browser.evaluate(`(async()=>{const {GoogleSettingsRepository}=await import('/src/services/google/GoogleSettingsRepository.js');await new GoogleSettingsRepository().clear();})()`);
    await click('#open');await click('#file-open-drive');
    await browser.until('document.querySelector("#drive-dialog").open&&!!document.querySelector("#drive-settings")','Drive choice opens user configuration');
    assert.equal(await browser.evaluate('document.querySelector("#file-open-dialog").open'),false,'chooser closes before the Drive dialog');
    assert.equal(await browser.evaluate('localOpenCount'),1,'Drive choice never opens the local file input');
    await browser.evaluate('document.querySelector("#drive-dialog").close()');
  }
  await click('#open');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:false});
  assert.equal(await browser.evaluate('(()=>{const r=document.querySelector("#file-open-dialog").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})()'),true,'chooser fits narrow screens');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  const screenshot=await browser.send('Page.captureScreenshot',{format:'png'});
  await writeFile(new URL('../artifacts/file-open-chooser.png',import.meta.url),Buffer.from(screenshot.data,'base64'));
  await click('#file-open-close');
  await click('#language-en');await click('#open');
  assert.equal(await browser.evaluate('document.querySelector("#file-open-title").textContent'),'Choose where to open a file');
  await click('#file-open-close');await click('#language-ko');
  assert.deepEqual(browser.errors,[],'chooser has no browser errors');
  console.log('PASS file source chooser: explicit local/Drive choice, cancellation, keyboard, focus, responsive bounds and localization');
}
