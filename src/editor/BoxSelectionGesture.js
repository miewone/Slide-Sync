import {RangeSelection} from './RangeSelection.js';

/** Owns one cancellable range-selection gesture; selection commits only on release. */
export class BoxSelectionGesture {
  /**
   * @param {object} options Surface, slide dimensions (EMU), and preview/commit/click/end callbacks.
   * Callbacks receive plain geometry; no PPTX or selection state is owned by this class.
   */
  constructor({surface,width,height,onPreview,onCommit,onClick,onEnd}) {
    Object.assign(this,{surface,width,height,onPreview,onCommit,onClick,onEnd});
    this.active=null;this.scheduled=0;
    surface.addEventListener('pointermove',event=>this.move(event));
    surface.addEventListener('pointerup',event=>this.release(event));
    for(const type of ['pointercancel','lostpointercapture'])surface.addEventListener(type,event=>{
      if(this.active?.pointerId===event.pointerId)this.cancel();
    });
  }

  /** @param {PointerEvent} event Project pointer coordinates onto the bounded slide. */
  point(event) {
    const rect=this.surface.getBoundingClientRect();
    if(!rect.width || !rect.height)return null;
    const clamp=(value,max)=>Math.max(0,Math.min(max,value));
    return {x:clamp((event.clientX-rect.left)/rect.width*this.width,this.width),y:clamp((event.clientY-rect.top)/rect.height*this.height,this.height)};
  }

  /** @param {PointerEvent} event Primary pointerdown already routed by the editor. */
  begin(event) {
    const anchor=this.point(event);if(!anchor)return false;
    this.active={anchor,pointerId:event.pointerId,clientX:event.clientX,clientY:event.clientY,
      threshold:event.pointerType==='touch'?12:8,dragged:false,latest:event,
      additive:event.shiftKey||event.ctrlKey||event.metaKey};
    this.surface.classList.add('selecting');
    this.surface.setPointerCapture(event.pointerId);
    return true;
  }

  /** @param {PointerEvent} event Buffer pointer movement into one update per animation frame. */
  move(event) {
    const active=this.active;if(!active || active.pointerId!==event.pointerId)return;
    active.latest=event;
    if(Math.hypot(event.clientX-active.clientX,event.clientY-active.clientY)>=active.threshold)active.dragged=true;
    if(active.dragged && !this.scheduled)this.scheduled=requestAnimationFrame(()=>{
      this.scheduled=0;
      const current=this.active;if(!current)return;
      const end=this.point(current.latest);
      if(end)this.onPreview({rectangle:RangeSelection.rectangle(current.anchor,end),additive:current.additive});
    });
  }

  /** @param {PointerEvent} event Commit using the final pointer position, including a pending RAF. */
  release(event) {
    const active=this.active;if(!active || active.pointerId!==event.pointerId)return;
    const end=this.point(event);
    const distance=Math.hypot(event.clientX-active.clientX,event.clientY-active.clientY);
    const rectangle=end && RangeSelection.rectangle(active.anchor,end);
    const commit=rectangle && rectangle.w>0 && rectangle.h>0 && distance>=active.threshold;
    this.cancel();
    if(commit)this.onCommit({rectangle,additive:active.additive});
    else if(!active.dragged && distance<active.threshold)this.onClick({point:active.anchor,additive:active.additive});
  }

  /** Discard the draft on Escape, blur, scope change, lost capture, or unmount. */
  cancel() {
    const active=this.active;if(!active)return;
    this.active=null;
    if(this.scheduled)cancelAnimationFrame(this.scheduled);this.scheduled=0;
    this.surface.classList.remove('selecting');
    if(this.surface.hasPointerCapture(active.pointerId))this.surface.releasePointerCapture(active.pointerId);
    this.onEnd();
  }
}
