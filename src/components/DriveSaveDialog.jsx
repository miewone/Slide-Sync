import {useEffect,useRef,useState} from 'react';
import {t} from '../i18n/I18n.js';
import {SLIDES_MIME} from '../services/google/GoogleSession.js';
import {Button} from './ui.jsx';

/** Explicit save destination. @param {object} props Source metadata, session, title, busy state and save/close callbacks. */
export function DriveSaveDialog({source,title,session,busy,onSave,onClose,error,createdFile}) {
  const canCopy=source?.mimeType!==SLIDES_MIME||!!source.capabilities?.canCopy;
  const dialog=useRef(null),[mode,setMode]=useState(!canCopy&&source?.capabilities?.canEdit?'original':'copy'),[name,setName]=useState(title),[folder,setFolder]=useState(null),[pickerError,setPickerError]=useState('');
  useEffect(()=>{dialog.current.showModal();},[]);
  return <dialog ref={dialog} className="drive-dialog" id="drive-save-dialog" aria-labelledby="drive-save-title" onCancel={event=>{event.preventDefault();if(!busy)onClose();}} onKeyDown={event=>event.stopPropagation()}>
    <h2 id="drive-save-title">{t('drive.save')}</h2>
    <fieldset disabled={busy}>
      <legend>{t('drive.destination')}</legend>
      <label><input type="radio" name="drive-mode" value="original" checked={mode==='original'} disabled={!source?.capabilities?.canEdit} onChange={()=>setMode('original')}/>{t('drive.original')}{source?` · ${source.name}`:''}</label>
      <label><input type="radio" name="drive-mode" value="copy" disabled={!canCopy} checked={mode==='copy'} onChange={()=>setMode('copy')}/>{t('drive.copy')}</label>
      {mode==='copy'&&<><label htmlFor="drive-save-name">{t('drive.name')}</label><input id="drive-save-name" value={name} onChange={e=>setName(e.target.value)} maxLength={200}/>
        <p>{t('drive.folder')}: {folder?.name||t('drive.myDrive')}</p>
        <Button id="drive-folder" onClick={async()=>{
          setPickerError('');dialog.current.close();
          try{const selected=await session.pick(true);if(selected)setFolder(selected);}catch(err){setPickerError(err.message);}
          finally{dialog.current?.showModal();}
        }}>{t('drive.chooseFolder')}</Button>
        {folder&&<Button onClick={()=>setFolder(null)}>{t('drive.myDrive')}</Button>}
      </>}
    </fieldset>
    {(error||pickerError)&&<p role="alert">{error||pickerError}</p>}
    {createdFile&&<p role="alert">{t('drive.copyCreated')} <a href={`https://docs.google.com/presentation/d/${encodeURIComponent(createdFile.id)}/edit`} target="_blank" rel="noopener noreferrer">{createdFile.name}</a></p>}
    <div className="drive-actions"><Button id="drive-save-cancel" disabled={busy} onClick={onClose}>{t('drive.cancel')}</Button>
      <Button id="drive-save-confirm" variant="primary" disabled={busy||(mode==='copy'?(!canCopy||!name.trim()):!source?.capabilities?.canEdit)} onClick={()=>onSave({mode,name:mode==='original'?source.name:name,folderId:folder?.id})}>{busy?t('drive.working'):t('drive.save')}</Button></div>
  </dialog>;
}
