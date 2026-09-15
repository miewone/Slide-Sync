import assert from 'node:assert/strict';

/** @param {object} browser DevTools client. @param {string} origin App URL; checks real IndexedDB and explicit selection. */
export async function checkRecentFiles(browser,origin) {
  browser.errors=[];
  const ready=()=>browser.until('!!document.querySelector("#recent-files-open")&&!document.querySelector("#recent-files-open").disabled','recent chooser ready');
  const show=async()=>{
    await browser.evaluate('document.querySelector("#recent-files-open").click()');
    await browser.until('document.querySelector("#recent-files-dialog").open && !document.querySelector("#recent-files-dialog [role=status]").textContent.includes("처리")','recent list loaded');
  };
  const count=()=>browser.evaluate('document.querySelectorAll(".recent-files-list li").length');
  const close=()=>browser.evaluate('document.querySelector("#recent-files-close").click()');
  const upload=async(name,{invalid=false,changed=false}={})=>{
    await browser.evaluate(`(async()=>{
      let bytes=await (await fetch(new URL('sample.pptx',document.baseURI))).arrayBuffer();
      ${invalid?"bytes=new TextEncoder().encode('invalid pptx');":''}
      ${changed?"const zip=await JSZip.loadAsync(bytes);zip.comment='recent-file-version';bytes=await zip.generateAsync({type:'arraybuffer'});":''}
      const transfer=new DataTransfer();transfer.items.add(new File([bytes],${JSON.stringify(name)}));
      const input=document.querySelector('#file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    })()`);
    await ready();
  };
  await browser.navigate(origin);await ready();await show();
  await browser.evaluate('document.querySelector("#recent-files-clear").click()');
  await browser.until('!document.querySelector(".recent-files-list li")','history starts empty');await close();
  await upload('최근 문서.pptx');await show();assert.equal(await count(),1);await close();
  await browser.navigate(origin);await ready();
  assert.equal(await browser.evaluate('document.querySelector("#download").disabled'),true,'reload never auto-opens a deck');
  assert.equal(await browser.evaluate('document.querySelectorAll(".slide-surface").length'),0);
  await show();assert.equal(await count(),1,'original survives reload');
  await browser.evaluate('document.querySelector(".recent-file-select").click()');
  await browser.until('!document.querySelector("#recent-files-dialog").open&&!document.querySelector("#download").disabled','explicit choice opens stored bytes');
  assert.equal(await browser.evaluate('document.querySelector("#filename").textContent'),'최근 문서.pptx');
  await upload('최근 문서.pptx');await show();assert.equal(await count(),1,'same name and content deduplicated');await close();
  await upload('최근 문서.pptx',{changed:true});await show();assert.equal(await count(),2,'same filename with changed contents is retained separately');await close();
  await upload('broken.pptx',{invalid:true});await show();assert.equal(await count(),2,'invalid input is never remembered');
  await browser.evaluate('document.querySelector(".recent-file-delete").click()');
  await browser.until('document.querySelectorAll(".recent-files-list li").length===1','individual removal');
  assert.equal(await browser.evaluate('document.querySelector("#download").disabled'),false,'deletion preserves the current editor');
  await browser.evaluate('document.querySelector("#recent-files-clear").click()');
  await browser.until('!document.querySelector(".recent-files-list li")','clear all');await close();
  await browser.navigate(origin);await ready();await show();assert.equal(await count(),0,'deletion survives reload');await close();
  if(origin.includes(':5179')) {
    const result=await browser.evaluate(`(async()=>{
      const {RecentFilesRepository}=await import('/src/services/RecentFilesRepository.js');
      const repo=new RecentFilesRepository({name:'slide-sync-recent-test'});await repo.clear();
      const bytes=new Uint8Array([1,2,3]).buffer;
      const id=await repo.save('one.pptx',bytes);const loaded=await repo.get(id);
      let rejected=false;
      try{await repo.transaction(['metadata','contents'],'readwrite',tx=>{tx.objectStore('metadata').clear();tx.objectStore('contents').clear();tx.abort();});}catch{rejected=true;}
      const intact=(await repo.list()).length===1;
      await repo.remove(id);await repo.touch(id);const empty=(await repo.list()).length===0&&await repo.get(id)===null;
      await repo.save('two.pptx',bytes);await repo.clear();
      const noContents=await repo.transaction(['contents'],'readonly',tx=>{const r=tx.objectStore('contents').count();return ()=>r.result===0;});
      let unavailable=false;try{await new RecentFilesRepository({indexedDB:null}).list();}catch{unavailable=true;}
      globalThis.originalRecentSave=RecentFilesRepository.prototype.save;
      RecentFilesRepository.prototype.save=async()=>{throw new DOMException('test quota','QuotaExceededError');};
      return {bytes:[...new Uint8Array(loaded.buffer)],rejected,intact,empty,noContents,unavailable};
    })()`);
    assert.deepEqual(result,{bytes:[1,2,3],rejected:true,intact:true,empty:true,noContents:true,unavailable:true});
    await upload('storage-full.pptx');
    assert.equal(await browser.evaluate('document.querySelector("#download").disabled'),false,'storage quota failure does not prevent editing');
    assert.equal(await browser.evaluate('document.querySelector("#notice").textContent.includes("보관하지 못했습니다")'),true);
    await browser.evaluate(`(async()=>{const {RecentFilesRepository}=await import('/src/services/RecentFilesRepository.js');RecentFilesRepository.prototype.save=originalRecentSave;})()`);
  }
  assert.deepEqual(browser.errors,[],'recent files have no browser errors');
  console.log('PASS recent files: explicit chooser, original persistence, duplicate/content handling, invalid file, individual/all deletion and storage failure');
}
