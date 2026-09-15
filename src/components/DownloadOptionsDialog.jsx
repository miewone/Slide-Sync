import {useEffect,useRef} from 'react';
import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {Button} from './ui.jsx';

/** Choose how to save an edited PPTX. @param {object} props canDrive, error, result and explicit local/Drive/close callbacks. */
export function DownloadOptionsDialog({canDrive,error,result,onLocal,onDrive,onClose}) {
  useLanguage();
  const dialog=useRef(null);
  useEffect(()=>{dialog.current.showModal();},[]);
  return <dialog ref={dialog} id="download-options-dialog" className="drive-dialog" aria-labelledby="download-options-title"
    onCancel={event=>{event.preventDefault();onClose();}} onKeyDownCapture={event=>event.stopPropagation()}>
    <h2 id="download-options-title">{t('download.destination')}</h2>
    <p>{t('download.destinationHelp')}</p>
    {error&&<p role="alert">{error}</p>}
    {result&&<p role="status">{t('drive.saved')} <a href={`https://drive.google.com/file/d/${encodeURIComponent(result.id)}/view`} target="_blank" rel="noopener noreferrer">{result.name}</a></p>}
    <div className="drive-actions">
      <Button id="download-local" variant="primary" onClick={onLocal}>{t('download.local')}</Button>
      {canDrive&&<Button id="download-drive" onClick={onDrive}>{t('drive.save')}</Button>}
      <Button id="download-options-close" onClick={onClose}>{t('drive.close')}</Button>
    </div>
  </dialog>;
}
