import {child,children,selectedInSlide,setPosition,serialize,refreshSlide} from './core.js';
import {localizedError} from '../i18n/I18n.js';

/** Center-preserving independent width/height scaling shared by editor adapters. */
export class ElementResize {
  /** @param {number} widthPercent Width relative to current size. @param {number} heightPercent Height relative to current size. */
  static factors(widthPercent,heightPercent){
    if(![widthPercent,heightPercent].every(v=>Number.isFinite(v)&&v>=1&&v<=1000))throw localizedError('resize.invalid');
    return {sx:widthPercent/100,sy:heightPercent/100};
  }
  /** @param {object} g Unrotated geometry. @param {number} sx Width factor. @param {number} sy Height factor. Preserve each center, including rotated elements. */
  static geometry(g,sx,sy){
    const w=Math.round(g.w*sx),h=Math.round(g.h*sy);
    if(![w,h].every(v=>Number.isFinite(v)&&v>=0&&v<=360000000)||(g.w>0&&w===0)||(g.h>0&&h===0))throw localizedError('resize.invalid');
    return {...g,w,h,x:Math.round(g.x+(g.w-w)/2),y:Math.round(g.y+(g.h-h)/2)};
  }
  /** @param {object} deck PPTX deck. @param {Map<number,Set<string>>} selection Scoped IDs. @param {number} widthPercent Width %. @param {number} heightPercent Height %. Return undo snapshots; validation precedes mutation. */
  static apply(deck,selection,widthPercent,heightPercent){
    const {sx,sy}=this.factors(widthPercent,heightPercent),plans=[];
    if(sx===1&&sy===1)return [];
    for(const [index,ids] of selection)for(const element of selectedInSlide(deck.slides[index],ids)){
      const g=this.geometry(element.g,sx,sy),table=element.kind==='graphicFrame'?element.node.getElementsByTagNameNS('*','tbl')[0]:null;
      const dimensions=table?[...Array.from(table.getElementsByTagNameNS('*','gridCol'),node=>({node,key:'w',value:Math.round(Number(node.getAttribute('w'))*sx)})),...children(table).filter(n=>n.localName==='tr').map(node=>({node,key:'h',value:Math.round(Number(node.getAttribute('h'))*sy)}))]:[];
      if(dimensions.some(d=>!Number.isFinite(d.value)||d.value<1||d.value>360000000))throw localizedError('resize.invalid');
      if(dimensions.length){g.w=dimensions.filter(d=>d.key==='w').reduce((n,d)=>n+d.value,0);g.h=dimensions.filter(d=>d.key==='h').reduce((n,d)=>n+d.value,0);g.x=Math.round(element.g.x+(element.g.w-g.w)/2);g.y=Math.round(element.g.y+(element.g.h-g.h)/2);}
      if(['x','y','w','h'].some(k=>g[k]!==element.g[k]))plans.push({slide:deck.slides[index],element,g,dimensions});
    }
    const snapshots=new Map();
    for(const {slide,element,g,dimensions} of plans){
      if(!snapshots.has(slide.index))snapshots.set(slide.index,{index:slide.index,xml:serialize(slide.doc),dirty:slide.dirty});
      // Materialize inherited transforms without altering rotation or group coordinates.
      setPosition(element,g.x,g.y);
      const parent=element.kind==='graphicFrame'?element.node:child(element.node,element.kind==='grpSp'?'grpSpPr':'spPr');
      const ext=child(child(parent,'xfrm'),'ext');ext.setAttribute('cx',String(g.w));ext.setAttribute('cy',String(g.h));
      for(const {node,key,value} of dimensions)node.setAttribute(key,String(value));
      slide.dirty=true;
    }
    for(const index of snapshots.keys())refreshSlide(deck.slides[index]);
    return [...snapshots.values()];
  }
}
