import {children,child,descendants} from './core.js';

const sizeKeys=['w','h'];
const layoutKeys=['x','y','rot','flipH','flipV','chX','chY','chW','chH'];
const colorNodes=new Set(['solidFill','gradFill','pattFill','noFill','srgbClr','schemeClr','sysClr','prstClr','scrgbClr','hslClr','clrMap','clrMapOvr','fillRef','lnRef','fontRef']);
const ignored=new Set(['t','cNvSpPr','cNvPicPr','cNvGrpSpPr','cNvCxnSpPr','cNvGraphicFramePr','nvPr','extLst']);

/** Compare source appearance conservatively, without depending on mounted previews. */
export class AppearanceMatcher {
  /** @param {object} deck Loaded deck. @param {object} options Enabled size, colors and layout criteria (default: all). */
  constructor(deck,options={}) {this.deck=deck;this.options={size:true,colors:true,layout:true,...options};this.cache=new WeakMap();}

  /** @param {Element} node XML style/content node. @param {object} slide Owning slide. */
  canonical(node,slide) {
    if(!node || ignored.has(node.localName))return null;
    if(node.localName==='cNvPr') {
      const hidden=Array.from(node.attributes||[]).find(a=>a.localName==='hidden')?.value;
      return ['1','true'].includes(hidden)?['hidden']:null;
    }
    const attributes=Array.from(node.attributes||[]).filter(a=>!a.name.startsWith('xmlns')).map(a=>{
      let value=a.value;
      if(a.namespaceURI==='http://schemas.openxmlformats.org/officeDocument/2006/relationships') {
        const relationship=slide.relationships?.get(value);
        value=relationship&&!relationship.external?relationship.path:`${slide.path}#${value}`;
      }
      return [a.namespaceURI||'',a.localName||a.name,value];
    }).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const nested=children(node).map(n=>this.canonical(n,slide)).filter(Boolean);
    // Text content, object names and IDs do not determine appearance.
    if(!attributes.length&&!nested.length && ['r','p','txBody','nvSpPr','nvPicPr','nvGrpSpPr','nvCxnSpPr','nvGraphicFramePr'].includes(node.localName))return null;
    return [node.namespaceURI||'',node.localName,attributes,nested];
  }

  /** Project XML onto selected criteria. @param {Element} node Source XML. @param {object} slide Owning slide. */
  project(node,slide) {
    if(!node||ignored.has(node.localName))return null;
    const name=node.localName;
    if(name==='cNvPr')return this.canonical(node,slide);
    if(colorNodes.has(name))return this.options.colors?this.canonical(node,slide):null;
    if(['ext','chExt'].includes(name))return (name==='ext'?this.options.size:this.options.layout)?this.canonical(node,slide):null;
    if(['off','chOff','prstGeom','custGeom'].includes(name))return this.options.layout?this.canonical(node,slide):null;
    const nested=children(node).map(n=>this.project(n,slide)).filter(Boolean);
    const attrs=name==='xfrm'&&this.options.layout?Array.from(node.attributes||[]).filter(a=>['rot','flipH','flipV'].includes(a.localName)).map(a=>[a.localName,a.value]).sort():[];
    return nested.length||attrs.length?[name,attrs,nested]:null;
  }

  /** @param {object} element Current element descriptor. @param {object} slide Owning slide. */
  signature(element,slide) {
    if(this.cache.has(element))return this.cache.get(element);
    const canonical=(node,owner)=>this.project(node,owner);
    const inherited=(element.inherited||[]).map(node=>['spPr','style','txBody'].map(name=>canonical(child(node,name),slide))).filter(parts=>parts.some(Boolean));
    const context=[this.options.colors?(slide.themePath||null):null,descendants(slide.master,'clrMap')[0],descendants(slide.master,'txStyles')[0],
      descendants(slide.layout,'clrMapOvr')[0],descendants(slide.doc,'clrMapOvr')[0]];
    const signature=JSON.stringify([canonical(element.node,slide),inherited,
      context.map(value=>typeof value==='string'?value:canonical(value,slide))]);
    this.cache.set(element,signature);return signature;
  }

  /** @param {object} source Reference descriptor. @param {object} candidate Candidate descriptor.
   * @param {object} sourceSlide Reference slide. @param {object} candidateSlide Candidate slide. */
  matches(source,candidate,sourceSlide,candidateSlide) {
    if(!source?.g||!candidate?.g||source.hidden||candidate.hidden||source.kind!==candidate.kind)return false;
    if(!['x','y','w','h','rot'].every(key=>Number.isFinite(source.g[key])&&Number.isFinite(candidate.g[key])))return false;
    if(!Object.values(this.options).some(Boolean))return true;
    const geometryKeys=[...(this.options.size?sizeKeys:[]),...(this.options.layout?layoutKeys.filter(key=>source.kind==='grpSp'||!key.startsWith('ch')):[])];
    if(!geometryKeys.every(key=>(source.g[key]??0)===(candidate.g[key]??0)))return false;
    if(source===candidate)return true;
    if(!source.node||!candidate.node)return false;
    return this.signature(source,sourceSlide)===this.signature(candidate,candidateSlide);
  }
}
