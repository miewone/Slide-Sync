import {useEffect,useRef} from 'react';
import {t} from '../i18n/I18n.js';
import {Button} from './ui.jsx';

/** Choose a local folder or Google Drive before opening a file. @param {object} props Disabled states, local/Drive open callbacks and onDriveSettings, which receives a callback to restore this chooser when settings close. */
export function FileOpenChooser({disabled,driveDisabled,onLocalOpen,onDriveOpen,onDriveSettings}) {
  const dialog=useRef(null),trigger=useRef(null),settingsTrigger=useRef(null);
  useEffect(()=>{if(disabled&&dialog.current.open)dialog.current.close();},[disabled]);
  const choose=action=>{dialog.current.close();action();};
  return <>
    <Button ref={trigger} id="open" disabled={disabled} aria-haspopup="dialog" aria-controls="file-open-dialog" onClick={()=>dialog.current.showModal()}>{t('Header.5')}</Button>
    <dialog ref={dialog} id="file-open-dialog" className="file-open-dialog" aria-labelledby="file-open-title"
      onClose={()=>{if(!window.document.querySelector('dialog[open]'))trigger.current?.focus();}} onKeyDownCapture={event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();dialog.current.close();}}}>
      <div className="file-open-heading"><h2 id="file-open-title">{t('fileOpen.title')}</h2><Button id="file-open-close" onClick={()=>dialog.current.close()}>{t('drive.close')}</Button></div>
      <div className="file-open-options">
        <button type="button" id="file-open-local" className="file-open-option" disabled={disabled} onClick={()=>choose(onLocalOpen)}>
          <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" focusable="false"><path d="M5 12a4 4 0 0 1 4-4h11l5 6h14a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z" fill="#F6BE4F"/><path d="M5 20h38v16a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z" fill="#F9D77E"/></svg>
          <strong>{t('fileOpen.local')}</strong><span>{t('fileOpen.localHelp')}</span>
        </button>
        <div className="file-open-drive-group">
          <button type="button" id="file-open-drive" className="file-open-option" disabled={disabled||driveDisabled} onClick={()=>choose(onDriveOpen)}>
            <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" focusable="false"><path d="M18 5h12L12 36H0Z" fill="#0F9D58"/><path d="M30 5l18 31H36L18 5Z" fill="#F4B400"/><path d="M0 36h48l-6 10H6Z" fill="#4285F4"/></svg>
            <strong>Google Drive</strong><span>{t('fileOpen.driveHelp')}</span>
          </button>
          <button type="button" ref={settingsTrigger} id="file-open-drive-settings" className="file-open-drive-settings" disabled={disabled||driveDisabled} aria-label={t('drive.settingsTitle')} title={t('drive.settingsTitle')} onClick={()=>choose(()=>onDriveSettings(()=>{dialog.current?.showModal();settingsTrigger.current?.focus();}))}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 3-.5 3-2 1-2.5-1-2 3 2 2v2l-2 2 2 3 2.5-1 2 1 .5 3h4l.5-3 2-1 2.5 1 2-3-2-2v-2l2-2-2-3-2.5 1-2-1-.5-3Z"/><circle cx="11" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
    </dialog>
  </>;
}
