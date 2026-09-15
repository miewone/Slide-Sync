import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

/** Verify Drive history using the loaded fixtures and transport mocks from checkDriveLoading. */
export async function checkRecentDrive(browser,origin){
  const click=selector=>browser.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const row=id=>`[...document.querySelectorAll('[data-recent-id]')].find(row=>row.dataset.recentId===${JSON.stringify(JSON.stringify(['google-drive',id]))})`;
  const show=async()=>{
    await browser.until('!document.querySelector("#recent-files-open").disabled','recent Drive menu ready');
    await click('#recent-files-open');
    await browser.until('document.querySelector("#recent-files-dialog").open&&document.querySelectorAll(".recent-file-select").length===2&&![...document.querySelectorAll(".recent-file-select")].some(button=>button.disabled)','Drive history saved');
  };
  await show();
  assert.equal(await browser.evaluate('document.querySelector("#recent-files-title").textContent'),'최근 사용한 파일');
  assert.equal(await browser.evaluate(`!!${row('presentation_1')}.querySelector('.recent-file-offline')`),false,'native Slides remembers only a Drive reference');
  assert.equal(await browser.evaluate(`!!${row('pptx_1')}.querySelector('.recent-file-offline')`),true,'Drive PPTX offers a saved copy');
  const contents=await browser.evaluate(`(async()=>{const {RecentFilesRepository}=await import('/src/services/RecentFilesRepository.js');const repo=new RecentFilesRepository();const slides=await repo.get(JSON.stringify(['google-drive','presentation_1']));const pptx=await repo.get(JSON.stringify(['google-drive','pptx_1']));return {slidesBytes:!!slides.buffer,pptxBytes:pptx.buffer.byteLength};})()`);
  assert.equal(contents.slidesBytes,false);assert.ok(contents.pptxBytes>0);
  await browser.evaluate(`loadingFailure=false;loadingSource={id:'presentation_1',name:'Latest slides',mimeType:'application/vnd.google-apps.presentation',capabilities:{canEdit:true,canCopy:true}};`);
  await browser.evaluate(`(async()=>{const {GoogleSession}=await import('/src/services/google/GoogleSession.js');GoogleSession.prototype.pick=async()=>{throw Error('Recent Drive must bypass picker');};})()`);
  await browser.evaluate(`${row('presentation_1')}.querySelector('.recent-file-select').click()`);
  await browser.until('!!document.querySelector("#native-slides-title")','native recent entry opens directly');
  await click('#native-close');await show();
  await browser.evaluate(`loadingSource={id:'pptx_1',name:'Latest.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',capabilities:{canEdit:true,canCopy:true}};`);
  await browser.evaluate(`${row('pptx_1')}.querySelector('.recent-file-select').click()`);
  await browser.until('!document.querySelector("#download").disabled&&document.querySelector("#filename").textContent==="Latest.pptx"','Drive recent entry uses latest metadata');
  await show();
  assert.equal(await browser.evaluate('document.querySelectorAll(".recent-file-select").length'),2,'same Drive IDs update without duplicates');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:false});
  assert.equal(await browser.evaluate('(()=>{const box=document.querySelector("#recent-files-dialog");return box.scrollWidth<=box.clientWidth;})()'),true,'both recent choices fit mobile');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  const screenshot=await browser.send('Page.captureScreenshot',{format:'png'});
  await writeFile(new URL('../artifacts/recent-drive.png',import.meta.url),Buffer.from(screenshot.data,'base64'));
  await browser.navigate(origin);await show();
  // No Google mocks after reload: reject Google requests so a saved copy must work locally.
  await browser.evaluate(`const originalFetch=window.fetch;window.recentGoogleCalls=0;window.fetch=(url,...args)=>{if(/googleapis|accounts.google/.test(String(url))){recentGoogleCalls++;return Promise.reject(Error('offline'));}return originalFetch(url,...args);};`);
  await browser.evaluate(`${row('pptx_1')}.querySelector('.recent-file-offline').click()`);
  await browser.until('!document.querySelector("#recent-files-dialog").open&&!document.querySelector("#download").disabled&&document.querySelector("#filename").textContent==="Latest.pptx"','saved copy reopens after reload without Google');
  assert.equal(await browser.evaluate('recentGoogleCalls'),0);
  await show();await browser.evaluate(`${row('presentation_1')}.querySelector('.recent-file-delete').click()`);
  await browser.until('document.querySelectorAll(".recent-file-select").length===1','Drive reference removed');
  await click('#recent-files-clear');await browser.until('!document.querySelector(".recent-file-select")','Drive history cleared');
  const empty=await browser.evaluate(`(async()=>{const {RecentFilesRepository}=await import('/src/services/RecentFilesRepository.js');const repo=new RecentFilesRepository();return (await repo.list()).length===0&&await repo.get(JSON.stringify(['google-drive','pptx_1']))===null;})()`);
  assert.equal(empty,true,'deletion removes saved copy and metadata');
  assert.equal(await browser.evaluate('recentGoogleCalls'),0,'history deletion never calls Google');
  await click('#recent-files-close');
  console.log('PASS recent Drive: PPTX+Slides, latest direct open, saved copy after reload, deduplication, mobile and local-only deletion');
}
