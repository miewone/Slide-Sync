import {useEffect,useRef,useState} from 'react';
import {t} from '../i18n/I18n.js';

/** Bottom-left saved slide preview with bounded pointer/keyboard resizing. @param {object} props Container ref, active page, thumbnail URL, error and image failure callback. */
export function NativeSavedPreview({container,page,thumbnail,error,onImageError}){
  const panel=useRef(null),gesture=useRef(null);
  const [size,setSize]=useState({width:300,height:210});
  const fit=value=>{
    const maxWidth=Math.max(1,(container.current?.clientWidth||324)-24),maxHeight=Math.max(1,(container.current?.clientHeight||234)-24);
    return {width:Math.min(maxWidth,Math.max(Math.min(180,maxWidth),value.width)),height:Math.min(maxHeight,Math.max(Math.min(120,maxHeight),value.height))};
  };
  const cancel=()=>{const current=gesture.current;if(!current)return;gesture.current=null;setSize(fit(current.size));if(current.target.hasPointerCapture(current.id))current.target.releasePointerCapture(current.id);};
  useEffect(()=>{
    const observer=new ResizeObserver(()=>{cancel();setSize(previous=>fit(previous));});observer.observe(container.current);
    window.addEventListener('blur',cancel);
    return ()=>{observer.disconnect();window.removeEventListener('blur',cancel);gesture.current=null;};
  },[container]);
  const start=event=>{
    if(event.button!==0)return;event.preventDefault();event.currentTarget.focus();
    const rect=panel.current.getBoundingClientRect();
    gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,size:{width:rect.width,height:rect.height},target:event.currentTarget};
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move=event=>{
    const current=gesture.current;if(!current||event.pointerId!==current.id)return;
    setSize(fit({width:current.size.width+event.clientX-current.x,height:current.size.height+current.y-event.clientY}));
  };
  const finish=event=>{const current=gesture.current;if(!current||event.pointerId!==current.id)return;move(event);gesture.current=null;if(current.target.hasPointerCapture(current.id))current.target.releasePointerCapture(current.id);};
  return <section ref={panel} id="native-saved-preview" className="native-saved-preview" style={size} aria-labelledby="native-saved-preview-title" onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape'&&gesture.current){event.preventDefault();cancel();}}}>
    <header><h2 id="native-saved-preview-title">{t('drive.savedPreview')}</h2><span>{String(page+1).padStart(2,'0')}</span></header>
    <div className="native-saved-preview-body" aria-live="polite">
      {error?<p>{error}</p>:thumbnail?<img src={thumbnail} draggable={false} referrerPolicy="no-referrer" alt={t('drive.slidePreview',{n:page+1})} onError={onImageError}/>:<p>{t('drive.working')}</p>}
    </div>
    <button type="button" id="native-saved-preview-resize" className="native-saved-preview-resize" aria-label={t('native.resizeSavedPreview')} title={t('native.resizeSavedPreview')}
      onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={cancel}
      onKeyDown={event=>{
        const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[event.key];if(!delta)return;
        event.preventDefault();const step=event.shiftKey?40:10;setSize(previous=>fit({width:previous.width+delta[0]*step,height:previous.height+delta[1]*step}));
      }}><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" aria-hidden="true"><path d="M3 1h8v8M11 1 2 10"/></svg></button>
  </section>;
}
