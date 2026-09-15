import {serialize} from './core.js';
import {guideSnapshot} from './guides.js';

/** Capture the inverse of an edit before restoring it, for symmetric undo and redo. */
export class EditHistorySnapshot {
  /** @param {object} deck Current deck. @param {object[]} snapshots Edit being restored. @param {Map<number,Set<string>>} selection Current selection across slides. */
  static capture(deck,snapshots,selection) {
    if(snapshots[0]?.type==='guides')return [guideSnapshot(deck)];
    return snapshots.map(({index,type,ids})=>{
      const slide=deck.slides[index];
      return {index,xml:serialize(slide.doc),dirty:slide.dirty,
        ...(type==='delete'?{type,ids:[...ids],selection:[...(selection.get(index)||[])]}:{})};
    });
  }
}
