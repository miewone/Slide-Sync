import {useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {t,locale} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {useEditor} from '../hooks/useEditor.js';

/** Header activity history, independent of slide/editor subscriptions. */
export function ActivityLogPanel() {
  const language=useLanguage(),{activityLog}=useEditor();
  const activity=useSyncExternalStore(activityLog.subscribe,activityLog.getSnapshot,activityLog.getSnapshot);
  const trigger=useRef(null),panel=useRef(null),[open,setOpen]=useState(false);
  const time=useMemo(()=>new Intl.DateTimeFormat(locale(),{hour:'2-digit',minute:'2-digit',second:'2-digit'}),[language]);
  useLayoutEffect(()=>{
    if(!open)return;
    const button=trigger.current,box=panel.current;
    const place=()=>{const rect=button.getBoundingClientRect();box.style.left=`${Math.max(12,Math.min(rect.right-box.offsetWidth,innerWidth-box.offsetWidth-12))}px`;box.style.top=`${Math.max(12,Math.min(rect.bottom+8,innerHeight-box.offsetHeight-12))}px`;};
    const keys=event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();box.hidePopover();button.focus();}};
    place();box.querySelector('#activity-log-close').focus();
    const observer=new ResizeObserver(place);observer.observe(box);observer.observe(button);
    box.addEventListener('keydown',keys);window.addEventListener('resize',place);document.addEventListener('scroll',place,true);
    return ()=>{observer.disconnect();box.removeEventListener('keydown',keys);window.removeEventListener('resize',place);document.removeEventListener('scroll',place,true);};
  },[open]);
  return <div className="activity-log">
    <button id="activity-log-trigger" className="activity-log-trigger" ref={trigger} type="button" popoverTarget="activity-log-panel" aria-haspopup="dialog" aria-expanded={open}
      aria-label={t('activity.open',{count:activity.total})} title={t('activity.open',{count:activity.total})}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M13 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6M7 7h6M7 11h4M7 15h3"/>
        <circle cx="17" cy="16" r="5"/><path d="M17 13v3l2 1"/>
      </svg>
      {activity.total>0&&<span key={activity.latestId} className="activity-log-count" style={activity.total>999?{fontSize:'8px'}:undefined} aria-hidden="true">{activity.total>999?'999+':activity.total}</span>}
    </button>
    <section id="activity-log-panel" ref={panel} popover="auto" role="dialog" aria-labelledby="activity-log-title" className="activity-log-panel"
      onToggle={event=>setOpen(event.newState==='open')}>
      <header><h2 id="activity-log-title">{t('activity.title')}</h2><span>{t('activity.count',{count:activity.total})}</span>
        <button id="activity-log-close" type="button" aria-label={t('activity.close')} onClick={()=>{panel.current.hidePopover();trigger.current.focus();}}>×</button></header>
      <p className="activity-log-help">{t('activity.help',{limit:activityLog.limit})}</p>
      <ol id="activity-log-list" role="log" aria-live={open?'polite':'off'} aria-relevant="additions" aria-label={t('activity.title')}>
        {[...activity.entries].reverse().map(entry=><li key={entry.id} data-activity-level={entry.level}>
          <div className="activity-log-meta"><span className={`activity-log-level ${entry.level}`}>{t(`activity.level.${entry.level}`)}</span><time dateTime={new Date(entry.time).toISOString()}>{time.format(entry.time)}</time></div>
          <p>{t(entry.key,entry.params)}</p>{entry.fileName&&<small>{entry.fileName}</small>}
        </li>)}
      </ol>
      {!activity.entries.length&&<p className="activity-log-empty">{t('activity.empty')}</p>}
      <footer><button id="activity-log-clear" type="button" disabled={!activity.total} onClick={()=>activityLog.clear()}>{t('activity.clear')}</button></footer>
    </section>
  </div>;
}
