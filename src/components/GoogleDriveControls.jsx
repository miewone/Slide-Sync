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
import {DriveLoadingDialog} from './DriveLoadingDialog.jsx';
import {Button} from './ui.jsx';

/** Drive entry point, consent and presentation routing. Native Slides data stays in memory; PPTX retains the existing preview cache. @param {object} props Optional renderTrigger receives openDrive, openRecentDrive, openSettings and disabled to reuse this session from a custom entry point. openSettings accepts an optional callback for returning to the source chooser on close. */
export function GoogleDriveControls({renderTrigger}={}){
  useLanguage();
  const {commands}=useEditor(),busy=useEditorValue('busy'),ready=useEditorValue('ready'),hasDeck=useEditorValue('hasDeck'),source=useEditorValue('driveSource'),title=useEditorValue('name');
  const [session,setSession]=useState(()=>new GoogleSession());
  const repository=useMemo(()=>new GoogleSettingsRepository(),[]);
  const pendingOpen=useRef(false),pendingFile=useRef(null),returnToChooser=useRef(null);
  const [notice,setNotice]=useState(false);
  const [loadingFile,setLoadingFile]=useState(null);
  const [loaded,setLoaded]=useState(false),[editing,setEditing]=useState(false);
  const files=useMemo(()=>new GoogleFiles(session),[session]);
  const dialog=useRef(null),mounted=useRef(true),[prepared,setPrepared]=useState(false),[connected,setConnected]=useState(false),[working,setWorking]=useState(false),[error,setError]=useState(''),[save,setSave]=useState(false),[native,setNative]=useState(null),[result,setResult]=useState(null);
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;session.clearMemory();};},[session]);
  const run=async action=>{setWorking(true);setError('');try{await action();}catch(err){if(mounted.current)setError(err.message);}finally{if(mounted.current)setWorking(false);}};
  const prepare=async current=>{
    await current.prepare();current.restoreStored();setPrepared(true);
    try{current.token();setConnected(true);}catch{setConnected(false);}
  };
  const selectFile=async(current=session)=>{
    dialog.current.close();
    const currentFiles=current===session?files:new GoogleFiles(current);
    try{
      const selected=pendingFile.current||await current.pick();if(!selected)return;
      setNotice(false);setLoadingFile({name:selected.name||''});
      const metadata=await currentFiles.metadata(selected.id);
      if(mounted.current)setLoadingFile({name:metadata.name});
      if(metadata.mimeType===SLIDES_MIME){const model=new NativeSlidesDocument(await currentFiles.presentation(metadata.id));if(mounted.current){setNative({model,source:metadata});commands.rememberDriveFile(metadata);}}
      else if(metadata.mimeType===PPTX_MIME){if(!await commands.openDrivePptx(currentFiles,metadata.id))dialog.current.showModal();}
      else throw new Error(t('drive.typeError'));
    }catch(err){dialog.current?.showModal();throw err;}
    finally{if(mounted.current){setLoadingFile(null);setNotice(false);}pendingOpen.current=false;pendingFile.current=null;}
  };
  const close=()=>{
    pendingOpen.current=false;pendingFile.current=null;setNotice(false);dialog.current.close();
    const onReturn=returnToChooser.current;returnToChooser.current=null;onReturn?.();
  };
  const show=(openFile=false,onReturn=null,file=null)=>{
    pendingFile.current=file;
    returnToChooser.current=onReturn;
    pendingOpen.current=openFile;setNotice(openFile);
    setError('');setEditing(false);dialog.current.showModal();
    run(async()=>{
      let current=session;
      if(!loaded){
        const saved=await repository.get();setLoaded(true);
        if(saved){current=new GoogleSession(saved);setSession(current);}
      }
      if(!current.configured){setEditing(true);return;}
      await prepare(current);
      if(openFile){
        let authorized=false;try{current.token();authorized=true;}catch{}
        if(authorized)await selectFile(current);
      }
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
    {renderTrigger?renderTrigger({openDrive:()=>show(true),openRecentDrive:file=>show(true,null,{id:file.driveFileId,name:file.name}),openSettings:onReturn=>show(false,onReturn),disabled:!ready||busy||working}):<Button id="drive-open" disabled={!ready||busy||working} onClick={()=>show(true)}>Google Drive</Button>}
    {notice&&<div className="drive-open-notice" role="status">{t('drive.editingNotice')}</div>}
    <dialog ref={dialog} className="drive-dialog" id="drive-dialog" aria-labelledby="drive-title" onCancel={e=>{e.preventDefault();if(!working)close();}} onKeyDownCapture={e=>e.stopPropagation()}>
      <h2 id="drive-title">Google Drive</h2>{notice&&<p role="status">{t('drive.editingNotice')}</p>}<p>{t('drive.privacy')}</p>
      {error&&<p role="alert">{error}</p>}
      {result&&<p role="status">{t('drive.saved')} <a href={`https://drive.google.com/file/d/${encodeURIComponent(result.id)}/view`} target="_blank" rel="noopener noreferrer">{result.name}</a></p>}
      {editing&&<GoogleDriveSettings key={session.clientId+session.apiKey} value={session} busy={working} onSave={saveSettings}
        onCancel={session.configured?()=>setEditing(false):null} onRemove={session.configured?removeSettings:null}/>}
      <div className="drive-actions">
        {!editing&&<Button id="drive-settings-edit" disabled={working} onClick={()=>{setError('');setEditing(true);}}>{t('drive.settingsTitle')}</Button>}
        <Button id="drive-connect" disabled={!prepared||working||editing} onClick={()=>run(async()=>{await session.authorize();setConnected(true);if(pendingOpen.current)await selectFile();})}>{t('drive.connect')}</Button>
        <Button id="drive-select" disabled={!connected||working||editing} onClick={()=>run(()=>selectFile())}>{t('drive.open')}</Button>
        <Button id="drive-save-local" disabled={!connected||!hasDeck||working||editing} onClick={()=>{setError('');setSave(true);dialog.current.close();}}>{t('drive.savePptx')}</Button>
        <Button disabled={!connected||working||editing} id="drive-disconnect" onClick={()=>{session.disconnect();setConnected(false);}}>{t('drive.disconnect')}</Button>
        <Button id="drive-close" disabled={working} onClick={close}>{t('drive.close')}</Button>
      </div>
    </dialog>
    {save&&<DriveSaveDialog source={source} title={source?.name||title} session={session} busy={working||busy} error={error}
      onClose={()=>{setSave(false);dialog.current.showModal();}} onSave={options=>run(async()=>{
        const target=await commands.saveDrivePptx(files,options);if(target){setResult(target);setSave(false);dialog.current.showModal();}
      })}/>}
    {loadingFile&&<DriveLoadingDialog fileName={loadingFile.name}/>}
    {native&&<NativeSlidesEditor document={native.model} source={native.source} files={files} session={session} onClose={()=>setNative(null)}/>}
  </>;
}
