import {useEffect,useMemo,useRef,useState} from 'react';
import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {useEditor,useEditorValue} from '../hooks/useEditor.js';
import {GoogleSession,PPTX_MIME,SLIDES_MIME} from '../services/google/GoogleSession.js';
import {GoogleSettingsRepository} from '../services/google/GoogleSettingsRepository.js';
import {GoogleDriveSettings} from './GoogleDriveSettings.jsx';
import {GoogleFiles} from '../services/google/GoogleFiles.js';
import {NativeSlidesDocument} from '../editor/google/NativeSlidesDocument.js';
import {NativeSlidesEditor} from './NativeSlidesEditor.jsx';
import {DriveSaveDialog} from './DriveSaveDialog.jsx';
import {Button} from './ui.jsx';

/** Drive entry point, consent and presentation routing. Native Slides data stays in memory; PPTX retains the existing preview cache. @param {object} props Optional renderTrigger receives openDrive and disabled to reuse this session from a custom entry point. */
export function GoogleDriveControls({renderTrigger}={}){
  useLanguage();
  const {commands}=useEditor(),busy=useEditorValue('busy'),ready=useEditorValue('ready'),hasDeck=useEditorValue('hasDeck'),source=useEditorValue('driveSource'),title=useEditorValue('name');
  const [session,setSession]=useState(()=>new GoogleSession());
  const repository=useMemo(()=>new GoogleSettingsRepository(),[]);
  const [loaded,setLoaded]=useState(false),[editing,setEditing]=useState(false);
  const files=useMemo(()=>new GoogleFiles(session),[session]);
  const dialog=useRef(null),mounted=useRef(true),[prepared,setPrepared]=useState(false),[connected,setConnected]=useState(false),[working,setWorking]=useState(false),[error,setError]=useState(''),[save,setSave]=useState(false),[native,setNative]=useState(null),[result,setResult]=useState(null);
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;session.clearMemory();};},[session]);
  const run=async action=>{setWorking(true);setError('');try{await action();}catch(err){if(mounted.current)setError(err.message);}finally{if(mounted.current)setWorking(false);}};
  const prepare=async current=>{
    await current.prepare();current.restoreStored();setPrepared(true);
    try{current.token();setConnected(true);}catch{setConnected(false);}
  };
  const show=()=>{
    setError('');dialog.current.showModal();
    run(async()=>{
      let current=session;
      if(!loaded){
        setEditing(true);const saved=await repository.get();setLoaded(true);
        if(saved){current=new GoogleSession(saved);setSession(current);setEditing(false);}
      }
      if(!current.configured){setEditing(true);return;}
      await prepare(current);
    });
  };
  const saveSettings=value=>run(async()=>{
    const config=await repository.save(value);
    session.disconnect();const current=new GoogleSession(config);setSession(current);
    setLoaded(true);setEditing(false);setConnected(false);setPrepared(false);setResult(null);
    await prepare(current);
  });
  const removeSettings=()=>run(async()=>{
    await repository.clear();session.disconnect();setSession(new GoogleSession());
    setConnected(false);setPrepared(false);setResult(null);setEditing(true);
  });
  return <>
    {renderTrigger?renderTrigger({openDrive:show,disabled:!ready||busy||working}):<Button id="drive-open" disabled={!ready||busy||working} onClick={show}>Google Drive</Button>}
    <dialog ref={dialog} className="drive-dialog" id="drive-dialog" aria-labelledby="drive-title" onCancel={e=>{if(working)e.preventDefault();}} onKeyDownCapture={e=>e.stopPropagation()}>
      <h2 id="drive-title">Google Drive</h2><p>{t('drive.privacy')}</p>
      {error&&<p role="alert">{error}</p>}
      {result&&<p role="status">{t('drive.saved')} <a href={`https://drive.google.com/file/d/${encodeURIComponent(result.id)}/view`} target="_blank" rel="noopener noreferrer">{result.name}</a></p>}
      {editing&&<GoogleDriveSettings key={session.clientId+session.apiKey} value={session} busy={working} onSave={saveSettings}
        onCancel={session.configured?()=>setEditing(false):null} onRemove={session.configured?removeSettings:null}/>}
      <div className="drive-actions">
        {!editing&&<Button id="drive-settings-edit" disabled={working} onClick={()=>{setError('');setEditing(true);}}>{t('drive.settingsTitle')}</Button>}
        <Button id="drive-connect" disabled={!prepared||working||editing} onClick={()=>run(async()=>{await session.authorize();setConnected(true);})}>{t('drive.connect')}</Button>
        <Button id="drive-select" disabled={!connected||working||editing} onClick={()=>run(async()=>{
          dialog.current.close();
          try{
            const selected=await session.pick();if(!selected){dialog.current.showModal();return;}
            const metadata=await files.metadata(selected.id);
            if(metadata.mimeType===SLIDES_MIME){const model=new NativeSlidesDocument(await files.presentation(metadata.id));if(mounted.current)setNative({model,source:metadata});}
            else if(metadata.mimeType===PPTX_MIME){if(!await commands.openDrivePptx(files,metadata.id))dialog.current.showModal();}
            else throw new Error(t('drive.typeError'));
          }catch(err){dialog.current?.showModal();throw err;}
        })}>{t('drive.open')}</Button>
        <Button id="drive-save-local" disabled={!connected||!hasDeck||working||editing} onClick={()=>{setError('');setSave(true);dialog.current.close();}}>{t('drive.savePptx')}</Button>
        <Button disabled={!connected||working||editing} id="drive-disconnect" onClick={()=>{session.disconnect();setConnected(false);}}>{t('drive.disconnect')}</Button>
        <Button disabled={working} onClick={()=>dialog.current.close()}>{t('drive.close')}</Button>
      </div>
    </dialog>
    {save&&<DriveSaveDialog source={source} title={source?.name||title} session={session} busy={working||busy} error={error}
      onClose={()=>{setSave(false);dialog.current.showModal();}} onSave={options=>run(async()=>{
        const target=await commands.saveDrivePptx(files,options);if(target){setResult(target);setSave(false);dialog.current.showModal();}
      })}/>}
    {native&&<NativeSlidesEditor document={native.model} source={native.source} files={files} session={session} onClose={()=>setNative(null)}/>}
  </>;
}
