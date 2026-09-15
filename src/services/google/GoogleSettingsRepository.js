import {localizedError} from '../../i18n/I18n.js';

/** Browser-owned Google project configuration. This database contains no OAuth client secrets. */
export class GoogleSettingsRepository {
  /** @param {object} options Optional IndexedDB factory and database name for isolated tests. */
  constructor({indexedDB=globalThis.indexedDB,name='slide-sync-google-settings'}={}){this.indexedDB=indexedDB;this.name=name;}
  /** @param {object} value User-entered API key, OAuth client ID and numeric project number. */
  static validate(value){
    const config=Object.fromEntries(['clientId','apiKey','appId'].map(key=>[key,String(value?.[key]||'').trim()]));
    const client=/^(\d+)-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.exec(config.clientId);
    if(!client)throw localizedError('drive.settingsClientInvalid');
    if(!/^AIza[A-Za-z0-9_-]{20,100}$/.test(config.apiKey))throw localizedError('drive.settingsKeyInvalid');
    if(!/^\d+$/.test(config.appId)||client[1]!==config.appId)throw localizedError('drive.settingsProjectInvalid');
    return config;
  }
  /** Open a short-lived connection with bounded blocked-upgrade handling. */
  open(){return new Promise((resolve,reject)=>{
    if(!this.indexedDB){reject(localizedError('drive.settingsStorageError'));return;}
    let settled=false;const fail=()=>{if(!settled){settled=true;clearTimeout(timer);reject(localizedError('drive.settingsStorageError'));}};
    const timer=setTimeout(fail,5000);let request;
    try{request=this.indexedDB.open(this.name,1);}catch{fail();return;}
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('settings'))request.result.createObjectStore('settings');};
    request.onerror=fail;request.onblocked=fail;
    request.onsuccess=()=>{const db=request.result;if(settled){db.close();return;}settled=true;clearTimeout(timer);db.onversionchange=()=>db.close();resolve(db);};
  });}
  /** @param {string} mode Transaction mode. @param {Function} action Schedules a single configuration request. */
  async transaction(mode,action){
    const db=await this.open();
    try{return await new Promise((resolve,reject)=>{
      const tx=db.transaction('settings',mode);let request;
      tx.oncomplete=()=>resolve(request.result);tx.onabort=()=>reject(localizedError('drive.settingsStorageError'));tx.onerror=()=>{};
      try{request=action(tx.objectStore('settings'));}catch{tx.abort();}
    });}finally{db.close();}
  }
  /** Read saved settings without contacting Google. */
  async get(){const value=await this.transaction('readonly',store=>store.get('google'));return value?GoogleSettingsRepository.validate(value):null;}
  /** @param {object} value User configuration; commit before reporting success. */
  async save(value){const config=GoogleSettingsRepository.validate(value);await this.transaction('readwrite',store=>store.put(config,'google'));return config;}
  /** Forget this browser's saved project configuration. */
  async clear(){await this.transaction('readwrite',store=>store.delete('google'));}
}
