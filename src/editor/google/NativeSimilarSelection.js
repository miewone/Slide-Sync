import {NativeSlidesAppearance} from './NativeSlidesAppearance.js';
import {NativeSlidesText} from './NativeSlidesText.js';

const unique=values=>[...new Set(values.map(value=>JSON.stringify(value)))].sort();

/** Match native elements using resolved text and paint properties. */
export class NativeSimilarSelection {
  /** @param {NativeSlidesDocument} model Current deck. @param {object} criteria Enabled layout, colors and format filters. */
  constructor(model,criteria){this.model=model;this.criteria=criteria;this.text=new NativeSlidesText(model);this.appearances=new Map();}
  /** @param {object} element Descriptor. @param {number} page Owning page. Return a comparable signature. */
  signature(element,page){
    if(!this.appearances.has(page))this.appearances.set(page,new NativeSlidesAppearance(this.model,page));
    const appearance=this.appearances.get(page),n=element.native,t=n.transform||{},c=this.criteria;
    const project=n=>{
      const paint=appearance.shape(n),colors=[],formats=[];let level=0;
      if(n.line){const line=appearance.fill(n.line.lineProperties?.lineFill);colors.push(['line',line.color,line.opacity]);}
      for(const part of n.shape?.text?.textElements||[]){
        if(part.paragraphMarker){level=part.paragraphMarker.style?.nestingLevel||0;formats.push(['alignment',part.paragraphMarker.style?.alignment||this.text.paragraphStyle(n,level).alignment||'START']);}
        if(part.textRun){const style={...this.text.inherited(n,level),...part.textRun.style};colors.push(appearance.color(style.foregroundColor?.opaqueColor,'#000000'));formats.push(['font',style.fontFamily,NativeSlidesAppearance.points(style.fontSize),!!style.bold]);}
      }
      return [c.colors?[paint.fill,paint.fillOpacity,paint.stroke,paint.strokeOpacity,unique(colors)]:null,c.format?unique(formats):null,n.elementGroup?.children?.map(project),n.table?.tableRows?.map(row=>row.tableCells?.map(cell=>[c.colors?appearance.fill(cell.tableCellProperties?.tableCellBackgroundFill):null,project({shape:{text:cell.text}})]))];
    };
    return JSON.stringify([element.kind,c.layout?[n.shape?.shapeType,n.line?.lineCategory,element.box.w,element.box.h,Math.atan2(t.shearY||0,t.scaleX??1)]:null,project(n)]);
  }
  /** @param {number} page Reference page. @param {object} source Reference element. @param {string} scope page/all. Return matching IDs across the requested pages. */
  select(page,source,scope){
    const selected=new Set();if(!Object.values(this.criteria).some(Boolean))return selected;
    const signature=this.signature(source,page);
    for(let index=0;index<this.model.original.slides.length;index++){
      if(scope!=='all'&&index!==page)continue;
      for(const element of this.model.elements(index))if(!element.deleted&&element.box&&this.signature(element,index)===signature)selected.add(element.id);
    }
    return selected;
  }
}
