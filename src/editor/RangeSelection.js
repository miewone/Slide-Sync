import {corners} from './core.js';

/** Pure slide-coordinate selection rules, independent of DOM and preview caches. */
export class RangeSelection {
  /** @param {object} start Start point in EMU. @param {object} end End point in EMU. */
  static rectangle(start, end) {
    return {x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),w:Math.abs(end.x-start.x),h:Math.abs(end.y-start.y)};
  }

  /**
   * Select complete rotated bounds; groups remain one editable element.
   * @param {object} element Slide-level element descriptor.
   * @param {object} rectangle Normalized selection bounds in EMU.
   */
  static contains(element, rectangle) {
    if(element.hidden || !element.g || rectangle.w<=0 || rectangle.h<=0)return false;
    const g=element.g;
    if(![g.x,g.y,g.w,g.h,g.rot].every(Number.isFinite))return false;
    const right=rectangle.x+rectangle.w,bottom=rectangle.y+rectangle.h;
    return corners(g).every(point=>point.x>=rectangle.x && point.x<=right && point.y>=rectangle.y && point.y<=bottom);
  }

  /**
   * Update only checked slides. Preserve unchecked selections and never mutate input sets.
   * @param {object} deck Loaded deck (slide-level elements only).
   * @param {Set<number>} checked Target slide indices, including unmounted slides.
   * @param {Map<number, Set<string>>} previous Remembered selections across scopes.
   * @param {object} rectangle Normalized EMU selection bounds.
   * @param {boolean} additive Retain previously selected elements on target slides.
   * @returns {Map<number, Set<string>>} New remembered selection, without changing XML/history.
   */
  static apply(deck, checked, previous, rectangle, additive=false) {
    const selection=new Map(previous);
    for(const index of checked) {
      const slide=deck.slides[index];if(!slide)continue;
      const ids=new Set(additive ? previous.get(index) : []);
      for(const element of slide.elements)if(this.contains(element,rectangle))ids.add(element.id);
      if(ids.size)selection.set(index,ids);else selection.delete(index);
    }
    return selection;
  }
}
