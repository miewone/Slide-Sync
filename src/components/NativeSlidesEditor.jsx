import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {Button} from './ui.jsx';
import {DriveSaveDialog} from './DriveSaveDialog.jsx';

/** Native Slides workspace. @param {object} props Native document, source metadata, Google adapters and close callback. */
export function NativeSlidesEditor({document:model,source:initialSource,files,session,onClose}){
  useLanguage();
  const root=useRef(null),cache=useRef(new Map()),alive=useRef(true);
  const [version,render]=useState(0),[source,setSource]=useState(initialSource),[page,setPage]=useState(0),[checked,setChecked]=useState(()=>new Set(model.original.slides.map((_,i)=>i))),[selected,setSelected]=useState(new Set()),[query,setQuery]=useState('');
  const [x,setX]=useState('0'),[y,setY]=useState('0'),[mode,setMode]=useState('relative'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[save,setSave]=useState(false),[saved,setSaved]=useState(false),[thumbnail,setThumbnail]=useState(null),[thumbnailError,setThumbnailError]=useState(''),[created,setCreated]=useState(null);
  const refresh=()=>render(v=>v+1);
  useEffect(()=>{
    alive.current=true;const app=window.document.querySelector('#app'),previous=window.document.activeElement,overflow=window.document.body.style.overflow;
    app.inert=true;window.document.body.style.overflow='hidden';root.current.focus();
    const unload=e=>{if(model.dirty){e.preventDefault();e.returnValue='';}};
    window.addEventListener('beforeunload',unload);
    return ()=>{alive.current=false;app.inert=false;window.document.body.style.overflow=overflow;window.removeEventListener('beforeunload',unload);previous?.focus();};
  },[model]);
  useEffect(()=>{
    let cancelled=false;const pageId=model.original.slides[page].objectId,key=`${source.id}:${pageId}:${model.original.revisionId}`;
    setThumbnail(null);setThumbnailError('');
    if(cache.current.has(key)){setThumbnail(cache.current.get(key));return;}
    files.thumbnail(source.id,pageId).then(result=>{
      const url=new URL(result.contentUrl);
      if(url.protocol!=='https:'||!(url.hostname==='googleusercontent.com'||url.hostname.endsWith('.googleusercontent.com')))throw new Error(t('drive.previewError'));
      if(!cancelled){cache.current.set(key,result.contentUrl);setThumbnail(result.contentUrl);}
    }).catch(()=>{if(!cancelled)setThumbnailError(t('drive.previewError'));});
    return ()=>{cancelled=true;};
  },[files,model,page,source.id,model.original.revisionId]);
  const perform=action=>{if(busy)return;setError('');setSaved(false);try{action();refresh();}catch(err){setError(err.message);}};
  const run=async action=>{setBusy(true);setError('');setCreated(null);try{await action();}catch(err){if(alive.current){setError(err.message);setCreated(err.createdFile||null);}}finally{if(alive.current)setBusy(false);}};
  const close=()=>{if(!busy&&(!model.dirty||window.confirm(t('drive.discard'))))onClose();};
  const elements=model.elements(page),matches=e=>!query.trim()||`${e.name} ${e.text}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const toggle=id=>setSelected(previous=>{const next=new Set(previous);next.has(id)?next.delete(id):next.add(id);return next;});
  const selectedCount=[...checked].reduce((n,index)=>n+model.elements(index).filter(e=>selected.has(e.id)&&!e.deleted).length,0);
  return createPortal(<div ref={root} tabIndex={-1} className="native-slides-editor" role="dialog" aria-modal="true" aria-labelledby="native-slides-title" data-version={version}
    onKeyDown={event=>{
      event.stopPropagation();
      if(event.key==='Escape'){event.preventDefault();close();}
      if(event.key==='Tab'){
        const focusable=[...root.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')].filter(e=>e.getClientRects().length);
        const first=focusable[0],last=focusable.at(-1),active=window.document.activeElement;
        if(event.shiftKey&&(active===first||active===root.current)){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&(active===last||active===root.current)){event.preventDefault();first?.focus();}
      }
    }}>
    <div className="native-heading"><h2 id="native-slides-title">{source.name} <small>Google Slides</small></h2>
      <div className="drive-actions"><Button id="native-connect" disabled={busy} onClick={()=>run(()=>session.authorize())}>{t('drive.connect')}</Button>
        <Button id="native-undo" disabled={busy||!model.undoStack.length} onClick={()=>perform(()=>model.undo())}>{t('drive.undo')}</Button>
        <Button id="native-redo" disabled={busy||!model.redoStack.length} onClick={()=>perform(()=>model.redo())}>{t('drive.redo')}</Button>
        <Button id="native-save" disabled={busy} variant="primary" onClick={()=>{setError('');setSave(true);}}>{t('drive.save')}</Button>
        <Button id="native-close" disabled={busy} onClick={close}>{t('drive.close')}</Button></div>
    </div>
    <p className="native-help">{t('drive.nativeHelp')}</p>
    <p role="status">{saved?t('drive.saved'):t('drive.pending',{count:model.changes.size})} · {t('drive.selected',{count:selectedCount})}</p>
    {error&&<p role="alert">{error}</p>}
    {created&&<p role="alert">{t('drive.copyCreated')} <a href={`https://docs.google.com/presentation/d/${encodeURIComponent(created.id)}/edit`} target="_blank" rel="noopener noreferrer">{created.name}</a></p>}
    <div className="native-columns">
      <aside className="native-pages" aria-label={t('drive.scope')}>
        <h3>{t('drive.scope')}</h3><Button disabled={busy} onClick={()=>setChecked(new Set(model.original.slides.map((_,i)=>i)))}>{t('drive.all')}</Button><Button disabled={busy} onClick={()=>setChecked(new Set())}>{t('drive.none')}</Button>
        {model.original.slides.map((slide,index)=><div key={slide.objectId} className="native-page-row">
          <input type="checkbox" aria-label={t('drive.checkSlide',{n:index+1})} checked={checked.has(index)} disabled={busy} onChange={event=>setChecked(previous=>{const next=new Set(previous);event.target.checked?next.add(index):next.delete(index);return next;})}/>
          <button className="button" type="button" disabled={busy} aria-current={page===index?'page':undefined} onClick={()=>setPage(index)}>{index+1}. {model.elements(index).find(e=>e.text)?.text.slice(0,35)||t('drive.slide')}</button>
        </div>)}
      </aside>
      <main className="native-preview">
        <h3>{t('drive.savedPreview')}</h3>
        {thumbnailError?<p>{thumbnailError}</p>:thumbnail?<img className="native-thumbnail" src={thumbnail} referrerPolicy="no-referrer" alt={t('drive.slidePreview',{n:page+1})} onError={()=>setThumbnailError(t('drive.previewError'))}/>:<p>{t('drive.working')}</p>}
        <h3>{t('drive.draftLayout')}</h3><p>{t('drive.layoutHelp')}</p>
        <svg className="native-layout" viewBox={`0 0 ${model.width} ${model.height}`} aria-label={t('drive.draftLayout')}>
          <rect width={model.width} height={model.height} fill="white"/>
          {elements.filter(e=>e.box&&!e.deleted).map(e=><g key={e.id} onClick={()=>{if(!busy)toggle(e.id);}} className="native-layout-object" data-object-id={e.id}>
            <rect x={e.box.x} y={e.box.y} width={Math.max(e.box.w,2)} height={Math.max(e.box.h,2)} fill={selected.has(e.id)?'#e3d9ff':'#eaf0f8'} fillOpacity="0.7" stroke={e.changed?'#b45309':'#586780'} strokeWidth={selected.has(e.id)?2:0.7} strokeDasharray={e.changed?'4 2':undefined}/>
            <text x={e.box.x+2} y={e.box.y+Math.min(e.box.h/2,12)} fontSize="9" fill="#223047">{e.name.slice(0,25)}</text>
          </g>)}
        </svg>
      </main>
      <aside className="native-tools"><fieldset disabled={busy}>
        <legend>{t('drive.edit')}</legend>
        <label htmlFor="native-search">{t('drive.search')}</label><input id="native-search" value={query} onChange={e=>setQuery(e.target.value)}/>
        <Button id="native-select-matches" onClick={()=>setSelected(previous=>{const next=new Set(previous);for(const index of checked)for(const e of model.elements(index))if(matches(e)&&!e.deleted)next.add(e.id);return next;})}>{t('drive.selectMatches')}</Button>
        <Button onClick={()=>setSelected(new Set())}>{t('drive.clearSelection')}</Button>
        <div className="native-elements">{elements.filter(matches).map(e=><label key={e.id} className={e.deleted?'native-deleted':''}>
          <input type="checkbox" data-native-element={e.id} disabled={e.deleted} checked={selected.has(e.id)} onChange={()=>toggle(e.id)}/><span>{e.name} <small>({e.kind}){e.deleted?` · ${t('drive.deleted')}`:''}</small></span>
        </label>)}</div>
        <label htmlFor="native-mode">{t('drive.moveMode')}</label><select id="native-mode" value={mode} onChange={e=>setMode(e.target.value)}><option value="relative">{t('drive.relative')}</option><option value="absolute">{t('drive.absolute')}</option></select>
        <div className="native-coordinates"><label>X (cm)<input id="native-x" type="number" step="0.1" value={x} onChange={e=>setX(e.target.value)}/></label><label>Y (cm)<input id="native-y" type="number" step="0.1" value={y} onChange={e=>setY(e.target.value)}/></label></div>
        <Button id="native-move" disabled={!selectedCount||!x.trim()||!y.trim()} onClick={()=>perform(()=>model.move(checked,selected,Number(x),Number(y),mode))}>{t('drive.move')}</Button>
        <h3>{t('drive.align')}</h3><div className="drive-actions">{['left','center','right','top','middle','bottom','horizontal','vertical'].map(action=><Button key={action} data-native-align={action} disabled={!selectedCount} onClick={()=>perform(()=>model.align(checked,selected,action))}>{t('drive.'+action)}</Button>)}</div>
        <Button id="native-delete" disabled={!selectedCount} onClick={()=>perform(()=>model.remove(checked,selected))}>{t('drive.delete')}</Button>
      </fieldset></aside>
    </div>
    {save&&<DriveSaveDialog source={source} title={source.name} session={session} busy={busy} error={error} createdFile={created} onClose={()=>setSave(false)} onSave={options=>run(async()=>{
      const target=await files.saveSlides(model,{...options,source});
      if(alive.current){setSource(target);setSave(false);setSaved(true);setSelected(new Set());cache.current.clear();refresh();}
    })}/>}
  </div>,window.document.body);
}
