import assert from 'node:assert/strict';

/** @param {object} browser DevTools client. @param {string} origin Development app URL for deterministic storage gates. */
export async function checkBackgroundPersistence(browser,origin) {
  browser.errors=[];
  await browser.navigate(origin);
  await browser.until('!!document.querySelector("#demo")&&!document.querySelector("#demo").disabled','background app ready');
  await browser.evaluate(`(async()=>{
    const {RecentFilesRepository}=await import('/src/services/RecentFilesRepository.js');
    const {previewResources}=await import('/src/services/PreviewResources.js');
    await new RecentFilesRepository().clear();
    globalThis.storageEvents=[];globalThis.renderCalls=0;
    const loadRenderer=previewResources.loadRenderer.bind(previewResources);
    previewResources.loadRenderer=async options=>{const module=await loadRenderer(options);return {init(...args){
      const renderer=module.init(...args),load=renderer.load.bind(renderer);
      renderer.load=async(...input)=>{const value=await load(...input),render=renderer.htmlRender.renderSlide;
        renderer.htmlRender.renderSlide=function(...args){renderCalls++;return render.apply(this,args);};return value;};return renderer;}};};
    const savePreviews=RecentFilesRepository.prototype.savePreviews,save=RecentFilesRepository.prototype.save;
    globalThis.cacheGate=new Promise(resolve=>{globalThis.releaseCache=resolve;});
    RecentFilesRepository.prototype.savePreviews=async function(entries){
      storageEvents.push('cache-start');await cacheGate;
      const result=await savePreviews.call(this,entries);storageEvents.push('cache-end');return result;
    };
    RecentFilesRepository.prototype.save=async function(name,buffer){
      storageEvents.push('file:'+name);
      if(globalThis.fileGate)await fileGate;
      if(name===globalThis.failFile)throw new DOMException('test quota','QuotaExceededError');
      return save.call(this,name,buffer);
    };
    globalThis.sampleBytes=await(await fetch(new URL('sample.pptx',document.baseURI))).arrayBuffer();
    const createURL=URL.createObjectURL;
    URL.createObjectURL=function(blob){if(blob.type==='application/zip')globalThis.savedPptx=blob;return createURL.call(this,blob);};
    const click=HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click=function(){if(!this.download)return click.call(this);};
  })()`);
  const upload=async(name,bytes='sampleBytes')=>{
    await browser.evaluate(`(()=>{const transfer=new DataTransfer();transfer.items.add(new File([${bytes}],${JSON.stringify(name)}));
      const input=document.querySelector('#file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await browser.until(`!document.querySelector('#download').disabled&&document.querySelector('#filename').textContent===${JSON.stringify(name)}`,'editing ready without persistence');
    await browser.until('!!document.querySelector("#slide-0 iframe")?.contentDocument?.querySelector("[data-pptx-mover]")','preview ready');
  };
  const settled=()=>browser.until('document.querySelector("#background-save-status").hidden','background storage settled');
  const move=()=>browser.evaluate(`document.querySelector('#move-mode').value='relative';document.querySelector('#move-mode').dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelector('#x').value='1';document.querySelector('#y').value='0';document.querySelector('#move').click();`);

  await upload('background-a.pptx');
  await browser.until('storageEvents.includes("cache-start")','cache save paused');
  await browser.until('!!document.querySelector("#slide-1 iframe")?.contentDocument?.querySelector("[data-pptx-mover]")','unchecked preview ready');
  assert.equal(await browser.evaluate('document.querySelector("#background-save-status").hidden'),false);
  assert.equal(await browser.evaluate('storageEvents.some(event=>event.startsWith("file:"))'),false,'original save stays ordered behind earlier cache save');
  await browser.evaluate(`globalThis.frameBefore=document.querySelector('#slide-0 iframe');
    globalThis.transformBefore=frameBefore.contentDocument.querySelector('[data-pptx-mover]').style.transform;
    globalThis.uncheckedBefore=document.querySelector('#slide-1 iframe').contentDocument.querySelector('[data-pptx-mover]').style.transform;
    document.querySelector('#range').value='1';document.querySelector('#apply-range').click();
    document.querySelector('#slide-0 .slide-surface').dispatchEvent(new KeyboardEvent('keydown',{key:'a',ctrlKey:true,bubbles:true}));`);
  await move();
  assert.equal(await browser.evaluate('frameBefore.contentDocument.querySelector("[data-pptx-mover]").style.transform!==transformBefore'),true,'editing works during cache save');
  assert.equal(await browser.evaluate('document.querySelector("#slide-1 iframe").contentDocument.querySelector("[data-pptx-mover]").style.transform===uncheckedBefore'),true,'unchecked slide preserved');
  await browser.evaluate('document.querySelector("#undo").click()');
  assert.equal(await browser.evaluate('frameBefore.contentDocument.querySelector("[data-pptx-mover]").style.transform===transformBefore'),true,'undo works during save');
  await move();
  await browser.evaluate(`globalThis.exportTransform=frameBefore.contentDocument.querySelector('[data-pptx-mover]').style.transform;document.querySelector('#download').click();`);
  await browser.until('!!globalThis.savedPptx&&!document.querySelector("#download").disabled','download completes with cache still paused');
  await move();
  assert.equal(await browser.evaluate('document.querySelector("#slide-0 iframe")===frameBefore'),true,'background persistence never replaces frames');
  assert.equal(await browser.evaluate('frameBefore.contentDocument.querySelector("[data-pptx-mover]").style.transform!==exportTransform'),true,'later edits differ from the export snapshot');
  await upload('background-b.pptx');
  await browser.evaluate('releaseCache()');await settled();
  const events=await browser.evaluate('storageEvents');
  assert.ok(events.indexOf('file:background-a.pptx')>events.indexOf('cache-end'));
  assert.ok(events.indexOf('file:background-b.pptx')>events.indexOf('file:background-a.pptx'));
  let calls=await browser.evaluate('renderCalls');
  await upload('background-original.pptx');await settled();
  assert.equal(await browser.evaluate('renderCalls'),calls,'unmodified import retains original cache despite intervening edits');
  assert.equal(await browser.evaluate('document.querySelector("#slide-0 iframe").contentDocument.querySelector("[data-pptx-mover]").style.transform===transformBefore'),true);
  await browser.evaluate('(async()=>{globalThis.exportBytes=await savedPptx.arrayBuffer();})()');
  await upload('background-export.pptx','exportBytes');await settled();
  assert.equal(await browser.evaluate('renderCalls'),calls,'export snapshot keys still match after subsequent edits and file replacement');
  assert.equal(await browser.evaluate('document.querySelector("#slide-0 iframe").contentDocument.querySelector("[data-pptx-mover]").style.transform===exportTransform'),true,'export cache contains exported coordinates');

  // A slow original-file save must not lock the editor or report errors on a replacement deck.
  await browser.evaluate(`globalThis.fileGate=new Promise(resolve=>{globalThis.releaseFile=resolve;});globalThis.failFile='background-fail.pptx';`);
  await upload('background-fail.pptx');
  await browser.until('storageEvents.includes("file:background-fail.pptx")','original save paused');
  await upload('background-current.pptx');
  await browser.evaluate(`globalThis.currentNotice=document.querySelector('#notice').textContent;releaseFile();`);await settled();
  assert.equal(await browser.evaluate('document.querySelector("#notice").textContent===currentNotice'),true,'old save error cannot overwrite the current deck notice');
  assert.equal(await browser.evaluate('document.querySelector("#filename").textContent'),'background-current.pptx');
  const stored=await browser.evaluate(`(async()=>{const {RecentFilesRepository}=await import('/src/services/RecentFilesRepository.js');return (await new RecentFilesRepository().list()).map(file=>file.name);})()`);
  assert.equal(stored.includes('background-fail.pptx'),false);assert.equal(stored.includes('background-current.pptx'),true,'failed task does not poison queued saves');

  // Clear after queued saves commits both original-file and preview deletion.
  await browser.evaluate('document.querySelector("#recent-files-open").click()');
  await browser.until('!document.querySelector("#recent-files-clear").disabled','recent list settled');
  await browser.evaluate('document.querySelector("#recent-files-clear").click()');
  await browser.until('!document.querySelector(".recent-files-list li")','recent files cleared');
  const remaining=await browser.evaluate(`(async()=>{const {RecentFilesRepository}=await import('/src/services/RecentFilesRepository.js');return new RecentFilesRepository().transaction(['previews','contents'],'readonly',tx=>{
    const previews=tx.objectStore('previews').count(),contents=tx.objectStore('contents').count();return ()=>[previews.result,contents.result];});})()`);
  assert.deepEqual(remaining,[0,0]);
  assert.deepEqual(browser.errors,[],'background persistence has no unhandled errors');

  // An unmounted editor may finish an active transaction, but must not launch queued saves or update its replacement.
  await browser.navigate(`${origin}/tests/editor-lifecycle.html`);
  await browser.until('!!document.querySelector("#demo")&&!document.querySelector("#demo").disabled','background lifecycle ready');
  await browser.evaluate(`(async()=>{
    const {RecentFilesRepository}=await import('/src/services/RecentFilesRepository.js');
    await new RecentFilesRepository().clear();
    globalThis.sampleBytes=await(await fetch('/sample.pptx')).arrayBuffer();
    globalThis.oldSaveCalls=0;globalThis.oldCacheStarted=false;globalThis.oldCacheDone=false;
    const gate=new Promise(resolve=>{globalThis.releaseOldCache=resolve;});
    const save=RecentFilesRepository.prototype.save,cache=RecentFilesRepository.prototype.savePreviews;
    RecentFilesRepository.prototype.save=function(...args){oldSaveCalls++;return save.apply(this,args);};
    RecentFilesRepository.prototype.savePreviews=async function(...args){oldCacheStarted=true;await gate;
      try{return await cache.apply(this,args);}finally{oldCacheDone=true;}};
  })()`);
  await upload('disposed-background.pptx');
  await browser.until('oldCacheStarted','old cache task started');
  await browser.evaluate('unmountEditor();mountEditor();releaseOldCache();');
  await browser.until('oldCacheDone&&!!document.querySelector("#demo")&&!document.querySelector("#demo").disabled','replacement ready');
  await browser.evaluate('new Promise(resolve=>setTimeout(resolve,30))');
  assert.equal(await browser.evaluate('oldSaveCalls'),0,'disposed runtime skips queued original saves');
  assert.equal(await browser.evaluate('document.querySelector("#background-save-status").hidden&&document.querySelector("#download").disabled&&document.querySelectorAll("#stage iframe").length===0'),true,'old completions do not affect replacement editor');
  assert.deepEqual(browser.errors,[],'unmount has no unhandled background failures');
  console.log('PASS background persistence: paused saves allow editing/undo/export/replacement, immutable export cache, stale errors, ordered deletion, unmount');
}
