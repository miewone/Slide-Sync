import {t,locale} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {useRef} from 'react';
import {Button} from './ui.jsx';
import {useEditor,useEditorValue} from '../hooks/useEditor.js';

/** Explicit recent-file chooser; opening the list never opens a presentation. */
export function RecentFiles() {
  useLanguage();
  const dialog=useRef(null),trigger=useRef(null);
  const {commands}=useEditor();
  const recent=useEditorValue('recentFiles'),busy=useEditorValue('busy'),ready=useEditorValue('ready');
  const blocked=busy||recent.busy||!ready;
  const close=()=>dialog.current.close();
  return <>
    <Button id="recent-files-open" ref={trigger} disabled={!ready||busy} onClick={()=>{
      dialog.current.showModal();commands.refreshRecentFiles();
    }}>{t('RecentFiles.1')}{recent.files.length?` (${recent.files.length})`:''}</Button>
    <dialog ref={dialog} id="recent-files-dialog" className="recent-files-dialog" aria-labelledby="recent-files-title"
      aria-describedby="recent-files-help" onClose={()=>trigger.current?.focus()} onKeyDown={event=>event.stopPropagation()}>
      <div className="recent-files-heading"><h2 id="recent-files-title">{t('RecentFiles.2')}</h2>
        <Button id="recent-files-close" onClick={close}>{t('RecentFiles.3')}</Button></div>
      <p id="recent-files-help" className="field-help">{t('RecentFiles.4')}<br/>{t('RecentFiles.5')}</p>
      {recent.error && <p className="recent-files-error" role="alert">{recent.error}</p>}
      <p className="field-help" role="status">{recent.busy?t('RecentFiles.6'):t('RecentFiles.7', {p0: recent.files.length})}</p>
      {!recent.files.length&&!recent.busy&&<p className="recent-files-empty">{t('RecentFiles.8')}</p>}
      <ul className="recent-files-list">{recent.files.map(file=><li key={file.id} data-recent-id={file.id}>
        <button type="button" className="recent-file-select" disabled={blocked} onClick={async()=>{
          if(await commands.openRecentFile(file.id))close();
        }}>
          <strong>{file.name}</strong>
          <span>{(file.size/1024/1024).toLocaleString(locale(),{maximumFractionDigits:2})}{t('RecentFiles.9')}{new Date(file.lastOpened).toLocaleString(locale())}</span>
        </button>
        <Button className="recent-file-delete" disabled={blocked} aria-label={t('RecentFiles.10', {p0: file.name})}
          onClick={()=>commands.removeRecentFile(file.id)}>{t('GuidePanel.11')}</Button>
      </li>)}</ul>
      <div className="recent-files-footer"><p className="field-help">{t('RecentFiles.11')}</p>
        <Button id="recent-files-clear" disabled={blocked||!recent.files.length} onClick={commands.clearRecentFiles}>{t('RecentFiles.12')}</Button>
      </div>
    </dialog>
  </>;
}
