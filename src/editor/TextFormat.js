import {NS,child,children,serialize} from './core.js';
import {fitCandidates,textBoxInfo} from './text-fit.js';
import {localizedError} from '../i18n/I18n.js';

/** Whole-text-box formatting; preserves text, unrelated run properties and package parts. */
export class TextFormat {
  /** @param {object} deck Deck. @param {Set<number>} checked Scope. @param {Map} selection Selected IDs. */
  static candidates(deck,checked,selection) {
    return fitCandidates(deck,checked,selection,'selected').filter(({element})=>!element.hidden);
  }
  /** Read a uniform explicit value, or null for mixed/inherited formatting. @param {Element} body Text body. @param {string} attribute sz or b. */
  static value(body,attribute) {
    const runs=children(body).filter(n=>n.localName==='p').flatMap(p=>children(p).filter(n=>['r','fld'].includes(n.localName)));
    const values=runs.map(run=>child(run,'rPr')?.getAttribute(attribute)??null);
    return values.length&&values.every(value=>value===values[0])?values[0]:null;
  }
  /** Apply one property to eligible boxes and return slide snapshots for undo. @param {object[]} candidates Selected boxes. @param {object} patch size in points or bold boolean. */
  static apply(candidates,patch) {
    const {size,bold}=patch;
    if((size!==undefined&&(!Number.isFinite(size)||size<1||size>400))||(bold!==undefined&&typeof bold!=='boolean'))throw localizedError('textFormat.invalid');
    const attrs={...(size!==undefined?{sz:String(Math.round(size*100))}:{}),...(bold!==undefined?{b:bold?'1':'0'}:{})};
    if(!Object.keys(attrs).length)return [];
    const snapshots=new Map(),slides=new Map();
    for(const {slide,element} of candidates){
      const body=textBoxInfo(element)?.body;if(!body)continue;
      if(!snapshots.has(slide.index)){
        snapshots.set(slide.index,{index:slide.index,xml:serialize(slide.doc),dirty:slide.dirty});
        slides.set(slide.index,slide);
      }
      const ensure=(parent,name,first=false)=>{
        let node=child(parent,name);
        if(!node){node=slide.doc.createElementNS(NS.a,`a:${name}`);parent.insertBefore(node,first?parent.firstChild:child(parent,'extLst')||null);}
        return node;
      };
      for(const p of children(body).filter(n=>n.localName==='p')){
        const defaults=ensure(ensure(p,'pPr',true),'defRPr');
        const properties=[defaults,ensure(p,'endParaRPr')];
        for(const run of children(p).filter(n=>['r','fld','br'].includes(n.localName)))properties.push(ensure(run,'rPr',true));
        for(const props of properties)for(const [key,value] of Object.entries(attrs))props.setAttribute(key,value);
      }
    }
    return [...snapshots.values()].filter(snapshot=>{
      const slide=slides.get(snapshot.index);
      if(serialize(slide.doc)===snapshot.xml)return false;
      slide.dirty=true;
      return true;
    });
  }
  /** Capture original styles in clone-safe data attributes. @param {Element} mover Preview wrapper. @param {Element} body XML text body. @param {Element} text HTML text wrapper. */
  static capture(mover,body,text) {
    mover.dataset.formatSize=TextFormat.value(body,'sz')??'';
    mover.dataset.formatBold=TextFormat.value(body,'b')??'';
    for(const node of [text,...text.querySelectorAll('*')]){
      node.dataset.formatOriginalSize=node.style.fontSize;
      node.dataset.formatOriginalBold=node.style.fontWeight;
      node.dataset.formatOriginalFit=node.dataset.fitFont??'';
    }
  }
  /** Synchronize formatting before autofit scaling, including undo and cloned frames. @param {Element} mover Wrapper. @param {Element} body XML text body. @param {Element} text Text wrapper. */
  static sync(mover,body,text) {
    if(mover.dataset.formatSize===undefined)return;
    const size=TextFormat.value(body,'sz'),bold=TextFormat.value(body,'b');
    const changeSize=size!==null&&size!==mover.dataset.formatSize;
    const changeBold=bold!==null&&bold!==mover.dataset.formatBold;
    const pixels=Number(size)*127/Number(mover.dataset.unitsPerPixel)*Number(mover.dataset.originalFontScale||1);
    for(const node of [text,...text.querySelectorAll('*')]){
      node.style.fontSize=changeSize?`${pixels}px`:node.dataset.formatOriginalSize||'';
      node.style.fontWeight=changeBold?(['1','true'].includes(bold)?'700':'400'):node.dataset.formatOriginalBold||'';
      if(changeSize)node.dataset.fitFont=String(pixels);
      else if(node.dataset.formatOriginalFit)node.dataset.fitFont=node.dataset.formatOriginalFit;
      else delete node.dataset.fitFont;
    }
  }
}
