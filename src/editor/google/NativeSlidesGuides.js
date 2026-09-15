import {localizedError} from '../../i18n/I18n.js';

/** App-local guides with undo and redo, independent of native Google objects. */
export class NativeSlidesGuides {
  /** Start a bounded editing session. Guides never become visible slide content on save. */
  constructor(){this.items=[];this.undoStack=[];this.redoStack=[];this.nextId=1;}
  /** @param {Function} action Mutate a cloned guide list as one undo step. */
  edit(action){const before=this.items;this.items=before.map(g=>({...g}));try{action();}catch(error){this.items=before;throw error;}if(JSON.stringify(before)!==JSON.stringify(this.items)){this.undoStack.push(before);if(this.undoStack.length>25)this.undoStack.shift();this.redoStack=[];}}
  /** @param {'x'|'y'} axis Axis. @param {number} pos Position in slide points. */
  add(axis,pos){if(!['x','y'].includes(axis)||!Number.isFinite(pos)||Math.abs(pos)>10000)throw localizedError('guides.1');this.edit(()=>{if(!this.items.some(g=>g.axis===axis&&g.pos===pos))this.items.push({id:`guide-${this.nextId++}`,axis,pos});});}
  /** @param {string} id Guide. @param {number} pos Position in points. */
  change(id,pos){if(!Number.isFinite(pos)||Math.abs(pos)>10000)throw localizedError('guides.1');this.edit(()=>{const guide=this.items.find(g=>g.id===id);if(guide)guide.pos=pos;});}
  /** @param {string} id Guide to remove. */
  remove(id){this.edit(()=>{this.items=this.items.filter(g=>g.id!==id);});}
  /** Restore the preceding guide state. */
  undo(){if(this.undoStack.length){this.redoStack.push(this.items);this.items=this.undoStack.pop();}}
  /** Restore the next guide state. */
  redo(){if(this.redoStack.length){this.undoStack.push(this.items);this.items=this.redoStack.pop();}}
}
