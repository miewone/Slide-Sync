import {child,children,descendants,parseXml} from './core.js';
import {PackageReader} from './PackageReader.js';

/** Resolve plain text-box fills, including inherited and theme colors, for width-fit filtering. */
export class TextBoxBackground {
  /** @param {object} deck Loaded PPTX deck; theme parts remain unchanged. */
  constructor(deck) {this.reader=new PackageReader(deck.zip,{parseXml});}

  /** @param {object[]} candidates Text-box descriptors. @returns {Promise<object[]>} Boxes with transparent or white fills; unresolved fills are excluded. */
  async filter(candidates) {
    const themes=new Map();
    await Promise.all([...new Set(candidates.map(({slide})=>slide.themePath))].map(async path=>themes.set(path,await this.reader.readDoc(path))));
    return candidates.filter(({slide,element})=>this.matches(element,slide,themes.get(slide.themePath)));
  }

  /** @param {object} element Shape descriptor. @param {object} slide Color-map context. @param {Document|null} theme Theme XML. @returns {boolean} Whether the effective fill is transparent or white. */
  matches(element,slide,theme) {
    const nodes=[element.node,...element.inherited||[]];
    let fill,reference;
    for(const node of nodes){
      fill=children(child(node,'spPr')).find(n=>['noFill','solidFill','gradFill','pattFill','blipFill','grpFill'].includes(n.localName));
      if(fill)break;
    }
    if(!fill){
      reference=nodes.map(node=>child(child(node,'style'),'fillRef')).find(Boolean);
      if(!reference)return true;
      const index=Number(reference.getAttribute('idx'));
      if(index===0||index===1000)return true;
      const list=descendants(theme,index>=1001?'bgFillStyleLst':'fillStyleLst')[0];
      fill=children(list)[index-(index>=1001?1001:1)];
    }
    if(fill?.localName==='noFill')return true;
    if(fill?.localName!=='solidFill')return false;
    const color=this.color(children(fill)[0],slide,theme,children(reference)[0]);
    return !!color&&(color.alpha===0||color.rgb.every(value=>value>=1-1e-8));
  }

  /** @param {Element} node DrawingML color. @param {object} slide Color maps. @param {Document} theme Theme XML. @param {Element} placeholder Style color. @param {number} depth Recursion guard. @returns {object|null} Normalized RGB and alpha, or null for unsupported colors. */
  color(node,slide,theme,placeholder,depth=0) {
    if(!node||depth>5)return null;
    let result;
    const value=node.getAttribute('val');
    if(node.localName==='schemeClr'){
      if(value==='phClr')result=this.color(placeholder,slide,theme,null,depth+1);
      else {
        const mapping=descendants(slide.doc,'overrideClrMapping')[0]||descendants(slide.layout,'overrideClrMapping')[0]||descendants(slide.master,'clrMap')[0];
        const name=mapping?.getAttribute(value)||({bg1:'lt1',bg2:'lt2',tx1:'dk1',tx2:'dk2'}[value])||value;
        result=this.color(children(child(descendants(theme,'clrScheme')[0],name))[0],slide,theme,null,depth+1);
      }
    }else{
      const hex=node.localName==='srgbClr'?value:node.localName==='sysClr'?node.getAttribute('lastClr'):node.localName==='prstClr'?({white:'FFFFFF',black:'000000'}[value]):null;
      if(hex&&/^[0-9a-f]{6}$/i.test(hex))result={rgb:[0,2,4].map(index=>parseInt(hex.slice(index,index+2),16)/255),alpha:1};
      else if(node.localName==='scrgbClr')result={rgb:['r','g','b'].map(key=>Number(node.getAttribute(key))/100000),alpha:1};
    }
    if(!result)return null;
    for(const transform of children(node)){
      const amount=Number(transform.getAttribute('val'))/100000;
      switch(transform.localName){
        case 'alpha':result.alpha=amount;break;
        case 'alphaMod':result.alpha*=amount;break;
        case 'alphaOff':result.alpha+=amount;break;
        case 'tint':result.rgb=result.rgb.map(c=>c+(1-c)*amount);break;
        case 'shade':result.rgb=result.rgb.map(c=>c*amount);break;
        default:return null;
      }
    }
    return result;
  }
}
