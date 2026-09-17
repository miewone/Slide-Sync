import {ViewportZoom} from '../editor/ViewportZoom.js';
import {useEffect,useRef,useState} from 'react';
import {useLanguage} from '../hooks/useLanguage.js';
import {t} from '../i18n/I18n.js';

/** Compact, view-only zoom controls. @param {object} props Zoom state/actions and optional ID prefix. */
export function ZoomControl({zoom,idPrefix=''}){
  useLanguage();const editing=useRef(false);const [draft,setDraft]=useState(String(zoom.percent));
  useEffect(()=>{if(!editing.current)setDraft(String(zoom.percent));},[zoom.percent]);
  const apply=()=>{editing.current=false;const value=Number(draft);if(draft.trim()&&Number.isFinite(value)){zoom.setPercent(value);setDraft(String(ViewportZoom.clamp(value)));}else setDraft(String(zoom.percent));};
  return <div className="zoom-control" hidden={!zoom.enabled||zoom.percent===100} role="group" aria-label={t('zoom.label')}>
    <select id={`${idPrefix}zoom-edit-scope`} aria-label={t('zoom.editScope')} disabled={!zoom.enabled||zoom.busy} value={zoom.editScope} onChange={e=>zoom.setEditScope(e.target.value)}><option value="selection">{t('zoom.scopeSelection')}</option><option value="page">{t('zoom.scopePage')}</option></select>
    <button id={`${idPrefix}zoom-out`} type="button" disabled={!zoom.enabled||zoom.percent<=25} aria-label={t('zoom.out')} onClick={()=>zoom.setPercent(zoom.percent-10)}>−</button>
    <label><input id={`${idPrefix}zoom-percent`} type="number" min="25" max="400" step="10" disabled={!zoom.enabled} value={draft} aria-label={t('zoom.percent')} title={t('zoom.help')} onChange={e=>{editing.current=true;setDraft(e.target.value);}} onBlur={apply} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}if(e.key==='Escape'){editing.current=false;setDraft(String(zoom.percent));}}}/><span>%</span></label>
    <button id={`${idPrefix}zoom-in`} type="button" disabled={!zoom.enabled||zoom.percent>=400} aria-label={t('zoom.in')} onClick={()=>zoom.setPercent(zoom.percent+10)}>+</button>
    <button id={`${idPrefix}zoom-reset`} type="button" disabled={!zoom.enabled||zoom.percent===100} aria-label={t('zoom.reset')} title={t('zoom.reset')} onClick={zoom.reset}>↺</button>
  </div>;
}
