import {children,child,descendants} from './core.js';

const geometryKeys=['x','y','w','h','rot','flipH','flipV','chX','chY','chW','chH'];
const ignored=new Set(['t','cNvSpPr','cNvPicPr','cNvGrpSpPr','cNvCxnSpPr','cNvGraphicFramePr','nvPr','extLst']);

/** Compare source appearance conservatively, without depending on mounted previews. */
export class AppearanceMatcher {
  /** @param {object} deck Loaded deck, including inherited styles and relationships. */
  constructor(deck) {this.deck=deck;this.cache=new WeakMap();}

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

  /** @param {object} element Current element descriptor. @param {object} slide Owning slide. */
  signature(element,slide) {
    if(this.cache.has(element))return this.cache.get(element);
    const inherited=(element.inherited||[]).map(node=>['spPr','style','txBody'].map(name=>this.canonical(child(node,name),slide)));
    const context=[slide.themePath||null,descendants(slide.master,'clrMap')[0],descendants(slide.master,'txStyles')[0],
      descendants(slide.layout,'clrMapOvr')[0],descendants(slide.doc,'clrMapOvr')[0]];
    const signature=JSON.stringify([this.canonical(element.node,slide),inherited,
      context.map(value=>typeof value==='string'?value:this.canonical(value,slide))]);
    this.cache.set(element,signature);return signature;
  }

  /** @param {object} source Reference descriptor. @param {object} candidate Candidate descriptor.
   * @param {object} sourceSlide Reference slide. @param {object} candidateSlide Candidate slide. */
  matches(source,candidate,sourceSlide,candidateSlide) {
    if(!source?.g||!candidate?.g||source.hidden||candidate.hidden||source.kind!==candidate.kind)return false;
    if(!['x','y','w','h','rot'].every(key=>Number.isFinite(source.g[key])&&Number.isFinite(candidate.g[key])))return false;
    if(!geometryKeys.every(key=>(source.g[key]??0)===(candidate.g[key]??0)))return false;
    if(source===candidate)return true;
    if(!source.node||!candidate.node)return false;
    return this.signature(source,sourceSlide)===this.signature(candidate,candidateSlide);
  }
}
