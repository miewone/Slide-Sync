import {SearchText} from './SearchText.js';

/** Index editable top-level objects by name and complete text, returning groups as one object. */
export class ElementSearchIndex {
  /** @param {object|null} deck Loaded deck; hidden and unresolved top-level elements are excluded. */
  constructor(deck=null) {
    this.entries=(deck?.slides || []).flatMap(slide=>slide.elements
      .filter(element=>element.g && !element.hidden)
      .map(element=>({index:slide.index,id:element.id,name:element.name || '',text:SearchText.normalize(ElementSearchIndex.text(element))})));
  }

  /** @param {object} element Descriptor. Ignore hidden children when aggregating group text. */
  static text(element) {
    if(element.hidden)return '';
    const parts=element.kind==='grpSp'
      ? (element.children || []).map(child=>ElementSearchIndex.text(child))
      : SearchText.paragraphs(element.node);
    return [element.name,...parts].join('\n');
  }

  /** @param {string} query Literal substring. @param {Set<number>} checked Active slide scope. */
  find(query,checked) {
    const normalized=SearchText.normalize(query);
    return normalized ? this.entries.filter(entry=>checked.has(entry.index) && entry.text.includes(normalized))
      .map(({index,id})=>({index,id})) : [];
  }

  /** @param {Set<number>} checked Active slides. Group existing names with element counts and slide indices. */
  names(checked) {
    const rows=new Map();
    for(const entry of this.entries) {
      if(!checked.has(entry.index) || !entry.name.trim())continue;
      if(!rows.has(entry.name))rows.set(entry.name,{name:entry.name,count:0,slides:new Set()});
      const row=rows.get(entry.name);row.count++;row.slides.add(entry.index);
    }
    return [...rows.values()].map(row=>({...row,slides:[...row.slides]}));
  }

  /** Release text when the editor is disposed. */
  clear() { this.entries=[]; }
}
