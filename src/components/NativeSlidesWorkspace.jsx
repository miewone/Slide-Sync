import {SimilarSelectionMenu} from './SimilarSelectionMenu.jsx';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {t,i18n} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {Button,Checkbox,InspectorSection,SelectField,NumberField} from './ui.jsx';
import {ResizableLayout} from './ResizableLayout.jsx';
import {PreviewGridControl} from './PreviewGridControl.jsx';
import {NativeSlideCard} from './NativeSlideCard.jsx';
import {NativeSavedPreview} from './NativeSavedPreview.jsx';
import {NativeSlidesMediaContext} from './NativeSlidesImage.jsx';
import {NativeSlidesMedia} from '../services/google/NativeSlidesMedia.js';
import {alignmentGroups,distributionActions} from '../editor/layout-options.js';
import {DriveSaveDialog} from './DriveSaveDialog.jsx';
import {NativeSlidesTools} from './NativeSlidesTools.jsx';
import {NativeSlidesGuides} from '../editor/google/NativeSlidesGuides.js';
import {NativeSlidesSelection} from '../editor/google/NativeSlidesSelection.js';
import {parseRange} from '../editor/core.js';

/** Native Slides workspace. @param {object} props Native document, source metadata, Google adapters and close callback. */
export default function NativeSlidesWorkspace({document:model,source:initialSource,files,session,onClose}){
  useLanguage();
  const renderContainer=useRef(null),stage=useRef(null),root=useRef(null),cache=useRef(new Map()),alive=useRef(true);
  const [version,render]=useState(0),[source,setSource]=useState(initialSource),[page,setPage]=useState(0),[checked,setChecked]=useState(()=>new Set(model.original.slides.map((_,i)=>i))),[selected,setSelected]=useState(new Set()),[query,setQuery]=useState('');
  const [x,setX]=useState('0'),[y,setY]=useState('0'),[mode,setMode]=useState('relative'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[save,setSave]=useState(false),[saved,setSaved]=useState(false),[thumbnail,setThumbnail]=useState(null),[thumbnailError,setThumbnailError]=useState(''),[created,setCreated]=useState(null);
  const [target,setTarget]=useState('selection'),[slideQuery,setSlideQuery]=useState(''),[range,setRange]=useState(''),[onlyChecked,setOnlyChecked]=useState(false),[onlySelected,setOnlySelected]=useState(false);
  const [grid,setGrid]=useState({columns:null,rows:null}),[boxSelect,setBoxSelect]=useState(false),[toolbarHost,setToolbarHost]=useState(null);
  const [fontOverrides,setFontOverrides]=useState(new Map());
  const [guides]=useState(()=>new NativeSlidesGuides()),[showGuides,setShowGuides]=useState(true),[snap,setSnap]=useState(true);
  const media=useMemo(()=>new NativeSlidesMedia(files,model,source.id),[files,model,source.id,model.original.revisionId]);
  useEffect(()=>{media.activate();return ()=>media.dispose();},[media]);
  const refresh=()=>render(v=>v+1);
  useEffect(()=>{
    const element=stage.current;if(grid.rows===null){element.style.removeProperty('--preview-row-height');return;}
    const resize=()=>{const style=getComputedStyle(element),available=element.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom),gap=parseFloat(style.rowGap)||0;element.style.setProperty('--preview-row-height',`${Math.max(80,(available-gap*(grid.rows-1))/grid.rows)}px`);};
    const observer=new ResizeObserver(resize);observer.observe(element);resize();return ()=>observer.disconnect();
  },[grid.rows]);
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
  const run=async action=>{setBusy(true);setError('');setCreated(null);try{await action();if(alive.current)refresh();}catch(err){if(alive.current){setError(err.message);setCreated(err.createdFile||null);}}finally{if(alive.current)setBusy(false);}};
  const close=()=>{if(!busy&&(!model.dirty||window.confirm(t('drive.discard'))))onClose();};
  const elements=model.elements(page),matches=e=>NativeSlidesSelection.matches(e,query);
  const matchingSlides=new Set(model.findSlides(slideQuery));
  const toggle=id=>setSelected(previous=>{const next=new Set(previous);next.has(id)?next.delete(id):next.add(id);return next;});
  const selectedCount=[...checked].reduce((n,index)=>n+model.elements(index).filter(e=>selected.has(e.id)&&!e.deleted).length,0);
  const checkSlide=(index,value)=>setChecked(previous=>{const next=new Set(previous);value?next.add(index):next.delete(index);return next;});
  const activate=index=>{setPage(index);root.current.querySelector(`#native-slide-${index}`)?.scrollIntoView({block:'nearest'});};
  const visibleSlide=index=>(!onlyChecked||checked.has(index))&&(!onlySelected||model.elements(index).some(e=>selected.has(e.id)&&!e.deleted))&&(!slideQuery.trim()||matchingSlides.has(index));
  const left=<aside className="sidebar native-pages" aria-label={t('drive.scope')}>
    <div className="sidebar-head"><h2>{t('Sidebar.2')}</h2><span className="count">{model.original.slides.length}</span></div>
    <div className="scope-actions"><button type="button" className="text-button" disabled={busy} onClick={()=>setChecked(new Set(model.original.slides.map((_,i)=>i)))}>{t('Sidebar.3')}</button><button type="button" className="text-button" disabled={busy} onClick={()=>setChecked(new Set())}>{t('Sidebar.4')}</button></div>
    <label className="range-label" htmlFor="native-range">{t('Sidebar.5')}</label><div className="range-control"><input id="native-range" disabled={busy} value={range} onChange={e=>setRange(e.target.value)} placeholder={t('Sidebar.6')}/><Button id="native-apply-range" className="compact" disabled={busy} onClick={()=>perform(()=>setChecked(parseRange(range,model.original.slides.length)))}>{t('native.apply')}</Button></div>
    <div className="slide-search"><label className="range-label" htmlFor="native-slide-search">{t('native.slideSearch')}</label><input id="native-slide-search" disabled={busy} value={slideQuery} onChange={e=>setSlideQuery(e.target.value)}/><Button id="native-check-matches" disabled={busy||!slideQuery.trim()} onClick={()=>setChecked(matchingSlides)}>{t('native.checkMatches')}</Button></div>
    <div className="slide-list">{model.original.slides.map((slide,index)=>visibleSlide(index)&&<div key={slide.objectId} className={`native-page-row slide-item${checked.has(index)?' checked':''}`}>
      <input type="checkbox" aria-label={t('drive.checkSlide',{n:index+1})} checked={checked.has(index)} disabled={busy} onChange={event=>checkSlide(index,event.target.checked)}/>
      <button className="native-slide-link slide-item-body" type="button" disabled={busy} aria-current={page===index?'page':undefined} onClick={()=>activate(index)}><span className="slide-item-heading"><span className="slide-number">{String(index+1).padStart(2,'0')}</span><span className="slide-scope-state">{t(checked.has(index)?'createEditorRuntime.36':'sidebar.excluded')}</span></span><span className="slide-label">{model.elements(index).find(e=>e.text)?.text.slice(0,80)||t('drive.slide')}</span></button>
    </div>)}</div>
    <InspectorSection title={t('SelectionPanel.1')}><button type="button" id="native-clear-selection" className="text-button" disabled={busy} onClick={()=>setSelected(new Set())}>{t('SelectionPanel.2')}</button>
      <div className="native-elements">{elements.filter(matches).map(e=><label key={e.id} className={e.deleted?'native-deleted':''}><input type="checkbox" data-native-element={e.id} disabled={busy||e.deleted} checked={selected.has(e.id)} onChange={()=>toggle(e.id)}/><span>{e.name}<small> ({e.kind})</small></span></label>)}</div>
    </InspectorSection><div className="sidebar-bottom">{t('Sidebar.9')}</div>
  </aside>;
  const center=<section className="workspace native-preview">
    <div className="workspace-bar"><div className="workspace-heading"><div className="workspace-title-row"><h1 id="native-slides-title">{source.name}</h1><PreviewGridControl idPrefix="native-" grid={grid} disabled={busy} onChange={setGrid}/></div><p>{model.original.slides.length} {t('drive.slide')} · Google Slides</p></div>
      <div ref={setToolbarHost} className="native-format-slot"/>
      <div className="view-option workspace-options"><Checkbox id="native-box-select-mode" variant="chip" label={t('Help.3')} checked={boxSelect} disabled={busy} onChange={e=>setBoxSelect(e.target.checked)}/><Checkbox variant="chip" label={t('Help.7')} checked={onlyChecked} disabled={busy} onChange={e=>setOnlyChecked(e.target.checked)}/><Checkbox variant="chip" label={t('view.selectedElementsOnly')} checked={onlySelected} disabled={busy} onChange={e=>setOnlySelected(e.target.checked)}/></div>
    </div>
    {error&&<p className="notice" role="alert">{error}</p>}
    {created&&<p className="notice" role="alert">{t('drive.copyCreated')} <a href={`https://docs.google.com/presentation/d/${encodeURIComponent(created.id)}/edit`} target="_blank" rel="noopener noreferrer">{created.name}</a></p>}
    <div ref={renderContainer} className="native-render-container">
    <div ref={stage} className={`stage native-stage${grid.columns===null?'':' preview-grid'}`} style={{'--preview-columns':grid.columns||2,'--slide-aspect':model.width/model.height}}>
      {model.original.slides.map((slide,index)=>visibleSlide(index)&&<NativeSlideCard key={slide.objectId} index={index} active={page===index} onActivate={setPage} onCheck={checkSlide} model={model} checked={checked} setChecked={setChecked} selected={selected} setSelected={setSelected} perform={perform} busy={busy||save} guides={guides} showGuides={showGuides} snap={snap} version={version} fontOverrides={fontOverrides} boxSelect={boxSelect}/>)}
    </div>
      <NativeSavedPreview container={renderContainer} page={page} thumbnail={thumbnail} error={thumbnailError} onImageError={()=>setThumbnailError(t('drive.previewError'))}/>
    </div>
    <footer className="statusbar"><span role="status">{saved?t('drive.saved'):t('drive.pending',{count:model.changes.size})} · {t('drive.selected',{count:selectedCount})}</span><span>{(model.width*2.54/72).toFixed(2)} × {(model.height*2.54/72).toFixed(2)} cm</span></footer>
  </section>;
  const right=<aside className="inspector native-tools"><h2>{t('Inspector.1')}</h2><div className="native-selection-summary"><strong>{selectedCount}</strong><span>{t('drive.selected',{count:selectedCount})}</span></div>
    <fieldset disabled={busy}>
      <div className="history-controls"><Button id="native-delete" variant="danger" disabled={!selectedCount} title={t('drive.delete')} onClick={()=>perform(()=>model.remove(checked,selected))}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></Button><Button id="native-undo" disabled={!model.undoStack.length} title={t('drive.undo')} onClick={()=>perform(()=>model.undo())}>↶</Button><Button id="native-redo" disabled={!model.redoStack.length} title={t('drive.redo')} onClick={()=>perform(()=>model.redo())}>↷</Button></div>
      <InspectorSection title={t('drive.search')}><label className="field-label" htmlFor="native-search">{t('drive.search')}</label><input id="native-search" value={query} onChange={e=>setQuery(e.target.value)}/><Button id="native-select-matches" full onClick={()=>setSelected(previous=>{const next=new Set(previous);for(const index of checked)for(const e of model.elements(index))if(matches(e)&&!e.deleted)next.add(e.id);return next;})}>{t('drive.selectMatches')}</Button></InspectorSection>
      <InspectorSection title={t('LayoutPanel.3')}><SelectField id="native-layout-target" label={t('LayoutPanel.4')} value={target} onChange={e=>setTarget(e.target.value)} options={[{value:'selection',label:t('LayoutPanel.1')},{value:'slide',label:t('LayoutPanel.2')}]}/>
        {alignmentGroups().map(group=><div className="alignment-group" key={group.label}><h3>{group.label}</h3><div className="align-grid">{group.actions.map(([action,label])=><Button key={action} data-native-align={action} disabled={!selectedCount} onClick={()=>perform(()=>model.align(checked,selected,action,target))}>{label}</Button>)}</div></div>)}
        <details className="spacing-options"><summary>{t('LayoutPanel.6')}</summary><div className="distribute-grid">{distributionActions().map(([action,label])=><Button key={action} data-native-align={action} disabled={!selectedCount} onClick={()=>perform(()=>model.align(checked,selected,action,target))}>{label}</Button>)}</div></details>
      </InspectorSection>
      <InspectorSection title={t('MovePanel.1')}><SelectField id="native-mode" label={t('MovePanel.3')} value={mode} onChange={e=>setMode(e.target.value)} options={[{value:'relative',label:t('MovePanel.5')},{value:'absolute',label:t('MovePanel.4')}]}/><div className="coordinates"><NumberField id="native-x" label="X (cm)" value={x} onChange={e=>setX(e.target.value)}/><NumberField id="native-y" label="Y (cm)" value={y} onChange={e=>setY(e.target.value)}/></div><Button id="native-move" variant="primary" full disabled={!selectedCount||!x.trim()||!y.trim()} onClick={()=>perform(()=>model.move(checked,selected,Number(x),Number(y),mode))}>{t('MovePanel.7')}</Button><p className="field-help">{t('drive.layoutHelp')}</p></InspectorSection>
      <NativeSlidesTools busy={busy||save} toolbarHost={toolbarHost} fontOverrides={fontOverrides} setFontOverrides={setFontOverrides} model={model} checked={checked} selected={selected} setSelected={setSelected} perform={perform} run={action=>run(async()=>{await action();setSaved(false);})} guides={guides} showGuides={showGuides} setShowGuides={setShowGuides} snap={snap} setSnap={setSnap}/>

    </fieldset>
  </aside>;
  return createPortal(<NativeSlidesMediaContext.Provider value={media}><div ref={root} tabIndex={-1} className="native-slides-editor" role="dialog" aria-modal="true" aria-labelledby="native-slides-title" data-version={version}
    onKeyDown={event=>{
      event.stopPropagation();
      if(!busy&&!save&&!event.target.closest('input,textarea,select,[contenteditable=true]')){
        const modifier=event.ctrlKey||event.metaKey,key=event.key.toLowerCase();
        if(modifier&&key==='z'){event.preventDefault();perform(()=>event.shiftKey?model.redo():model.undo());return;}
        if(modifier&&key==='y'){event.preventDefault();perform(()=>model.redo());return;}
        if(modifier&&key==='a'){event.preventDefault();setSelected(previous=>{const next=new Set(previous);for(const i of checked)for(const e of model.elements(i))if(!e.deleted)next.add(e.id);return next;});return;}
        if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();perform(()=>model.remove(checked,selected));return;}
        const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
        if(direction){event.preventDefault();const step=event.shiftKey?1:0.1;perform(()=>model.move(checked,selected,direction[0]*step,direction[1]*step));return;}
      }
      if(event.key==='Escape'){event.preventDefault();close();}
      if(event.key==='Tab'){
        const focusable=[...root.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')].filter(e=>e.getClientRects().length);
        const first=focusable[0],last=focusable.at(-1),active=window.document.activeElement;
        if(event.shiftKey&&(active===first||active===root.current)){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&(active===last||active===root.current)){event.preventDefault();first?.focus();}
      }
    }}>
    <header className="topbar"><div className="brand">
      <a className="brand-icon" href="https://github.com/miewone/Slide-Sync" target="_blank" rel="noopener noreferrer"
        aria-label={t('Header.1')}><svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/>
        </svg></a>
      <div className="brand-info">
        <div className="brand-title"><strong>{t('Header.2')}</strong><span className="beta">Google Slides</span></div>
        <a className="developer-email" href="mailto:dlsrk489@gmail.com">{t('Header.4')}</a>
      </div>
    </div><div className="header-actions"><div className="language-control" role="group" aria-label={t('language.label')}>{['ko','en'].map(language=><button key={language} type="button" id={`native-language-${language}`} lang={language} disabled={busy} aria-pressed={i18n.getLanguage()===language} onClick={()=>i18n.setLanguage(language)}>{t(language==='ko'?'language.korean':'language.english')}</button>)}</div><Button id="native-connect" disabled={busy} onClick={()=>run(()=>session.authorize())}>{t('drive.connect')}</Button><Button id="native-close" disabled={busy} onClick={close}>{t('drive.close')}</Button><Button id="native-save" disabled={busy} variant="primary" onClick={()=>{setError('');setSave(true);}}>{t('drive.save')}</Button></div></header>
    <SimilarSelectionMenu root={root}/>
    <ResizableLayout left={left} center={center} right={right} busy={busy||save}/>
    {save&&<DriveSaveDialog source={source} title={source.name} session={session} busy={busy} error={error} createdFile={created} onClose={()=>setSave(false)} onSave={options=>run(async()=>{
      const target=await files.saveSlides(model,{...options,source});
      if(alive.current){setSource(target);setSave(false);setSaved(true);setSelected(new Set());cache.current.clear();refresh();}
    })}/>}
  </div></NativeSlidesMediaContext.Provider>,window.document.body);
}
