import assert from 'node:assert/strict';

/** @param {object} browser DevTools client. @param {string} origin App URL for persistent slide-cache regression checks. */
export async function checkPreviewCache(browser,origin) {
  browser.errors=[];
  const dev=origin.includes(':5179');
  const ready=()=>browser.until('!!document.querySelector("#demo")&&!document.querySelector("#demo").disabled','cache app ready');
  const loaded=()=>browser.until('!document.querySelector("#download").disabled&&!!document.querySelector("#stage iframe")?.contentDocument?.querySelector("[data-pptx-mover]")','cached deck ready');
  const instrument=async()=>{
    if(!dev)return;
    await browser.evaluate(`(async()=>{
      const {previewResources}=await import('/src/services/PreviewResources.js');
      const original=previewResources.loadRenderer.bind(previewResources);
      globalThis.renderCalls=0;globalThis.rendererLoads=0;
      previewResources.loadRenderer=async options=>{
        rendererLoads++;const module=await original(options);
        return {init(...args){const renderer=module.init(...args),load=renderer.load.bind(renderer);
          renderer.load=async(...input)=>{const result=await load(...input),render=renderer.htmlRender.renderSlide;
            renderer.htmlRender.renderSlide=function(...values){renderCalls++;return render.apply(this,values);};return result;};
          return renderer;}};
      };
    })()`);
  };
  const upload=async(name,expression)=>{
    await browser.evaluate(`(async()=>{
      const bytes=${expression};const transfer=new DataTransfer();transfer.items.add(new File([bytes],${JSON.stringify(name)}));
      const input=document.querySelector('#file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    })()`);
    await loaded();
  };
  const sample="await (await fetch(new URL('sample.pptx',document.baseURI))).arrayBuffer()";
  await browser.navigate(origin);await ready();
  await browser.evaluate(`document.querySelector('#recent-files-open').click()`);
  await browser.until('document.querySelector("#recent-files-dialog").open&&!document.querySelector("#recent-files-close").disabled','cache clear ready');
  await browser.evaluate(`document.querySelector('#recent-files-clear').click()`);
  await browser.until('!document.querySelector(".recent-files-list li")','cache cleared');
  await browser.evaluate(`document.querySelector('#recent-files-close').click()`);
  await instrument();await upload('cache-original.pptx',sample);
  const count=await browser.evaluate('document.querySelectorAll(".slide-item").length');
  if(dev)assert.equal(await browser.evaluate('renderCalls'),count,'cold load renders all slides');
  await browser.navigate(origin);await ready();await instrument();
  await upload('cache-renamed.pptx',sample);
  if(dev){assert.equal(await browser.evaluate('renderCalls'),0);assert.equal(await browser.evaluate('rendererLoads'),0,'reload skips renderer initialization');}
  assert.equal(await browser.evaluate('performance.getEntriesByType("resource").some(e=>/lodash.min.js|uuid.min.js|pptx-preview.es/.test(e.name))'),false,'persisted previews avoid renderer dependencies');
  assert.equal(await browser.evaluate('document.querySelectorAll(".foot-note").length'),0);
  // An external edit changes only one slide and must not re-render its siblings.
  await browser.evaluate(`(async()=>{globalThis.changedBytes=await (async()=>{
    const zip=await JSZip.loadAsync(${sample});
    const path='ppt/slides/slide1.xml',doc=new DOMParser().parseFromString(await zip.file(path).async('string'),'application/xml');
    doc.getElementsByTagNameNS('*','t')[0].textContent='CACHE CHANGED TEXT';
    zip.file(path,new XMLSerializer().serializeToString(doc));return zip.generateAsync({type:'arraybuffer'});
  })();})()`);
  await upload('cache-changed.pptx','changedBytes');
  if(dev)assert.equal(await browser.evaluate('renderCalls'),1,'only edited slide renders');
  await browser.until('document.querySelector("#stage iframe").contentDocument.body.textContent.includes("CACHE CHANGED TEXT")','new text is visible');
  // A reused frame remains editable and undo restores its imported geometry.
  await browser.until('!!document.querySelector("#slide-1 iframe")?.contentDocument?.querySelector("[data-pptx-mover]")','reused second slide ready');
  await browser.evaluate(`globalThis.beforeMove=document.querySelector('#slide-1 iframe').contentDocument.querySelector('[data-pptx-mover]').style.transform;
    globalThis.uncheckedBefore=document.querySelector('#slide-0 iframe').contentDocument.querySelector('[data-pptx-mover]').style.transform;
    document.querySelector('#range').value='2';document.querySelector('#apply-range').click();
    document.querySelector('#slide-1 .slide-surface').dispatchEvent(new KeyboardEvent('keydown',{key:'a',ctrlKey:true,bubbles:true}));
    document.querySelector('#move-mode').value='relative';document.querySelector('#move-mode').dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelector('#x').value='1';document.querySelector('#y').value='0';document.querySelector('#move').click();`);
  await browser.until('!document.querySelector("#undo").disabled','cached slide moves');
  assert.equal(await browser.evaluate('document.querySelector("#slide-1 iframe").contentDocument.querySelector("[data-pptx-mover]").style.transform!==beforeMove'),true,'reused slide actually moves');
  assert.equal(await browser.evaluate('document.querySelector("#slide-0 iframe").contentDocument.querySelector("[data-pptx-mover]").style.transform===uncheckedBefore'),true,'unchecked slide is unchanged');
  await browser.evaluate(`document.querySelector('#undo').click()`);
  assert.equal(await browser.evaluate('document.querySelector("#slide-1 iframe").contentDocument.querySelector("[data-pptx-mover]").style.transform===beforeMove'),true,'cache undo restores geometry');
  await browser.evaluate(`const originalURL=URL.createObjectURL;URL.createObjectURL=function(blob){if(blob.type==='application/zip'||blob.size>1000)globalThis.savedPptx=blob;return originalURL.call(this,blob);};
    const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(!this.download)click.call(this);};
    document.querySelector('#move').click();document.querySelector('#download').click();`);
  await browser.until('!!globalThis.savedPptx&&!document.querySelector("#download").disabled','edited cache export');
  const renderedBefore=dev?await browser.evaluate('renderCalls'):0;
  await upload('cache-export.pptx','await savedPptx.arrayBuffer()');
  if(dev)assert.equal(await browser.evaluate('renderCalls'),renderedBefore,'edited export reuses synchronized previews');
  assert.equal(await browser.evaluate('document.querySelectorAll(".foot-note").length'),0);

  if(dev){
    const hashes=await browser.evaluate(`(async()=>{
      const {SlidePreviewCache}=await import('/src/editor/SlidePreviewCache.js');
      const {loadDeck}=await import('/src/editor/core.js');
      const deck=await loadDeck(${sample},JSZip),cache=new SlidePreviewCache(null);
      const a=await cache.keys(deck);deck.slides[0].doc.getElementsByTagNameNS('*','t')[0].textContent+=' changed';
      const b=await cache.keys(deck);
      const path='ppt/slides/_rels/slide1.xml.rels';
      const rels=await deck.zip.file(path).async('string');
      deck.zip.file(path,rels.replace('</Relationships>','<Relationship Id="cacheImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/cache.png"/></Relationships>'));
      deck.zip.file('ppt/media/cache.png',new Uint8Array([1]));const c=await cache.keys(deck);
      deck.zip.file('ppt/media/cache.png',new Uint8Array([2]));const d=await cache.keys(deck);
      const theme=Object.keys(deck.zip.files).find(p=>/^ppt\\/theme\\/theme.*xml$/.test(p));
      deck.zip.file(theme,(await deck.zip.file(theme).async('string'))+' ');const e=await cache.keys(deck);
      deck.zip.file('docProps/app.xml','<Properties><Application>WPS</Application></Properties>');const producer=await cache.keys(deck);
      const version=await new SlidePreviewCache(null,{version:'different-renderer'}).keys(deck);
      return {text:b.map((v,i)=>v!==a[i]),image:d.map((v,i)=>v!==c[i]),theme:e.some((v,i)=>v!==d[i]),producer:producer.every((v,i)=>v!==e[i]),version:version.every((v,i)=>v!==producer[i])};
    })()`);
    assert.deepEqual(hashes.text,Array.from({length:count},(_,i)=>i===0));
    assert.deepEqual(hashes.image,Array.from({length:count},(_,i)=>i===0));
    assert.equal(hashes.theme,true);assert.equal(hashes.producer,true);assert.equal(hashes.version,true);
    const storage=await browser.evaluate(`(async()=>{
      const {RecentFilesRepository}=await import('/src/services/RecentFilesRepository.js');
      await new Promise((resolve,reject)=>{
        const request=indexedDB.open('preview-cache-migration',1);
        request.onupgradeneeded=()=>{request.result.createObjectStore('metadata',{keyPath:'id'});request.result.createObjectStore('contents');};
        request.onerror=()=>reject(request.error);
        request.onsuccess=()=>{const db=request.result,tx=db.transaction(['metadata','contents'],'readwrite');
          tx.objectStore('metadata').put({id:'old',name:'old.pptx',lastOpened:1});tx.objectStore('contents').put(new Uint8Array([1,2]).buffer,'old');
          tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};
      });
      const migrated=new RecentFilesRepository({name:'preview-cache-migration'});
      const old=await migrated.get('old');await migrated.savePreviews([{id:'new',html:'<div/>'}]);
      const migration=old.name==='old.pptx'&&new Uint8Array(old.buffer)[1]===2&&(await migrated.getPreviews(['new'])).has('new');
      const repo=new RecentFilesRepository({name:'preview-cache-test'});await repo.clear();
      await repo.savePreviews([{id:'large',html:'x'.repeat(2*1024*1024+1)},...Array.from({length:245},(_,i)=>({id:String(i),html:'<div/>'}))]);
      const values=await repo.getPreviews(['large',...Array.from({length:245},(_,i)=>String(i))]);
      const bounded=values.size===240&&!values.has('large');await repo.clear();
      return {migration,bounded,cleared:(await repo.getPreviews([...values.keys()])).size===0};
    })()`);
    assert.deepEqual(storage,{migration:true,bounded:true,cleared:true});
    await browser.evaluate(`(async()=>{const {RecentFilesRepository}=await import('/src/services/RecentFilesRepository.js');
      RecentFilesRepository.prototype.getPreviews=async()=>{throw Error('storage blocked');};
      RecentFilesRepository.prototype.savePreviews=async()=>{throw new DOMException('full','QuotaExceededError');};})()`);
    const before=await browser.evaluate('renderCalls');await upload('cache-unavailable.pptx',sample);
    assert.equal(await browser.evaluate('renderCalls'),before+count,'unavailable storage falls back to rendering');
  }
  assert.deepEqual(browser.errors,[],'cache browser errors');
  console.log(`PASS preview cache ${origin}: persistent hits, single-slide miss, edit/undo/export, dependencies, bounded storage`);
}
