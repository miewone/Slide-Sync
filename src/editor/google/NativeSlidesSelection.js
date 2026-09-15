import {SearchText} from '../SearchText.js';

/** Native selection criteria independent of preview mounting and Google requests. */
export class NativeSlidesSelection {
  /** @param {object} element Native descriptor. @param {string} query Literal name or text query. */
  static matches(element,query){return SearchText.normalize(`${element.name} ${element.text}`).includes(SearchText.normalize(query));}
  /** @param {object} reference Source descriptor. @param {object} candidate Candidate. @param {object} criteria size, colors, layout. */
  static similar(reference,candidate,criteria){
    if(reference.kind!==candidate.kind||!reference.box||!candidate.box||candidate.deleted)return false;
    const keys=[...(criteria.size?['w','h']:[]),...(criteria.layout?['x','y']:[])];
    if(!keys.every(k=>Math.abs(reference.box[k]-candidate.box[k])<0.01))return false;
    const project=e=>{
      const n=e.native;
      return [criteria.layout?[n.shape?.shapeType,n.transform?.scaleX,n.transform?.scaleY,n.transform?.shearX||0,n.transform?.shearY||0]:null,
        criteria.colors?[n.shape?.shapeProperties?.shapeBackgroundFill,n.shape?.shapeProperties?.outline,n.shape?.text?.textElements?.filter(t=>t.textRun).map(t=>t.textRun.style?.foregroundColor)]:null,
        n.elementGroup?.children?.map(child=>project({native:child}))];
    };
    return JSON.stringify(project(reference))===JSON.stringify(project(candidate));
  }
}
