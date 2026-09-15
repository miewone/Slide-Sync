import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {nativeSlidesFixture} from '../tests/native-slides-fixture.js';

/** Exercise the actual Drive UI and REST adapter with deterministic Google responses, without an account. */
export async function checkGoogleDrive(browser,origin){
  browser.errors=[];
  // Run the native browser transport before installing Google mocks. Mock functions
  // do not enforce Window.fetch's receiver rules and previously hid Illegal invocation.
  await browser.navigate(origin);
  await browser.until('!!document.querySelector("#open")&&!document.querySelector("#open").disabled','native fetch check ready');
  assert.equal(await browser.evaluate(`(async()=>{
    const {GoogleFiles}=await import('/src/services/google/GoogleFiles.js');
    const client=new GoogleFiles({token:()=> 'browser-test-token'});
    const response=await client.request('/sample.pptx');
    return response.ok&&(await response.arrayBuffer()).byteLength>0;
  })()`),true,'real Window.fetch works through the Drive adapter');
  const injection=await browser.send('Page.addScriptToEvaluateOnNewDocument',{source:`
    localStorage.setItem('slide-sync-language','ko');
    window.driveCalls=[];window.drivePick={id:'presentation_1'};
    window.driveDocuments={presentation_1:${JSON.stringify(nativeSlidesFixture())}};
    window.driveCopyCount=0;
    const originalFetch=window.fetch;
    window.fetch=async function(url,options={}){
      url=String(url);
      if(!url.startsWith('https://www.googleapis.com/')&&!url.startsWith('https://slides.googleapis.com/'))return originalFetch.call(this,url,options);
      window.driveCalls.push({url,method:options.method||'GET',body:typeof options.body==='string'?JSON.parse(options.body):null});
      const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers});
      const pptx='application/vnd.openxmlformats-officedocument.presentationml.presentation';
      const meta=id=>({id,name:id==='pptx_1'?'Drive sample.pptx':window.driveDocuments[id]?.title||'Copy',version:'1',mimeType:id==='pptx_1'?pptx:'application/vnd.google-apps.presentation',capabilities:{canEdit:true,canCopy:true}});
      if(url.includes('/thumbnail?'))return json({},503);
      if(url.includes('uploadType=resumable'))return new Response(null,{headers:{Location:'https://www.googleapis.com/upload/mock-session'}});
      if(url.endsWith('/upload/mock-session')){window.driveSavedBytes=await options.body.arrayBuffer();return json(meta('pptx_1'));}
      if(url.includes('alt=media'))return new Response(window.drivePptxBytes);
      if(url.includes('/copy?')){
        const sourceId=url.split('/files/')[1].split('/')[0],copyId='copy_'+(++window.driveCopyCount),body=JSON.parse(options.body);
        window.driveDocuments[copyId]={...structuredClone(window.driveDocuments[sourceId]),presentationId:copyId,title:body.name,revisionId:'copy-revision'};
        return json(meta(copyId));
      }
      if(url.includes(':batchUpdate')){
        const id=url.split('/presentations/')[1].split(':')[0],doc=window.driveDocuments[id],body=JSON.parse(options.body);
        if(body.writeControl.requiredRevisionId!==doc.revisionId)return json({},400);
        for(const request of body.requests){
          for(const slide of doc.slides){
            if(request.deleteObject)slide.pageElements=slide.pageElements.filter(e=>e.objectId!==request.deleteObject.objectId);
            else for(const element of slide.pageElements){const r=request.updatePageElementTransform;if(element.objectId===r.objectId){element.transform.translateX=(element.transform.translateX||0)+r.transform.translateX;element.transform.translateY=(element.transform.translateY||0)+r.transform.translateY;}}
          }
        }
        doc.revisionId+='-saved';return json({writeControl:{requiredRevisionId:doc.revisionId}});
      }
      if(url.includes('/presentations/'))return json(window.driveDocuments[url.split('/presentations/')[1]]);
      if(url.includes('/files/'))return json(meta(url.split('/files/')[1].split('?')[0]),200,{'ETag':'"v1"'});
      throw new Error('Unexpected Google mock request: '+url);
    };
  `});
  const click=selector=>browser.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const openDrive=async()=>{await click('#open');await click('#file-open-drive-settings');};
  const ready=()=>browser.until('!!document.querySelector("#open")&&!document.querySelector("#open").disabled','Drive ready');
  const prepareMocks=()=>browser.evaluate(`(async()=>{
      const {GoogleSettingsRepository}=await import('/src/services/google/GoogleSettingsRepository.js');
      await new GoogleSettingsRepository().save({clientId:'123-test.apps.googleusercontent.com',apiKey:'AIza'+'x'.repeat(30),appId:'123'});
      const {GoogleSession}=await import('/src/services/google/GoogleSession.js');
      Object.defineProperty(GoogleSession.prototype,'configured',{get(){return true;}});
      GoogleSession.prototype.prepare=async function(){
        window.google={accounts:{oauth2:{hasGrantedAllScopes:()=>true}}};
        this.client={requestAccessToken:()=>this.client.callback({access_token:'test-token',expires_in:3600})};
      };
      GoogleSession.prototype.pick=async()=>window.drivePick;
      window.drivePptxBytes=await (await fetch('/sample.pptx')).arrayBuffer();
    })()`);
  try{
    await browser.navigate(origin);await ready();
    // External library protocol is mocked, while consent lifetime, routing and REST requests run normally.
    await prepareMocks();
    await openDrive();await browser.until('!document.querySelector("#drive-connect").disabled','consent ready');
    await click('#drive-connect');await browser.until('!document.querySelector("#drive-select").disabled','connected');
    await browser.navigate(origin);await ready();await prepareMocks();await click('#open');await click('#file-open-drive');await browser.until('!!document.querySelector("#native-slides-title")','native document opens');
    assert.equal(await browser.evaluate('document.querySelector("#app").inert'),true,'underlying PPTX UI is inert');
    await click('#native-select-matches');
    await browser.evaluate(`document.querySelectorAll('.native-page-row input')[1].click();document.querySelector('#native-x').value='2.54';document.querySelector('#native-x').dispatchEvent(new Event('input',{bubbles:true}));`);
    // React-controlled numeric inputs use the native setter to simulate actual user editing.
    await browser.evaluate(`(()=>{const e=document.querySelector('#native-x');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'1');e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await click('#native-move');
    assert.match(await browser.evaluate('document.querySelector(".native-slides-editor [role=status]").textContent'),/4개 객체/);
    await click('#native-undo');assert.match(await browser.evaluate('document.querySelector(".native-slides-editor [role=status]").textContent'),/0개 객체/);
    await click('#native-redo');await click('#native-delete');await click('#native-undo');
    assert.equal(await browser.evaluate('getComputedStyle(document.querySelector(".native-preview")).display'),'block','native preview does not inherit the PPTX main grid');
    const screenshot=await browser.send('Page.captureScreenshot',{format:'png'});
    await writeFile(new URL('../artifacts/google-slides-native.png',import.meta.url),Buffer.from(screenshot.data,'base64'));
    await click('#native-save');
    const saveScreenshot=await browser.send('Page.captureScreenshot',{format:'png'});
    await writeFile(new URL('../artifacts/google-drive-save.png',import.meta.url),Buffer.from(saveScreenshot.data,'base64'));
    assert.equal(await browser.evaluate('document.querySelector("input[name=drive-mode]:checked").value'),'copy','safe explicit destination default');
    await click('#drive-save-cancel');assert.equal(await browser.evaluate('driveCalls.some(c=>c.method==="POST")'),false,'cancel writes nothing');
    await click('#native-save');await click('input[value=original]');await click('#drive-save-confirm');
    await browser.until('!document.querySelector("#drive-save-dialog")','native original saved');
    assert.deepEqual(await browser.evaluate('driveCalls.find(c=>c.url.includes(":batchUpdate")).body.requests.map(r=>r.updatePageElementTransform.objectId)'),['shape_1','shape_2','shape_3','group_1']);
    assert.equal(await browser.evaluate('driveDocuments.presentation_1.slides[1].pageElements[0].transform.translateX'),25,'unchecked slide is preserved');
    assert.equal(await browser.evaluate('document.querySelector("#native-undo").disabled'),true,'save starts new undo history');
    await click('[data-native-element=shape_1]');await click('#native-delete');await click('#native-save');await click('#drive-save-confirm');
    await browser.until('!document.querySelector("#drive-save-dialog")','native copy saved');
    assert.equal(await browser.evaluate('driveDocuments.presentation_1.slides[0].pageElements.some(e=>e.objectId==="shape_1")'),true,'source survives copy deletion');
    assert.equal(await browser.evaluate('driveDocuments.copy_1.slides[0].pageElements.some(e=>e.objectId==="shape_1")'),false,'copy receives deletion');
    // Concurrent Google edits reject a subsequent overwrite and retain the draft.
    await click('[data-native-element=shape_2]');await click('#native-move');
    await browser.evaluate('driveDocuments.copy_1.revisionId="remote-change"');
    await click('#native-save');await click('input[value=original]');await click('#drive-save-confirm');
    await browser.until('document.querySelector("#drive-save-dialog [role=alert]")?.textContent.includes("변경되었습니다")','conflict is visible');
    await click('#drive-save-cancel');await click('#native-undo');await click('#native-close');
    assert.equal(await browser.evaluate('document.querySelector("#app").inert'),false);
    // Drive PPTX goes through the established local parser and original-preserving exporter.
    await browser.evaluate('drivePick={id:"pptx_1"}');await openDrive();await browser.until('!document.querySelector("#drive-select").disabled','Drive menu');await click('#drive-select');
    await browser.until('!document.querySelector("#download").disabled&&document.querySelector("#filename").textContent==="Drive sample.pptx"','Drive PPTX opens');
    await openDrive();await browser.until('!document.querySelector("#drive-save-local").disabled','PPTX save ready');await click('#drive-save-local');await click('input[value=original]');await click('#drive-save-confirm');
    await browser.until('!!window.driveSavedBytes&&!document.querySelector("#drive-save-dialog")','PPTX saved');
    assert.equal(await browser.evaluate(`(async()=>{const {previewResources}=await import('/src/services/PreviewResources.js');const zip=await previewResources.loadZip(),original=await zip.loadAsync(drivePptxBytes),saved=await zip.loadAsync(driveSavedBytes);return await original.file('ppt/slides/slide1.xml').async('string')===await saved.file('ppt/slides/slide1.xml').async('string');})()`),true,'unchanged slide XML survives Drive export');
    await browser.evaluate('document.querySelector("#drive-dialog").close()');
    await click('#demo');await browser.until('!document.querySelector("#download").disabled&&document.querySelector("#filename").textContent!=="Drive sample.pptx"','local sample replaces Drive source');
    await openDrive();await browser.until('!document.querySelector("#drive-save-local").disabled','local save menu');await click('#drive-save-local');
    assert.equal(await browser.evaluate('document.querySelector("input[value=original]").disabled'),true,'local open clears Drive original association');
    await click('#drive-save-cancel');
    await click('#drive-disconnect');
    await browser.navigate(origin);await ready();await prepareMocks();await openDrive();
    await browser.until('!document.querySelector("#drive-connect").disabled','disconnected session ready');
    assert.equal(await browser.evaluate('document.querySelector("#drive-select").disabled'),true,'disconnect remains effective after reload');
    assert.deepEqual(browser.errors,[],'Drive workflows do not throw browser errors');
    console.log('PASS Google Drive: native original/copy, checked scope, move/delete/undo, conflict retention, PPTX roundtrip and source reset');
  }finally{await browser.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:injection.identifier});}
}
