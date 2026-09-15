import {localizedError} from '../../i18n/I18n.js';
import {PPTX_MIME,SLIDES_MIME} from './GoogleSession.js';

const DRIVE='https://www.googleapis.com/drive/v3/files';
const SLIDES='https://slides.googleapis.com/v1/presentations';
const FIELDS='id,name,mimeType,version,capabilities(canEdit,canCopy),parents';
const LIMIT=50*1024*1024;
const id=value=>encodeURIComponent(value);

/** REST transport for Drive files and native Slides. No presentation conversion is used. */
export class GoogleFiles {
  /** @param {object} session In-memory token provider. @param {Function} fetcher Fetch adapter for browser/tests. */
  constructor(session,fetcher=globalThis.fetch){this.session=session;this.fetcher=fetcher;}
  /** @param {string} url Google API URL. @param {object} options Fetch request parameters. */
  async request(url,options={}) {
    const headers=new Headers(options.headers);headers.set('Authorization',`Bearer ${this.session.token()}`);
    let response;
    // A browser-native fetch rejects a GoogleFiles instance as its receiver.
    const fetcher=this.fetcher;
    try{response=await fetcher(url,{...options,headers,cache:'no-store',referrerPolicy:'no-referrer'});}
    catch{throw localizedError(options.method&&options.method!=='GET'?'drive.uncertain':'drive.networkError');}
    if(!response.ok){
      if(response.status===401){this.session.disconnect();throw localizedError('drive.expired');}
      if(response.status===412)throw localizedError('drive.conflict');
      if(response.status===403)throw localizedError('drive.forbidden');
      if(response.status===400){let detail;try{detail=await response.json();}catch{}if(/revision/i.test(detail?.error?.message||''))throw localizedError('drive.conflict');}
      throw localizedError('drive.apiError',{status:response.status});
    }
    return response;
  }
  /** @param {string} fileId Drive file ID. Returns current metadata and an optional ETag for conditional writes. */
  async metadata(fileId) {
    const response=await this.request(`${DRIVE}/${id(fileId)}?fields=${FIELDS}&supportsAllDrives=true`);
    return {...await response.json(),etag:response.headers.get('ETag')};
  }
  /** @param {string} fileId Drive PPTX ID. Validate type/size and reject a changed download. */
  async openPptx(fileId) {
    const source=await this.metadata(fileId);
    if(source.mimeType!==PPTX_MIME)throw localizedError('drive.typeError');
    const response=await this.request(`${DRIVE}/${id(fileId)}?alt=media&supportsAllDrives=true`);
    if(Number(response.headers.get('Content-Length'))>LIMIT){await response.body?.cancel();throw localizedError('createEditorRuntime.55');}
    const chunks=[];let size=0;
    if(response.body){
      const reader=response.body.getReader();
      try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>LIMIT){await reader.cancel();throw localizedError('createEditorRuntime.55');}chunks.push(value);}}
      finally{reader.releaseLock();}
    }else chunks.push(await response.arrayBuffer());
    const buffer=await new Blob(chunks).arrayBuffer();
    if(buffer.byteLength>LIMIT)throw localizedError('createEditorRuntime.55');
    const after=await this.metadata(fileId);
    if(source.version!==after.version)throw localizedError('drive.conflict');
    return {source:after,buffer};
  }
  /** @param {string} fileId Native Slides presentation ID. Fetch structure without exporting to PPTX. */
  async presentation(fileId){return (await this.request(`${SLIDES}/${id(fileId)}`)).json();}
  /** @param {string} fileId Presentation ID. @param {string} pageId Native slide ID. */
  async thumbnail(fileId,pageId){return (await this.request(`${SLIDES}/${id(fileId)}/pages/${id(pageId)}/thumbnail?thumbnailProperties.thumbnailSize=LARGE`)).json();}
  /**
   * Save PPTX bytes to a new file or conditionally replace the selected original.
   * @param {Blob} blob Exported package. @param {object} options mode, name, folderId and source metadata.
   */
  async savePptx(blob,{mode,name,folderId,source}) {
    if(!['original','copy'].includes(mode)||!name?.trim()||blob.size>LIMIT)throw localizedError('drive.invalidSave');
    const original=mode==='original';let etag;
    if(original){
      if(!source?.id||source.mimeType!==PPTX_MIME||!source.capabilities?.canEdit)throw localizedError('drive.forbidden');
      const current=await this.metadata(source.id);
      if(current.version!==source.version)throw localizedError('drive.conflict');
      etag=current.etag;
      // Never make an unconditional replacement when the browser cannot read an ETag.
      if(!etag)throw localizedError('drive.noEtag');
    }
    const metadata=original?{}:{name:name.trim().replace(/\.pptx$/i,'')+'.pptx',mimeType:PPTX_MIME,...(folderId?{parents:[folderId]}:{})};
    const headers={'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':PPTX_MIME,'X-Upload-Content-Length':String(blob.size),...(etag?{'If-Match':etag}:{})};
    const start=await this.request(`https://www.googleapis.com/upload/drive/v3/files${original?'/'+id(source.id):''}?uploadType=resumable&supportsAllDrives=true&fields=${FIELDS}`,{method:original?'PATCH':'POST',headers,body:JSON.stringify(metadata)});
    const location=start.headers.get('Location');
    if(!location||new URL(location).origin!=='https://www.googleapis.com')throw localizedError('drive.uploadError');
    const uploaded=await this.request(location,{method:'PUT',headers:{'Content-Type':PPTX_MIME,...(etag?{'If-Match':etag}:{})},body:blob});
    return uploaded.json();
  }
  /**
   * Apply only the model's object edits. Copy the native source when selected by the user.
   * @param {NativeSlidesDocument} document Draft and original revision. @param {object} options mode, name, folderId, source.
   */
  async saveSlides(document,{mode,name,folderId,source}) {
    if(!['original','copy'].includes(mode)||!name?.trim())throw localizedError('drive.invalidSave');
    if(mode==='original'&&!source.capabilities?.canEdit)throw localizedError('drive.forbidden');
    if(mode==='copy'&&!source.capabilities?.canCopy)throw localizedError('drive.forbidden');
    let target=source,base=document.original;
    const current=await this.presentation(source.id);
    if(!document.matches(current))throw localizedError('drive.conflict');
    if(mode==='copy'){
      target=await (await this.request(`${DRIVE}/${id(source.id)}/copy?supportsAllDrives=true&fields=${FIELDS}`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.trim(),...(folderId?{parents:[folderId]}:{})})
      })).json();
      try{base=await this.presentation(target.id);if(!document.matches(base,{copy:true,baseline:current}))throw localizedError('drive.conflict');}
      catch(error){error.createdFile=target;throw error;}
    }else base=current;
    try{
      if(!base.revisionId)throw localizedError('drive.noRevision');
      const requests=document.requests();
      let revisionId=base.revisionId;
      if(requests.length){
        const result=await (await this.request(`${SLIDES}/${id(target.id)}:batchUpdate`,{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({requests,writeControl:{requiredRevisionId:base.revisionId}})})).json();
        revisionId=result.writeControl?.requiredRevisionId||null;
      }
      document.acceptSave(target.id,target.name,revisionId);
      return target;
    }catch(error){if(mode==='copy')error.createdFile=target;throw error;}
  }
}
