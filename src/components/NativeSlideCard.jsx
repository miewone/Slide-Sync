import {useEffect,useRef,useState} from 'react';
import {NativeSlidesCanvas} from './NativeSlidesCanvas.jsx';
import {t} from '../i18n/I18n.js';

/** Lazy native preview using the existing slide-card visual structure. @param {object} props Page index, scope and shared canvas callbacks. */
export function NativeSlideCard({index,active,onActivate,onCheck,renderPreview=true,editChecked,...canvas}){
  const host=useRef(null),[visible,setVisible]=useState(false);
  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting),{rootMargin:'300px'});observer.observe(host.current);return ()=>observer.disconnect();
  },[]);
  return <article ref={host} id={`native-slide-${index}`} className={`slide-card${canvas.checked.has(index)?'':' inactive'}${active?' native-active-card':''}`} onFocusCapture={()=>onActivate(index)} onPointerDownCapture={()=>onActivate(index)}>
    <div className="card-head"><label><input type="checkbox" checked={canvas.checked.has(index)} disabled={canvas.busy} onChange={e=>onCheck(index,e.target.checked)}/>{t('drive.slide')} {String(index+1).padStart(2,'0')}</label><span className="card-badge">{t(canvas.checked.has(index)?'createEditorRuntime.36':'sidebar.excluded')}</span></div>
    <div className="slide-surface native-slide-surface" style={{aspectRatio:`${canvas.model.width} / ${canvas.model.height}`}}>
      {visible&&renderPreview?<NativeSlidesCanvas {...canvas} checked={editChecked||canvas.checked} page={index}/>:<div className="preview-pending">{t('drive.working')}</div>}
    </div>
  </article>;
}
