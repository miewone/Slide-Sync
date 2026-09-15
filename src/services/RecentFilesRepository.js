import {t,localizedError} from '../i18n/I18n.js';
/** Browser-local PPTX originals and Drive references; metadata reads never load file contents. */
export class RecentFilesRepository {
  /** @param {object} options Optional database name and browser APIs for isolated tests. */
  constructor({name='slide-sync-recent-files',indexedDB=globalThis.indexedDB,crypto=globalThis.crypto}={}) {
    this.name=name;this.indexedDB=indexedDB;this.crypto=crypto;
  }

  /** Open one short-lived connection; blocked/private storage must not stall the editor. */
  open() {
    return new Promise((resolve,reject)=>{
      if(!this.indexedDB){reject(localizedError('RecentFilesRepository.1'));return;}
      const request=this.indexedDB.open(this.name,2);
      let settled=false;
      const fail=error=>{if(settled)return;settled=true;clearTimeout(timer);reject(error);};
      const timer=setTimeout(()=>fail(localizedError('RecentFilesRepository.2')),5000);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains('metadata'))db.createObjectStore('metadata',{keyPath:'id'});
        if(!db.objectStoreNames.contains('contents'))db.createObjectStore('contents');
        if(!db.objectStoreNames.contains('previews'))db.createObjectStore('previews',{keyPath:'id'}).createIndex('lastUsed','lastUsed');
      };
      request.onerror=()=>fail(request.error);
      request.onblocked=()=>fail(localizedError('RecentFilesRepository.3'));
      request.onsuccess=()=>{
        const db=request.result;
        if(settled){db.close();return;}
        settled=true;clearTimeout(timer);db.onversionchange=()=>db.close();resolve(db);
      };
    });
  }

  /**
   * Commit before reporting success, including quota failures raised after request success.
   * @param {string[]} stores Transaction stores. @param {string} mode IndexedDB access mode.
   * @param {Function} run Synchronous request scheduler; returns a result reader.
   */
  async transaction(stores,mode,run) {
    const db=await this.open();
    try {
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(stores,mode);
        let result;
        tx.oncomplete=()=>{try{resolve(result?.());}catch(error){reject(error);}};
        tx.onabort=()=>reject(tx.error||localizedError('RecentFilesRepository.4'));
        tx.onerror=()=>{};
        try{result=run(tx);}catch(error){tx.abort();reject(error);}
      });
    } finally {db.close();}
  }

  /** List newest-first metadata without retrieving stored PPTX bytes. */
  list() {
    return this.transaction(['metadata'],'readonly',tx=>{
      const request=tx.objectStore('metadata').getAll();
      return ()=>request.result.sort((a,b)=>b.lastOpened-a.lastOpened||a.name.localeCompare(b.name));
    });
  }

  /** @param {string} name Original filename. @param {ArrayBuffer} buffer Successfully opened original bytes. */
  async save(name,buffer) {
    if(!/\.pptx$/i.test(name)||!(buffer instanceof ArrayBuffer)||!buffer.byteLength||buffer.byteLength>50*1024*1024)throw localizedError('RecentFilesRepository.5');
    const hash=await this.crypto.subtle.digest('SHA-256',buffer);
    const id=JSON.stringify([name,Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('')]);
    const metadata={id,name,size:buffer.byteLength,lastOpened:Date.now()};
    await this.transaction(['metadata','contents'],'readwrite',tx=>{
      tx.objectStore('metadata').put(metadata);tx.objectStore('contents').put(buffer,id);
    });
    return id;
  }

  /** Remember a successfully opened Drive file, optionally retaining its original PPTX for offline use. @param {object} source Drive id, name and mimeType. @param {ArrayBuffer} buffer Optional original PPTX bytes. */
  async saveDrive(source,buffer) {
    const pptx='application/vnd.openxmlformats-officedocument.presentationml.presentation';
    if(!source?.id||!source.name||![pptx,'application/vnd.google-apps.presentation'].includes(source.mimeType))throw localizedError('RecentFilesRepository.5');
    if(buffer!==undefined&&(source.mimeType!==pptx||!(buffer instanceof ArrayBuffer)||!buffer.byteLength||buffer.byteLength>50*1024*1024))throw localizedError('RecentFilesRepository.5');
    const id=JSON.stringify(['google-drive',source.id]);
    const metadata={id,name:source.name,kind:'drive',driveFileId:source.id,mimeType:source.mimeType,size:buffer?.byteLength||0,hasLocalCopy:!!buffer,lastOpened:Date.now()};
    await this.transaction(['metadata','contents'],'readwrite',tx=>{
      tx.objectStore('metadata').put(metadata);
      if(buffer)tx.objectStore('contents').put(buffer,id);else tx.objectStore('contents').delete(id);
    });
    return id;
  }

  /** @param {string} id Local content identifier or Drive reference chosen explicitly by the user. Returns metadata with optional stored bytes. */
  get(id) {
    return this.transaction(['metadata','contents'],'readonly',tx=>{
      const metadata=tx.objectStore('metadata').get(id),contents=tx.objectStore('contents').get(id);
      return ()=>metadata.result&&(contents.result||metadata.result.kind==='drive')?{...metadata.result,buffer:contents.result}:null;
    });
  }

  /** @param {string} id Successfully reopened file; never recreate an entry deleted by another tab. */
  touch(id) {
    return this.transaction(['metadata'],'readwrite',tx=>{
      const store=tx.objectStore('metadata'),request=store.get(id);
      request.onsuccess=()=>{if(request.result)store.put({...request.result,lastOpened:Date.now()});};
    });
  }

  /** @param {string} id Remove both metadata and the stored original, leaving the current editor untouched. */
  remove(id) {
    return this.transaction(['metadata','contents','previews'],'readwrite',tx=>{
      tx.objectStore('metadata').delete(id);tx.objectStore('contents').delete(id);
      // Previews are shared by content, so erase them conservatively on deletion.
      tx.objectStore('previews').clear();
    });
  }

  /** Delete all locally remembered originals and metadata in one transaction. */
  clear() {
    return this.transaction(['metadata','contents','previews'],'readwrite',tx=>{
      tx.objectStore('metadata').clear();tx.objectStore('contents').clear();
      tx.objectStore('previews').clear();
    });
  }

  /** @param {string[]} ids Slide hashes. Read only matching previews and refresh their recency. */
  getPreviews(ids) {
    return this.transaction(['previews'],'readwrite',tx=>{
      const store=tx.objectStore('previews'),found=new Map();
      for(const id of new Set(ids)){
        const request=store.get(id);
        request.onsuccess=()=>{
          const entry=request.result;if(!entry)return;
          found.set(id,entry.html);store.put({...entry,lastUsed:Date.now()});
        };
      }
      return ()=>found;
    });
  }

  /** @param {Array<{id:string,html:string}>} entries Successful previews; retain at most 32 MiB and 240 slides. */
  savePreviews(entries) {
    return this.transaction(['previews'],'readwrite',tx=>{
      const store=tx.objectStore('previews'),now=Date.now();
      for(const {id,html} of entries){
        const size=html.length*2;
        if(size<=4*1024*1024)store.put({id,html,size,lastUsed:now});
      }
      // Walk newest first; a cursor keeps old HTML out of an unbounded getAll result.
      let bytes=0,count=0;
      const request=store.index('lastUsed').openCursor(null,'prev');
      request.onsuccess=()=>{
        const cursor=request.result;if(!cursor)return;
        bytes+=cursor.value.size;count++;
        if(bytes>32*1024*1024||count>240)cursor.delete();
        cursor.continue();
      };
    });
  }
}
