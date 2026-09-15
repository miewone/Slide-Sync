import {selectedInSlide,serialize,refreshSlide,restore} from './core.js';

/** Delete selected slide-level objects while preserving full XML for one-step undo. */
export class ElementDeletion {
  /**
   * Snapshot the entire batch before changing XML; groups are deleted as one object.
   * @param {object} deck Loaded PPTX deck.
   * @param {Map<number, Set<string>>} selection Active selection, already restricted to checked slides.
   * @returns {object[]} Per-slide XML snapshots and deleted IDs for history and selection restoration.
   */
  static apply(deck,selection) {
    const plans=[];
    for(const [index,ids] of selection) {
      const slide=deck.slides[index];
      const elements=selectedInSlide(slide,ids);
      if(!elements.length)continue;
      if(elements.some(element=>!element.node?.parentNode))throw Error('삭제할 요소의 원본을 찾지 못했습니다.');
      plans.push({slide,elements,snapshot:{type:'delete',index,xml:serialize(slide.doc),dirty:slide.dirty,ids:elements.map(element=>element.id)}});
    }
    const snapshots=plans.map(plan=>plan.snapshot);
    try {
      for(const {slide,elements} of plans) {
        for(const element of elements)element.node.parentNode.removeChild(element.node);
        slide.dirty=true;refreshSlide(slide);
      }
    } catch(error) {restore(deck,snapshots);throw error;}
    return snapshots;
  }
}
