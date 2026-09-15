const LIMITS={left:{min:160,max:480,default:216},right:{min:220,max:480,default:278}};
const CENTER_MIN=300,HANDLES=12;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

/** Validated browser-local widths for the two side panels; the center fills the remainder. */
export class LayoutPreferences {
  /** @param {object} options Optional storage adapter for restricted browsers and tests. */
  constructor({storage}={}) {
    try{this.storage=storage===undefined?globalThis.localStorage:storage;}catch{this.storage=null;}
  }
  /** @param {object} value Untrusted saved settings. Return bounded pixel widths. */
  static normalize(value) {
    return Object.fromEntries(Object.entries(LIMITS).map(([side,range])=>[side,
      Number.isFinite(value?.[side])?Math.round(clamp(value[side],range.min,range.max)):range.default]));
  }
  /** Read saved widths, falling back to defaults for missing, corrupt or inaccessible storage. */
  load() {
    try{const saved=JSON.parse(this.storage?.getItem('slide-sync-panel-widths')||'null');return LayoutPreferences.normalize(saved?.version===1?saved:null);}
    catch{return LayoutPreferences.normalize(null);}
  }
  /** @param {object} widths User-committed sizes. Return whether persistence succeeded. */
  save(widths) {
    try{if(!this.storage)return false;this.storage.setItem('slide-sync-panel-widths',JSON.stringify({version:1,...LayoutPreferences.normalize(widths)}));return true;}
    catch{return false;}
  }
  /** @param {object} widths Preferred widths. @param {number} containerWidth Available layout pixels. */
  static fit(widths,containerWidth) {
    const preferred=this.normalize(widths),available=Math.max(LIMITS.left.min+LIMITS.right.min,containerWidth-CENTER_MIN-HANDLES);
    if(!containerWidth||preferred.left+preferred.right<=available)return preferred;
    const flexible=preferred.left-LIMITS.left.min+preferred.right-LIMITS.right.min;
    const ratio=(available-LIMITS.left.min-LIMITS.right.min)/(flexible||1);
    return {left:Math.floor(LIMITS.left.min+(preferred.left-LIMITS.left.min)*ratio),right:Math.floor(LIMITS.right.min+(preferred.right-LIMITS.right.min)*ratio)};
  }
  /** @param {object} widths Visible sizes. @param {string} side Divider side. @param {number} delta Pointer displacement. @param {number} containerWidth Layout pixels. */
  static resize(widths,side,delta,containerWidth) {
    const current=this.fit(widths,containerWidth),limits=this.limits(side,current,containerWidth);
    return {...current,[side]:Math.round(clamp(current[side]+(side==='left'?delta:-delta),limits.min,limits.max))};
  }
  /** @param {string} side Side panel. @param {object} widths Visible sizes. @param {number} containerWidth Layout pixels. */
  static limits(side,widths,containerWidth) {
    const range=LIMITS[side],other=side==='left'?'right':'left';
    return {...range,max:Math.max(range.min,Math.min(range.max,containerWidth-CENTER_MIN-HANDLES-widths[other]))};
  }
}
