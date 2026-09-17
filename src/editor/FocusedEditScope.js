/** Derive an editing scope without changing remembered slide checks or selections. */
export class FocusedEditScope {
  /** Cache the derived Set so search and control subscriptions remain stable. */
  constructor(){this.checked=null;this.focused=null;this.mode=null;this.result=null;}
  /** @param {Set<number>} checked Remembered checked slides. @param {number|null} focused Enlarged page. @param {string} mode page or selection. */
  resolve(checked,focused,mode){
    if(focused===null||mode!=='page')return checked;
    if(this.checked!==checked||this.focused!==focused||this.mode!==mode){this.checked=checked;this.focused=focused;this.mode=mode;this.result=new Set(checked.has(focused)?[focused]:[]);}
    return this.result;
  }
}
