import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {LayoutPreferences} from '../services/LayoutPreferences.js';
import {useEditorValue} from '../hooks/useEditor.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {t} from '../i18n/I18n.js';

/**
 * Resize side panels without remounting the editor or changing PPTX data.
 * @param {object} props Stable left, center and right React panes; optional busy overrides the editor busy state.
 */
export function ResizableLayout({left,center,right,busy:busyOverride}) {
  useLanguage();
  const preferences=useMemo(()=>new LayoutPreferences(),[]);
  const [widths,setWidths]=useState(()=>preferences.load()),[containerWidth,setContainerWidth]=useState(0);
  const [dragging,setDragging]=useState(false),[saveFailed,setSaveFailed]=useState(false);
  const main=useRef(null),drag=useRef(null),raf=useRef(null);
  const editorBusy=useEditorValue('busy'),busy=busyOverride??editorBusy;
  const fitted=LayoutPreferences.fit(widths,containerWidth);
  function cancel() {
    const current=drag.current;if(!current)return;
    drag.current=null;cancelAnimationFrame(raf.current);raf.current=null;
    setWidths(current.preference);setDragging(false);
    if(current.target.hasPointerCapture(current.pointerId))current.target.releasePointerCapture(current.pointerId);
  }
  useLayoutEffect(()=>{
    const observer=new ResizeObserver(entries=>{cancel();setContainerWidth(entries[0].contentRect.width);});
    observer.observe(main.current);return ()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    window.addEventListener('blur',cancel);
    return ()=>{window.removeEventListener('blur',cancel);cancelAnimationFrame(raf.current);};
  },[]);
  function commit(next) {setWidths(next);setSaveFailed(!preferences.save(next));}
  function start(event,side) {
    const width=main.current.getBoundingClientRect().width;
    if(busy||event.button!==0||width<=850)return;
    event.preventDefault();event.currentTarget.focus();event.currentTarget.setPointerCapture(event.pointerId);
    drag.current={side,pointerId:event.pointerId,x:event.clientX,widths:LayoutPreferences.fit(widths,width),preference:widths,target:event.currentTarget};setDragging(true);
  }
  function move(event) {
    const current=drag.current;if(!current||event.pointerId!==current.pointerId)return;
    current.next=LayoutPreferences.resize(current.widths,current.side,event.clientX-current.x,main.current.getBoundingClientRect().width);
    if(raf.current===null)raf.current=requestAnimationFrame(()=>{raf.current=null;if(drag.current)setWidths(drag.current.next);});
  }
  function finish(event) {
    const current=drag.current;if(!current||event.pointerId!==current.pointerId)return;
    const next=LayoutPreferences.resize(current.widths,current.side,event.clientX-current.x,main.current.getBoundingClientRect().width);
    drag.current=null;cancelAnimationFrame(raf.current);raf.current=null;setDragging(false);commit(next);
    if(current.target.hasPointerCapture(event.pointerId))current.target.releasePointerCapture(event.pointerId);
  }
  function reset(side) {if(!busy)commit(LayoutPreferences.fit({...widths,[side]:LayoutPreferences.normalize(null)[side]},main.current.getBoundingClientRect().width));}
  function key(event,side) {
    if(event.key==='Escape'&&drag.current){event.preventDefault();event.stopPropagation();cancel();return;}
    if(busy||!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();
    if(event.key==='Home'){reset(side);return;}
    const width=main.current.getBoundingClientRect().width;
    commit(LayoutPreferences.resize(LayoutPreferences.fit(widths,width),side,(event.key==='ArrowLeft'?-1:1)*(event.shiftKey?40:10),width));
  }
  const separator=side=>{
    const limits=LayoutPreferences.limits(side,fitted,containerWidth);
    return <div className={`panel-resizer panel-resizer-${side}`} role="separator" tabIndex={busy?-1:0}
      aria-orientation="vertical" aria-label={t(`layout.resize.${side}`)} aria-valuemin={limits.min} aria-valuemax={limits.max}
      aria-valuenow={fitted[side]} aria-disabled={busy} title={t('layout.resize.help')}
      onPointerDown={event=>start(event,side)} onPointerMove={move} onPointerUp={finish}
      onPointerCancel={cancel} onLostPointerCapture={cancel} onDoubleClick={()=>reset(side)} onKeyDown={event=>key(event,side)}>
      <span aria-hidden="true"/>
    </div>;
  };
  return <main ref={main} className={`editor-layout${dragging?' layout-resizing':''}`}
    style={{'--sidebar-width':`${fitted.left}px`,'--inspector-width':`${fitted.right}px`}}>
    {left}{separator('left')}{center}{separator('right')}{right}
    {saveFailed&&<p className="layout-save-warning" role="status">{t('layout.resize.saveFailed')}</p>}
  </main>;
}
