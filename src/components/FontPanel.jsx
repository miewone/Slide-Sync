import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {useState,useRef,useLayoutEffect,useEffect,useCallback} from 'react';
import {createPortal} from 'react-dom';
import {useEditor,useEditorValue} from '../hooks/useEditor.js';
import {FontCatalogue} from '../services/FontCatalogue.js';
import {Button} from './ui.jsx';

/** Original-first preview font controls; changing these never edits the PPTX package. */
export function FontPanel() {
  useLanguage();
  const {commands}=useEditor(),fonts=useEditorValue('fonts'),busy=useEditorValue('busy'),hasDeck=useEditorValue('hasDeck');
  const name=useEditorValue('name');
  const [query,setQuery]=useState(''),[open,setOpen]=useState(false),[position,setPosition]=useState(null),[drafts,setDrafts]=useState({});
  const anchorRef=useRef(null),panelRef=useRef(null),searchRef=useRef(null),actionFocusRef=useRef(null);
  const candidates=fonts.rows.filter(row=>row.originalUnavailable),issues=candidates.filter(row=>!row.applied),visible=hasDeck&&(issues.length>0||open);
  const rows=candidates.filter(row=>FontCatalogue.names(row.family).some(name=>FontCatalogue.key(name).includes(FontCatalogue.key(query))));
  const close=useCallback(()=>{setOpen(false);},[]);
  const closeAndFocus=()=>{
    const target=issues.length?anchorRef.current:[...(anchorRef.current?.closest('.workspace')?.querySelectorAll('.slide-surface')||[])].find(node=>node.getClientRects().length);
    close();target?.focus();
  };
  useEffect(()=>{setOpen(false);setQuery('');setDrafts({});},[name]);
  useEffect(()=>{if(!visible)setOpen(false);},[visible]);
  useLayoutEffect(()=>{
    if(!open){actionFocusRef.current=null;return;}
    if(!busy&&actionFocusRef.current){
      if(document.activeElement===document.body){const target=actionFocusRef.current.isConnected?actionFocusRef.current:panelRef.current?.querySelector('.font-panel-heading button');target?.focus();}
      actionFocusRef.current=null;
    }
  },[busy,open]);
  useLayoutEffect(()=>{
    if(!open||!visible)return;
    const anchor=anchorRef.current,panel=panelRef.current;
    const place=()=>{
      const rect=anchor.getBoundingClientRect(),width=Math.min(420,innerWidth-24),maxHeight=Math.min(520,innerHeight-24);
      setPosition({left:Math.max(12,Math.min(rect.left,innerWidth-width-12)),top:Math.max(12,Math.min(rect.bottom+8,innerHeight-maxHeight-12)),width,maxHeight});
    };
    const outside=event=>{if(!anchor.contains(event.target)&&!panel.contains(event.target))close();};
    place();const focusFrame=requestAnimationFrame(()=>searchRef.current?.focus());
    window.addEventListener('resize',place);document.addEventListener('scroll',place,true);document.addEventListener('pointerdown',outside,true);
    const observer=new ResizeObserver(place);observer.observe(anchor);
    return ()=>{cancelAnimationFrame(focusFrame);observer.disconnect();window.removeEventListener('resize',place);document.removeEventListener('scroll',place,true);document.removeEventListener('pointerdown',outside,true);};
  },[open,visible,close]);
  if(!visible)return null;
  return <>
    <button type="button" id="font-panel-toggle" className={`font-trigger${issues.length?'':' is-complete'}`} ref={anchorRef} disabled={busy} aria-haspopup="dialog" aria-expanded={open} aria-controls={open?'font-panel':undefined} onClick={()=>setOpen(value=>!value)}>{t(issues.length?'fonts.trigger':'fonts.complete',{count:issues.length})}</button>
    {open&&createPortal(<section id="font-panel" className="font-popover" ref={panelRef} role="dialog" aria-labelledby="font-panel-title" style={position||{visibility:'hidden'}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeAndFocus();}}}>
    <header className="font-panel-heading"><strong id="font-panel-title">{t('fonts.title')}</strong><button type="button" aria-label={t('fonts.close')} onClick={closeAndFocus}>×</button></header>
    <div className="font-panel-body">
      {busy?<p className="font-progress" role="status">{t('fonts.applying')}</p>:!issues.length&&<p className="font-complete" role="status">{t('fonts.allApplied')}</p>}
      <p>{t('fonts.policy')}</p>
      <div className="font-panel-tools">
        <input id="font-search" ref={searchRef} type="search" placeholder={t('fonts.search')} aria-label={t('fonts.search')} value={query} onChange={event=>setQuery(event.target.value)}/>
        {'queryLocalFonts' in globalThis&&<Button id="font-access-local" disabled={busy||!hasDeck} onClick={commands.accessLocalFonts}>{t('fonts.localAccess')}</Button>}
      </div>
      {fonts.error&&<p className="font-error" role="alert">{fonts.error}</p>}
      <div className="font-rows">
        {rows.map(row=><div className="font-row" key={row.key} data-font-name={row.family}>
          <div className="font-original"><strong>{row.family}</strong><small>{t('fonts.slides',{count:row.slides})}</small>
            {row.applied&&<strong className="font-applied-badge">{t('fonts.complete')}</strong>}
            <span>{[...new Set(row.variants.map(item=>t(`fonts.status.${item.status}`)))].join(' · ')}</span>
            {row.variants.some(item=>item.detail)&&<small className="font-error">{[...new Set(row.variants.map(item=>item.detail).filter(Boolean))].join(' · ')}</small>}
            <small>{row.variants.some(item=>item.available)?`${t('fonts.applied')}: ${[...new Set(row.variants.filter(item=>item.available).map(item=>item.label))].join(' · ')}`:t('fonts.browserFallback')}</small>
            {row.variants.some(item=>item.synthetic)&&<small>{t('fonts.synthetic')}</small>}
            {row.embeddedUnsupported&&<small>{t('fonts.embeddedUnsupported')}</small>}
            <span className="font-sample" style={{fontFamily:JSON.stringify(row.variants[0]?.previewFamily||row.family)}}>가나다 ABC 123</span>
          </div>
          <div className="font-choice">
            <select aria-label={t('fonts.choose',{name:row.family})} value={drafts[row.key]??row.choice} disabled={busy} onChange={event=>{const value=event.target.value;setDrafts(current=>({...current,[row.key]:value}));}}>
              <option value="">{t('fonts.original')}</option>
              {row.choice==='upload'&&<option value="upload">{t('fonts.uploaded')}</option>}
              {FontCatalogue.families.map(font=><option value={font.id} key={font.id}>{font.name}</option>)}
            </select>
            <Button className="font-apply" variant="primary" disabled={busy} onClick={event=>{
              actionFocusRef.current=event.currentTarget.closest('.font-row').querySelector('select');
              commands.choosePreviewFont(row.key,drafts[row.key]??row.choice);
            }}>{t(busy&&row.applying?'fonts.applyingShort':'fonts.apply')}</Button>
            <label className={`button font-file${busy?' disabled':''}`}>{t('fonts.file')}
              <input type="file" accept=".ttf,.otf,.woff,.woff2" disabled={busy} aria-label={t('fonts.fileFor',{name:row.family})} onChange={event=>{const file=event.target.files[0];event.target.value='';if(file){setDrafts(current=>{const next={...current};delete next[row.key];return next;});commands.uploadPreviewFont(row.key,file);}}}/>
            </label>
          </div>
          {!busy&&drafts[row.key]!==undefined&&(drafts[row.key]!==row.choice||!row.applied)&&<small className="font-pending-choice" role="status">{t('fonts.pendingChoice',{name:FontCatalogue.get(drafts[row.key])?.name||t('fonts.original')})}</small>}
        </div>)}
        {!rows.length&&<p>{t(hasDeck?'fonts.noMatches':'fonts.empty')}</p>}
      </div>
      <small>{t('fonts.catalogue')}: {FontCatalogue.families.map(font=>font.name).join(' · ')}</small>
    </div>
  </section>,document.body)}
  </>;
}
