import {messages} from './messages.js';

/** Shared Korean/English preference and message formatting, independent of React and the editor. */
export class I18n {
  /** @param {object} options Optional storage adapter and preferred browser languages; stored selection takes precedence. */
  constructor({storage,languages=typeof window==='undefined'?[]:(globalThis.navigator?.languages?.length?globalThis.navigator.languages:[globalThis.navigator?.language])}={}) {
    this.listeners=new Set();
    this.language=languages.map(value=>String(value||'').toLowerCase().split('-')[0]).find(value=>['ko','en'].includes(value))||'ko';
    try{this.storage=storage===undefined?globalThis.localStorage:storage;const saved=this.storage?.getItem('slide-sync-language');if(['ko','en'].includes(saved))this.language=saved;}catch{}
  }
  /** Read a stable language code for external-store subscriptions. */
  getLanguage=()=>this.language;
  /** @param {Function} listener Language-change listener; returns cleanup. */
  subscribe=listener=>{this.listeners.add(listener);return ()=>this.listeners.delete(listener);};
  /** @param {string} language Supported language code; preserve usability if persistence fails. */
  setLanguage(language) {
    if(!['ko','en'].includes(language))return;
    try{this.storage?.setItem('slide-sync-language',language);}catch{}
    if(language===this.language)return;
    this.language=language;
    for(const listener of this.listeners)listener();
  }
  /** @param {string} key Central message key. @param {object} params Named substitutions, treated as plain text. */
  translate(key,params={}) {
    const text=messages[key]?.[this.language]??messages[key]?.ko??key;
    return text.replace(/\{(\w+)\}/g,(_,name)=>String(params[name]??`{${name}}`));
  }
}
export const i18n=new I18n();
/** @param {string} key Message key. @param {object} params Plain-text interpolation values. */
export const t=(key,params)=>i18n.translate(key,params);
/** Return the active Intl locale for numbers and dates. */
export const locale=()=>i18n.getLanguage()==='en'?'en-US':'ko-KR';
/** @param {string} key Error message key. @param {object} params Interpolation values; reevaluated on language changes. */
export function localizedError(key,params) {
  const error=new Error(t(key,params));
  Object.defineProperty(error,'message',{get:()=>t(key,params),configurable:true});return error;
}
