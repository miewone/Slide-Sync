import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

/** Verify local download and explicit Drive saving share the edited-PPTX entry point. */
export async function checkDownloadOptions(browser,origin){
  browser.errors=[];await browser.navigate(origin);
  const click=selector=>browser.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const ready=()=>browser.until('!!document.querySelector("#demo")&&!document.querySelector("#demo").disabled','download editor ready');
  await ready();
  await browser.evaluate(`(async()=>{
    const {GoogleSettingsRepository}=await import('/src/services/google/GoogleSettingsRepository.js');await new GoogleSettingsRepository().clear();
    const {GoogleSession}=await import('/src/services/google/GoogleSession.js');
    const {GoogleFiles}=await import('/src/services/google/GoogleFiles.js');
    window.prepareCount=0;window.authorizeCount=0;window.pickerCount=0;window.savedDrive=[];
    GoogleSession.prototype.prepare=async function(){
      prepareCount++;window.google={accounts:{oauth2:{hasGrantedAllScopes:()=>true}}};
      this.client={requestAccessToken:()=>{authorizeCount++;this.client.callback({access_token:'download-options-token',expires_in:3600});}};
    };
    GoogleSession.prototype.pick=async()=>{pickerCount++;return {id:'original-pptx'};};
    window.downloadSource={id:'original-pptx',name:'Drive original.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',version:'1',capabilities:{canEdit:true,canCopy:true}};
    GoogleFiles.prototype.metadata=async()=>downloadSource;
    GoogleFiles.prototype.openPptx=async()=>({source:downloadSource,buffer:await (await fetch('/sample.pptx')).arrayBuffer()});
    GoogleFiles.prototype.savePptx=async function(blob,options){savedDrive.push({mode:options.mode,source:options.source?.id,size:blob.size});return {...downloadSource,id:options.mode==='original'?downloadSource.id:'saved-copy',name:options.name};};
    window.downloadCount=0;
    const createURL=URL.createObjectURL;URL.createObjectURL=function(blob){if(blob.type==='application/vnd.openxmlformats-officedocument.presentationml.presentation')downloadCount++;return createURL.call(this,blob);};
    const anchorClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download){window.downloadName=this.download;window.downloadClicked=(window.downloadClicked||0)+1;}else anchorClick.call(this);};
  })()`);
  await click('#demo');await browser.until('!document.querySelector("#download").disabled','sample ready');
  await click('#download');await browser.until('window.downloadClicked===1','without settings downloads directly');
  assert.equal(await browser.evaluate('!!document.querySelector("#download-options-dialog")'),false);
  await browser.evaluate(`(async()=>{const {GoogleSettingsRepository}=await import('/src/services/google/GoogleSettingsRepository.js');await new GoogleSettingsRepository().save({clientId:'123-download.apps.googleusercontent.com',apiKey:'AIza'+'x'.repeat(30),appId:'123'});})()`);
  const choose=async()=>{await browser.until('!document.querySelector("#download").disabled','download choice ready');await click('#download');await browser.until('document.querySelector("#download-options-dialog")?.open','download choices shown');};
  await choose();
  assert.equal(await browser.evaluate('prepareCount'),0,'offering Drive does not load Google libraries');
  await click('#download-local');await browser.until('window.downloadClicked===2','configured user can still download locally');
  assert.equal(await browser.evaluate('prepareCount'),0,'local download never connects Google');
  await choose();await click('#download-drive');
  await browser.until('document.querySelector("#drive-dialog").open&&!document.querySelector("#drive-connect").disabled','Drive save requests consent');
  assert.equal(await browser.evaluate('savedDrive.length'),0,'choosing Drive does not save before confirmation');
  await click('#drive-connect');
  await browser.until('!!document.querySelector("#drive-save-dialog")','connection continues to save dialog');
  assert.equal(await browser.evaluate('pickerCount'),0,'saving does not open a file picker');
  assert.equal(await browser.evaluate('document.querySelector("input[value=original]").disabled'),true,'local source can only save a new Drive file');
  await click('#drive-save-cancel');
  await browser.until('document.querySelector("#download-options-dialog")?.open&&!document.querySelector("#drive-dialog").open','save cancellation returns to download options');
  await click('#download-drive');await browser.until('!!document.querySelector("#drive-save-dialog")','valid session opens save directly');
  await click('#drive-save-confirm');await browser.until('document.querySelector("#download-options-dialog [role=status]")?.textContent.includes("저장")','save result appears at download entry');
  assert.equal(await browser.evaluate('savedDrive[0].mode'),'copy');
  await click('#download-options-close');
  await click('#open');await click('#file-open-drive');
  await browser.until('!document.querySelector("#download").disabled&&document.querySelector("#filename").textContent==="Drive original.pptx"','Drive PPTX opens');
  // Change an object using the existing edit commands before saving.
  await browser.until('!!document.querySelector(".slide-surface")','Drive preview');
  await browser.evaluate('document.querySelector(".slide-surface").dispatchEvent(new KeyboardEvent("keydown",{key:"a",ctrlKey:true,bubbles:true}));document.querySelector("#x").value="1";document.querySelector("#move").click();');
  await browser.until('!document.querySelector("#undo").disabled','PPTX edited');
  await choose();await click('#download-drive');await browser.until('!!document.querySelector("#drive-save-dialog")','edited Drive file save dialog');
  assert.equal(await browser.evaluate('document.querySelector("input[value=original]").disabled'),false,'original destination is preserved');
  assert.equal(await browser.evaluate('document.querySelector("input[value=copy]").checked'),true,'overwrite is never preselected');
  await click('input[value=original]');await click('#drive-save-confirm');
  await browser.until('savedDrive.length===2&&document.querySelector("#download-options-dialog")?.open','edited original saved');
  assert.deepEqual(await browser.evaluate('({mode:savedDrive[1].mode,source:savedDrive[1].source,nonempty:savedDrive[1].size>0})'),{mode:'original',source:'original-pptx',nonempty:true});
  await browser.send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:false});
  assert.equal(await browser.evaluate('(()=>{const el=document.querySelector("#download-options-dialog");return el.scrollWidth<=el.clientWidth;})()'),true,'download choice fits mobile');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  const screenshot=await browser.send('Page.captureScreenshot',{format:'png'});
  await writeFile(new URL('../artifacts/download-options.png',import.meta.url),Buffer.from(screenshot.data,'base64'));
  await click('#download-options-close');
  await browser.evaluate(`(async()=>{const {GoogleSettingsRepository}=await import('/src/services/google/GoogleSettingsRepository.js');await new GoogleSettingsRepository().clear();})()`);
  await click('#download');await browser.until('window.downloadClicked===3','deleted settings restore direct download');
  assert.deepEqual(browser.errors,[]);
  console.log('PASS download choices: direct/local download, no premature Google request, consent continuation, copy/original, cancellation and mobile');
}
