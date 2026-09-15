import {t,i18n} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {useRef} from 'react';
import {Button} from './ui.jsx';
import {ActivityLogPanel} from './ActivityLogPanel.jsx';
import {GoogleDriveControls} from './GoogleDriveControls.jsx';
import {FileOpenChooser} from './FileOpenChooser.jsx';
import {RecentFiles} from './RecentFiles.jsx';
import {useEditor, useEditorValue} from '../hooks/useEditor.js';

/** File commands; the native input remains reusable after opening the same file. */
export function Header() {
  useLanguage();
  const input = useRef(null);
  const {commands} = useEditor();
  const busy = useEditorValue('busy');
  const ready = useEditorValue('ready');
  const hasDeck = useEditorValue('hasDeck');
  return <header className={`topbar${busy ? ' busy' : ''}`}>
    <div className="brand">
      <a className="brand-icon" href="https://github.com/miewone/Slide-Sync" target="_blank" rel="noopener noreferrer"
        aria-label={t('Header.1')}><svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/>
        </svg></a>
      <div className="brand-info">
        <div className="brand-title"><strong>{t('Header.2')}</strong><span className="beta">{t('Header.3')}</span></div>
        <a className="developer-email" href="mailto:dlsrk489@gmail.com">{t('Header.4')}</a>
      </div>
    </div>
    <div className="header-actions">
      <ActivityLogPanel/>
      <div className="language-control" role="group" aria-label={t('language.label')}>
        <button type="button" id="language-ko" lang="ko" aria-pressed={i18n.getLanguage()==='ko'} disabled={!ready||busy}
          onClick={()=>i18n.setLanguage('ko')}>{t('language.korean')}</button>
        <span aria-hidden="true">/</span>
        <button type="button" id="language-en" lang="en" aria-pressed={i18n.getLanguage()==='en'} disabled={!ready||busy}
          onClick={()=>i18n.setLanguage('en')}>{t('language.english')}</button>
      </div>
      <GoogleDriveControls renderTrigger={({openDrive,openRecentDrive,openSettings,disabled:driveDisabled})=><>
        <FileOpenChooser disabled={!ready||busy||driveDisabled} driveDisabled={driveDisabled} onLocalOpen={()=>input.current.click()} onDriveOpen={openDrive} onDriveSettings={openSettings}/>
        <RecentFiles onDriveOpen={openRecentDrive} disabled={driveDisabled}/>
      </>}/>
      <Button id="download" variant="primary" disabled={!hasDeck || busy} onClick={commands.download}>{t('Header.6')}<span>↓</span></Button>
    </div>
    <input ref={input} id="file" type="file" accept=".pptx" hidden onChange={event => {
      const file = event.target.files[0];event.target.value = '';commands.openFile(file);
    }}/>
  </header>;
}
