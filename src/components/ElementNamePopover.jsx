import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

/**
 * Anchored, keyboard-accessible name catalogue rendered outside the scrolling inspector.
 * @param {object} props Input ref, stable id, catalogue rows, open state and pick/close callbacks.
 */
export function ElementNamePopover({anchorRef,id,items,open,onPick,onClose}) {
  useLanguage();
  const panelRef=useRef(null);
  const [position,setPosition]=useState(null);
  const [page,setPage]=useState({items:null,limit:100});
  const limit=page.items===items?page.limit:100;
  useLayoutEffect(()=>{
    if(!open)return;
    const anchor=anchorRef.current,panel=panelRef.current;
    if(!anchor || !panel)return;
    const place=()=>{
      const rect=anchor.getBoundingClientRect(),width=Math.min(320,window.innerWidth-24);
      if(!anchor.getClientRects().length || rect.bottom<0 || rect.top>window.innerHeight){onClose();return;}
      const leftSide=rect.left>=width+24;
      const height=Math.min(400,window.innerHeight-24);
      const left=leftSide?rect.left-width-12:Math.max(12,Math.min(rect.left,window.innerWidth-width-12));
      const top=leftSide?Math.max(12,Math.min(rect.top,window.innerHeight-height-12))
        :Math.max(12,Math.min(rect.bottom+8,window.innerHeight-height-12));
      setPosition({left,top,width,maxHeight:height,'--anchor-y':`${Math.max(12,rect.top+rect.height/2-top)}px`});
      panel.dataset.side=leftSide?'left':'below';
    };
    const outside=event=>{
      if(event.target!==anchor && !panel.contains(event.target))onClose();
    };
    const details=anchor.closest('details');
    const toggle=()=>{if(!details.open)onClose();};
    place();
    const observer=new ResizeObserver(place);observer.observe(anchor);
    window.addEventListener('resize',place);
    document.addEventListener('scroll',place,true);
    document.addEventListener('pointerdown',outside,true);
    document.addEventListener('focusin',outside);
    details?.addEventListener('toggle',toggle);
    return ()=>{
      observer.disconnect();window.removeEventListener('resize',place);
      document.removeEventListener('scroll',place,true);
      document.removeEventListener('pointerdown',outside,true);
      document.removeEventListener('focusin',outside);
      details?.removeEventListener('toggle',toggle);
    };
  },[open,anchorRef,onClose]);
  if(!open)return null;
  return createPortal(<aside id={id} ref={panelRef} role="dialog" aria-label={t('ElementNamePopover.1')}
    className="element-name-popover" style={position || {visibility:'hidden'}}
    onKeyDown={event=>{
      if(event.key==='Escape'){
        event.preventDefault();event.stopPropagation();anchorRef.current?.focus();onClose();
      }
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
        const buttons=[...panelRef.current.querySelectorAll('.element-name-item')];
        const index=buttons.indexOf(event.target);if(index<0)return;
        event.preventDefault();
        const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+(event.key==='ArrowDown'?1:-1)));
        buttons[next]?.focus();
      }
    }}>
    <div className="element-name-heading"><strong>{t('ElementNamePopover.2')}{items.length}</strong>
      <button type="button" aria-label={t('ElementNamePopover.3')} onClick={()=>{anchorRef.current?.focus();onClose();}}>×</button>
    </div>
    <p className="element-name-help">{t('ElementNamePopover.4')}</p>
    {items.length?<ul>{items.slice(0,limit).map(item=><li key={item.name}>
      <button type="button" className="element-name-item" onClick={()=>onPick(item.name)}>
        <span className="element-name-label">{item.name}</span>
        <span className="element-name-meta" title={t('ElementNamePopover.5', {p0: item.slides.map(index=>index+1).join(', ')})}>
          {item.count}{t('ElementNamePopover.6')}{item.slides.slice(0,8).map(index=>index+1).join(', ')}{item.slides.length>8?t('ElementNamePopover.7', {p0: item.slides.length-8}):''}
        </span>
      </button>
    </li>)}</ul>:<p className="element-name-empty">{t('ElementNamePopover.8')}</p>}
    {items.length>limit && <button type="button" className="element-name-more" onClick={()=>setPage({items,limit:limit+100})}>{t('ElementNamePopover.9')}{limit}/{items.length})
    </button>}
  </aside>,document.body);
}
