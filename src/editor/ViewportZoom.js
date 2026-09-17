/** View-only zoom focused on one slide; grid layout and scroll position are restored on exit. */
export class ViewportZoom {
  /** @param {HTMLElement} stage Scrollable grid. @param {Function} onChange Receives zoom percentage and focused slide index. */
  constructor(stage,onChange){
    Object.assign(this,{stage,onChange,percent:100,focused:null,card:null,enabled:true,pointer:false,frame:0,wheelFrame:0});
    this.wheel=event=>{
      if(!this.enabled||!(event.ctrlKey||event.metaKey))return;event.preventDefault();if(this.pointer)return;
      const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?stage.clientHeight:1);
      this.pending=(this.pending??this.percent)*Math.exp(-delta*.002);this.point={x:event.clientX,y:event.clientY};
      if(!this.wheelFrame)this.wheelFrame=requestAnimationFrame(()=>{this.wheelFrame=0;const value=this.pending;this.pending=null;this.set(value,this.point);});
    };
    this.documentChange=()=>this.reset(false);stage.addEventListener('previewdocumentchange',this.documentChange);
    this.down=()=>{this.stopAnimation();this.pointer=true;};this.up=()=>{this.pointer=false;};
    stage.addEventListener('wheel',this.wheel,{passive:false});stage.addEventListener('pointerdown',this.down,true);window.addEventListener('pointerup',this.up,true);window.addEventListener('pointercancel',this.up,true);window.addEventListener('blur',this.up);
    this.observer=new ResizeObserver(()=>this.schedule());this.observer.observe(stage);
  }
  /** @param {number} value Requested percentage. */
  static clamp(value){return Number.isFinite(value)?Math.max(25,Math.min(400,Math.round(value))):100;}
  /** @param {object} options Document availability. */
  configure({enabled=true}){this.enabled=enabled;if(!enabled)this.reset(false);this.schedule();}
  /** Coalesce viewport/layout resize work. */
  schedule(){if(!this.frame)this.frame=requestAnimationFrame(()=>{this.frame=0;this.layout();});}
  /** Reflow only the focused card, with 100% corresponding to a single-slide fit. */
  layout(){
    if(this.focused===null)return;
    if(!this.card?.isConnected||this.card.hidden){this.reset(false);return;}
    const stage=this.stage,style=getComputedStyle(stage),w=stage.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),h=stage.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
    const fit=Math.max(80,Math.min(w,(h-36)*this.aspect)),width=fit*this.percent/100;
    stage.style.setProperty('--zoom-slide-width',`${width}px`);stage.dataset.zoom=String(this.percent);
  }
  /** @param {object} point Client coordinates. Locate the pointed card without scanning every slide on wheel events. */
  pick(point){
    const under=document.elementFromPoint(point.x,point.y)?.closest('.slide-card');
    if(under&&this.stage.contains(under)&&!under.hidden)return under;
    const r=this.stage.getBoundingClientRect();
    return [...this.stage.querySelectorAll('.slide-card:not([hidden])')].find(card=>{const b=card.getBoundingClientRect();return b.top<r.bottom&&b.bottom>r.top;});
  }
  /** @param {number} value Zoom %. @param {object|null} point Pointer location. Focus the pointed slide and keep that location stationary within scroll limits. */
  set(value,point=null){
    if(!this.enabled)return;
    const next=ViewportZoom.clamp(value);if(next===100){this.reset();return;}if(next===this.percent&&this.focused!==null)return;
    const stage=this.stage,r=stage.getBoundingClientRect(),p=point||{x:r.left+r.width/2,y:r.top+r.height/2};
    const card=this.card||this.pick(p);if(!card)return;
    const first=card.getBoundingClientRect();
    const surface=card.querySelector('.slide-surface'),before=surface.getBoundingClientRect(),u=(p.x-before.left)/before.width,v=(p.y-before.top)/before.height;
    this.stopAnimation();
    if(this.focused===null){
      const index=Number(card.id.match(/slide-(\d+)$/)?.[1]);if(!Number.isInteger(index))return;
      this.savedScroll={left:stage.scrollLeft,top:stage.scrollTop};this.card=card;this.focused=index;this.aspect=before.width/before.height;
      card.dataset.zoomActive='true';stage.dataset.zoomFocus=String(index);
    }
    this.percent=next;this.layout();
    const after=surface.getBoundingClientRect();stage.scrollLeft+=after.left+after.width*u-p.x;stage.scrollTop+=after.top+after.height*v-p.y;
    this.onChange(next,this.focused);stage.dispatchEvent(new CustomEvent('viewportzoom',{detail:{focus:this.focused}}));
    this.animate(card,first);
  }
  /** @param {boolean} animate Animate a user reset; document changes restore immediately. */
  reset(animate=true){
    const card=this.card,first=card?.getBoundingClientRect();this.stopAnimation();
    if(this.wheelFrame)cancelAnimationFrame(this.wheelFrame);this.wheelFrame=0;this.pending=null;
    if(this.card)delete this.card.dataset.zoomActive;this.card=null;this.focused=null;this.percent=100;
    delete this.stage.dataset.zoomFocus;this.stage.dataset.zoom='100';this.stage.style.removeProperty('--zoom-slide-width');
    if(this.savedScroll){this.stage.scrollLeft=this.savedScroll.left;this.stage.scrollTop=this.savedScroll.top;this.savedScroll=null;}
    this.onChange(100,null);this.stage.dispatchEvent(new CustomEvent('viewportzoom',{detail:{focus:null}}));
    if(animate&&card?.isConnected)this.animate(card,first);
  }
  /** Finish any previous compositor transition before editing or retargeting. */
  stopAnimation(){
    this.animation?.cancel();this.animation=null;
    if(this.animationCard)this.animationCard.style.willChange=this.previousWillChange||'';
    this.animationCard=null;delete this.stage.dataset.zoomAnimating;
  }
  /** Animate one card from its previous visual bounds to the final layout using only transforms. @param {HTMLElement} card Focused slide. @param {DOMRect} first Previous on-screen bounds. */
  animate(card,first){
    if(!card.animate||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const last=card.getBoundingClientRect();if(!first?.width||!first.height||!last.width||!last.height)return;
    const dx=first.left-last.left,dy=first.top-last.top,sx=first.width/last.width,sy=first.height/last.height;
    if(Math.abs(dx)+Math.abs(dy)+Math.abs(sx-1)+Math.abs(sy-1)<.001)return;
    this.animationCard=card;this.previousWillChange=card.style.willChange;card.style.willChange='transform';this.stage.dataset.zoomAnimating='true';
    const animation=card.animate([{transformOrigin:'0 0',transform:`translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`},{transformOrigin:'0 0',transform:'none'}],{duration:180,easing:'cubic-bezier(.2,.8,.2,1)'});
    this.animation=animation;animation.onfinish=()=>{if(this.animation===animation)this.stopAnimation();};
  }
  /** Remove all listeners and pending animation work on unmount. */
  dispose(){this.stopAnimation();if(this.frame)cancelAnimationFrame(this.frame);if(this.wheelFrame)cancelAnimationFrame(this.wheelFrame);this.observer.disconnect();this.stage.removeEventListener('previewdocumentchange',this.documentChange);this.stage.removeEventListener('wheel',this.wheel);this.stage.removeEventListener('pointerdown',this.down,true);window.removeEventListener('pointerup',this.up,true);window.removeEventListener('pointercancel',this.up,true);window.removeEventListener('blur',this.up);delete this.stage.dataset.zoomFocus;this.card?.removeAttribute('data-zoom-active');this.stage.style.removeProperty('--zoom-slide-width');}
}
