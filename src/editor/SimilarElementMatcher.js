import {AppearanceMatcher} from './AppearanceMatcher.js';
import {children} from './core.js';

const formatAttributes=new Set(['sz','b','algn','typeface']);

/** Source-based matching for the context menu, independent of element position. */
export class SimilarElementMatcher extends AppearanceMatcher {
  /** @param {object} deck Loaded PPTX. @param {object} criteria Enabled layout, colors and format criteria. */
  constructor(deck,criteria){super(deck,{size:!!criteria.layout,layout:false,colors:!!criteria.colors});this.criteria=criteria;}
  /** @param {Element} node XML node. @param {object} slide Owner. Project only requested style properties. */
  project(node,slide){
    if(!node)return null;
    if(['off','chOff','cNvPr','t','extLst','nvPr','cNvSpPr','cNvPicPr','cNvGrpSpPr','cNvCxnSpPr','cNvGraphicFramePr'].includes(node.localName))return null;
    if(['ext','chExt'].includes(node.localName))return this.criteria.layout?this.canonical(node,slide):null;
    if(['prstGeom','custGeom'].includes(node.localName))return this.criteria.layout?this.canonical(node,slide):null;
    if(['solidFill','gradFill','pattFill','noFill','srgbClr','schemeClr','sysClr','prstClr','scrgbClr','hslClr','clrMap','clrMapOvr','fillRef','lnRef','fontRef'].includes(node.localName))return this.criteria.colors?this.canonical(node,slide):null;
    const attrs=this.criteria.format?Array.from(node.attributes||[]).filter(a=>formatAttributes.has(a.localName)).map(a=>[a.localName,a.value]).sort():[];
    if(this.criteria.layout&&node.localName==='xfrm')attrs.push(...Array.from(node.attributes||[]).filter(a=>['rot','flipH','flipV'].includes(a.localName)).map(a=>[a.localName,a.value]).sort());
    const nested=children(node).map(n=>this.project(n,slide)).filter(Boolean);
    const unique=nested.filter((value,index)=>index===0||JSON.stringify(value)!==JSON.stringify(nested[index-1]));
    if(attrs.length||unique.length)return [node.localName,attrs,unique];
    return null;
  }
  /** @param {object} source Reference. @param {object} candidate Candidate. @param {object} sourceSlide Reference page. @param {object} slide Candidate page. */
  matches(source,candidate,sourceSlide,slide){
    if(!Object.values(this.criteria).some(Boolean))return false;
    if(this.criteria.layout&&source?.g?.rot!==candidate?.g?.rot)return false;
    // Format-only matching must still compare signatures when the base filters are off.
    if(!source?.g||!candidate?.g||source.hidden||candidate.hidden||source.kind!==candidate.kind)return false;
    if(!super.matches(source,candidate,sourceSlide,slide))return false;
    return this.signature(source,sourceSlide)===this.signature(candidate,slide);
  }
  /** @param {object} deck Deck. @param {number} page Reference page. @param {object} source Reference element. @param {object} criteria Filters. @param {string} scope page/all. */
  static select(deck,page,source,criteria,scope){
    const matcher=new SimilarElementMatcher(deck,criteria),result=new Map();
    for(const slide of deck.slides){
      if(scope!=='all'&&slide.index!==page)continue;
      const ids=new Set(slide.elements.filter(e=>matcher.matches(source,e,deck.slides[page],slide)).map(e=>e.id));
      if(ids.size)result.set(slide.index,ids);
    }
    return result;
  }
}
