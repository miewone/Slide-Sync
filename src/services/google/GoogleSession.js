import {i18n,localizedError} from '../../i18n/I18n.js';

export const DRIVE_SCOPE='https://www.googleapis.com/auth/drive.file';
export const PPTX_MIME='application/vnd.openxmlformats-officedocument.presentationml.presentation';
export const SLIDES_MIME='application/vnd.google-apps.presentation';
const scripts=new Map();

/** Load an approved Google script once; failed loads can be retried. @param {string} src Official script URL. */
function loadScript(src) {
  if(!scripts.has(src))scripts.set(src,new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=src;script.async=true;
    const timer=setTimeout(()=>fail(),20000);
    const fail=()=>{clearTimeout(timer);script.remove();reject(localizedError('drive.libraryError'));};
    script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=fail;document.head.append(script);
  }).catch(error=>{scripts.delete(src);throw error;}));
  return scripts.get(src);
}

/** Google consent and file selection. Credentials remain in memory for this app instance. */
export class GoogleSession {
  /** @param {object} config Public OAuth clientId, Picker apiKey and Cloud project appId. */
  constructor({clientId='',apiKey='',appId=''}={}) {
    Object.assign(this,{clientId:clientId.trim(),apiKey:apiKey.trim(),appId:appId.trim()});this.generation=0;this.accessToken='';this.expiresAt=0;this.loading=null;
  }
  /** Whether deployment supplied all public Google identifiers. */
  get configured(){return !!(this.clientId&&this.apiKey&&this.appId);}
  /** Whether consent libraries have loaded. */
  get ready(){return !!this.client;}
  /** Load libraries without opening any consent or picker window. */
  async prepare() {
    if(!this.configured)throw localizedError('drive.configMissing');
    if(!this.loading)this.loading=(async()=>{
      await Promise.all([loadScript('https://accounts.google.com/gsi/client'),loadScript('https://apis.google.com/js/api.js')]);
      await new Promise((resolve,reject)=>globalThis.gapi.load('picker',{callback:resolve,onerror:()=>reject(localizedError('drive.libraryError')),timeout:20000,ontimeout:()=>reject(localizedError('drive.libraryError'))}));
      this.client=globalThis.google.accounts.oauth2.initTokenClient({client_id:this.clientId,scope:DRIVE_SCOPE,include_granted_scopes:false,callback:()=>{}});
    })().catch(error=>{this.loading=null;throw error;});
    return this.loading;
  }
  /** Request consent directly from a user click, preserving popup activation. */
  authorize() {
    if(!this.client)return Promise.reject(localizedError('drive.libraryError'));
    if(this.pending)return this.pending;
    const generation=this.generation;
    this.pending=new Promise((resolve,reject)=>{
      this.client.callback=response=>{
        if(generation!==this.generation||response.error||!response.access_token||!globalThis.google.accounts.oauth2.hasGrantedAllScopes(response,DRIVE_SCOPE)){
          reject(localizedError('drive.authError'));return;
        }
        this.accessToken=response.access_token;this.expiresAt=Date.now()+Number(response.expires_in)*1000-60000;resolve();
      };
      this.client.error_callback=()=>reject(localizedError('drive.authError'));
      this.client.requestAccessToken({prompt:''});
    }).finally(()=>{this.pending=null;});
    return this.pending;
  }
  /** Read a valid access token; never silently open a popup or persist credentials. */
  token() {
    if(!this.accessToken||Date.now()>=this.expiresAt)throw localizedError('drive.expired');
    return this.accessToken;
  }
  /** Forget this tab's credentials; Google account permissions are unchanged. */
  disconnect(){this.generation++;this.accessToken='';this.expiresAt=0;}
  /** @param {boolean} folder Choose a destination folder instead of a presentation. Returns null on cancellation. */
  pick(folder=false) {
    const token=this.token(),p=globalThis.google.picker;
    return new Promise(resolve=>{
      const view=new p.DocsView(folder?p.ViewId.FOLDERS:p.ViewId.DOCS);
      if(folder)view.setIncludeFolders(true).setSelectFolderEnabled(true).setMimeTypes('application/vnd.google-apps.folder');
      else view.setMimeTypes(`${PPTX_MIME},${SLIDES_MIME}`);
      const picker=new p.PickerBuilder().setDeveloperKey(this.apiKey).setAppId(this.appId).setOAuthToken(token)
        .setOrigin(location.origin).setLocale(i18n.getLanguage()).addView(view).setCallback(data=>{
          if(data.action===p.Action.PICKED||data.action===p.Action.CANCEL){picker.dispose();resolve(data.action===p.Action.PICKED?data.docs[0]:null);}
        }).build();
      picker.setVisible(true);
    });
  }
}
