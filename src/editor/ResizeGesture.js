/** Pointer resizing with independent local axes, fixed center, preview-only drafts and one commit. */
export class ResizeGesture {
  /** @param {object} options Surface, source geometry lookup, coordinate converter and preview/commit/end callbacks. */
  constructor({surface,source,point,onPreview,onCommit,onEnd,onError}){
    Object.assign(this,{surface,source,point,onPreview,onCommit,onEnd,onError});this.active=null;this.frame=0;
    this.listeners={pointerdown:e=>this.down(e),pointermove:e=>this.move(e),pointerup:e=>this.up(e),pointercancel:()=>this.cancel(),lostpointercapture:()=>this.cancel(),keydown:e=>{if(e.key==='Escape'&&this.active){e.preventDefault();e.stopImmediatePropagation();this.cancel();}}};
    for(const [name,fn] of Object.entries(this.listeners))surface.addEventListener(name,fn,true);
    this.blur=()=>this.cancel();window.addEventListener('blur',this.blur);
  }
  /** @param {object} g Geometry with degree rotation. Return corner and edge-midpoint handles. */
  static handles(g){
    const r=(g.rot||0)*Math.PI/180,c=Math.cos(r),s=Math.sin(r),cx=g.x+g.w/2,cy=g.y+g.h/2;
    return [[-1,-1],[1,-1],[1,1],[-1,1],[0,-1],[1,0],[0,1],[-1,0]].map(([hx,hy],index)=>({index,hx,hy,x:cx+c*hx*g.w/2-s*hy*g.h/2,y:cy+s*hx*g.w/2+c*hy*g.h/2}));
  }
  /** @param {object} g Source geometry. @param {number} handle Handle index. @param {object} delta Pointer displacement in slide coordinates. @param {boolean} uniform Preserve aspect ratio when Shift is held. */
  static factors(g,handle,delta,uniform=false){
    const {hx,hy}=this.handles(g)[handle],r=(g.rot||0)*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
    let sx=hx&&g.w?1+2*hx*(c*delta.x+s*delta.y)/g.w:1,sy=hy&&g.h?1+2*hy*(-s*delta.x+c*delta.y)/g.h:1;
    if(uniform){const scale=!hx?sy:!hy?sx:Math.abs(sx-1)>Math.abs(sy-1)?sx:sy;sx=sy=scale;}
    return {sx:Math.min(10,Math.max(.01,sx)),sy:Math.min(10,Math.max(.01,sy))};
  }
  /** @param {PointerEvent} event Start only on an enabled resize handle. */
  down(event){
    const handle=event.target.closest?.('[data-resize-handle]');if(!handle||event.button!==0||event.isPrimary===false)return;
    const source=this.source(handle);if(!source)return;
    event.preventDefault();event.stopImmediatePropagation();this.cancel();this.surface.focus({preventScroll:true});
    this.active={...source,handle:Number(handle.dataset.resizeHandle),pointerId:event.pointerId,start:this.point(event),clientX:event.clientX,clientY:event.clientY,factors:{sx:1,sy:1},moved:false};
    this.surface.setPointerCapture(event.pointerId);
  }
  /** @param {PointerEvent} event Update a draft without modifying source data. */
  move(event){
    const a=this.active;if(!a||event.pointerId!==a.pointerId)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(!a.moved&&Math.hypot(event.clientX-a.clientX,event.clientY-a.clientY)<3)return;a.moved=true;
    const p=this.point(event);a.factors=ResizeGesture.factors(a.g,a.handle,{x:p.x-a.start.x,y:p.y-a.start.y},event.shiftKey);
    if(!this.frame)this.frame=requestAnimationFrame(()=>{this.frame=0;if(this.active)try{this.onPreview(this.active.factors,this.active);}catch(error){this.cancel();this.onError?.(error);}});
  }
  /** @param {PointerEvent} event Commit once on release. */
  up(event){
    const a=this.active;if(!a||event.pointerId!==a.pointerId)return;
    this.move(event);event.preventDefault();event.stopImmediatePropagation();this.cancel();
    if(a.moved)try{this.onCommit(a.factors,a);}catch(error){this.onError?.(error);}
  }
  /** Discard the draft and release pointer capture. */
  cancel(){
    if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;
    const a=this.active;this.active=null;if(!a)return;
    this.onEnd();if(this.surface.hasPointerCapture(a.pointerId))this.surface.releasePointerCapture(a.pointerId);
  }
  /** Remove listeners and discard any active draft on unmount. */
  dispose(){this.cancel();for(const [name,fn] of Object.entries(this.listeners))this.surface.removeEventListener(name,fn,true);window.removeEventListener('blur',this.blur);}
}
