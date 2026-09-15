import {NativeSlidesAppearance} from '../../editor/google/NativeSlidesAppearance.js';
import {localizedError} from '../../i18n/I18n.js';

/** Refresh expiring native image URLs without replacing drafts or changing object coordinates. */
export class NativeSlidesMedia {
  /** @param {GoogleFiles} files Native Google transport. @param {NativeSlidesDocument} model Draft baseline. @param {string} fileId Current saved source. @param {Function} now Clock for resource expiry. */
  constructor(files,model,fileId,now=Date.now){this.now=now;this.files=files;this.model=model;this.fileId=fileId;this.pending=null;this.attempts=new Map();this.disposed=false;}
  /** @param {string} objectId Image or chart ID. @param {string|null} failedUrl Previously failing content URL. Share reads and bound retries per resource URL. */
  refresh(objectId,failedUrl){
    const key=`${objectId}:${failedUrl||''}`;const previous=this.attempts.get(key);if(previous&&this.now()-previous.time<25*60*1000)return previous.promise;
    const request=(async()=>{
      if(this.disposed)throw localizedError('drive.previewError');
      if(!this.pending)this.pending=Promise.resolve().then(()=>this.files.presentation(this.fileId)).finally(()=>{this.pending=null;});
      const fresh=await this.pending;if(this.disposed)throw localizedError('drive.previewError');
      if(!this.model.matches(fresh))throw localizedError('drive.conflict');
      const appearance=new NativeSlidesAppearance({original:fresh}),element=appearance.objects.get(objectId);
      const url=objectId.startsWith('background:')?NativeSlidesAppearance.imageUrl(appearance.pages.get(objectId.slice(11))?.pageProperties?.pageBackgroundFill?.stretchedPictureFill?.contentUrl):element?appearance.image(element).url:null;
      if(!url||url===failedUrl)throw localizedError('drive.previewError');return url;
    })();
    this.attempts.set(key,{promise:request,time:this.now()});return request;
  }
  /** Activate this resource owner when its workspace effect mounts. */
  activate(){this.disposed=false;}
  /** Ignore in-flight results when the source changes or the editor closes. */
  dispose(){this.disposed=true;this.attempts.clear();}
}
