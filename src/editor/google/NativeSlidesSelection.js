import {SearchText} from '../SearchText.js';

/** Native selection criteria independent of preview mounting and Google requests. */
export class NativeSlidesSelection {
  /** @param {object} element Native descriptor. @param {string} query Literal name or text query. */
  static matches(element,query){return SearchText.normalize(`${element.name} ${element.text}`).includes(SearchText.normalize(query));}
  /** @param {NativeSlidesDocument} model Native deck. @param {Set<string>} previous Remembered IDs. @param {object} point Slide coordinates. @param {number} reference Source slide. @param {string} mode replace/add/remove. @param {object|null} criteria Optional appearance filters. @param {Set<number>|null} scope Optional page-only selection boundary preserving other IDs. */
  static atPoint(model,previous,point,reference,mode='replace',criteria=null,scope=null){
    const hit=index=>[...model.elements(index)].reverse().find(e=>!e.deleted&&e.box&&point.x>=e.box.x&&point.y>=e.box.y&&point.x<=e.box.x+e.box.w&&point.y<=e.box.y+e.box.h);
    const source=hit(reference),result=new Set(mode==='replace'&&!scope?[]:previous),strict=criteria&&Object.values(criteria).some(Boolean);
    if(mode==='replace'&&scope)for(const index of scope)for(const e of model.elements(index))result.delete(e.id);
    for(let index=0;index<model.original.slides.length;index++){if(scope&&!scope.has(index))continue;const e=hit(index);if(!e||(strict&&(!source||!this.similar(source,e,criteria))))continue;mode==='remove'?result.delete(e.id):result.add(e.id);}
    return result;
  }
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
