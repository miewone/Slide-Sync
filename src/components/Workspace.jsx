import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {useState} from 'react';
import {AppearanceControl} from './AppearanceControl.jsx';
import {PreviewStage} from './PreviewStage.jsx';
import {TextFormatToolbar} from './TextFormatToolbar.jsx';
import {PreviewGridControl} from './PreviewGridControl.jsx';
import {Button, Checkbox} from './ui.jsx';
import {useEditor, useEditorValue} from '../hooks/useEditor.js';

/** Empty-state file actions; hidden without being removed during a file load. */
function EmptyState() {
  useLanguage();
  const ready = useEditorValue('ready'), busy = useEditorValue('busy'), hasDeck = useEditorValue('hasDeck');
  const recent=useEditorValue('recentFiles');
  const {commands} = useEditor();
  const welcome=ready&&!hasDeck&&recent.loaded&&!recent.busy&&!recent.error&&recent.files.length===0;
  const demo=<Button key="demo" id="demo" variant={welcome?'primary':undefined}
    className={welcome?'welcome-demo':'demo-button'} disabled={!ready||busy} onClick={commands.openDemo}>{t('Workspace.1')}</Button>;
  const open=<Button key="open" id="empty-open" variant={welcome?undefined:'primary'} disabled={!ready||busy} onClick={commands.chooseFile}>{t('Workspace.2')}</Button>;
  return <div className={`empty-state${welcome?' welcome-state':''}`} id="dropzone" hidden={hasDeck}>
    <div className="privacy-highlight"><strong>{t('Workspace.12')}</strong><span>{t('Workspace.13')}</span></div>
    <div className="empty-state-content">
    <div className="upload-symbol" aria-hidden="true">{welcome?'▱':'↥'}</div>
    {welcome&&<span className="welcome-eyebrow">{t('Workspace.3')}</span>}
    <h2>{welcome?t('Workspace.4'):t('Workspace.5')}</h2>
    <p>{welcome?<>{t('Workspace.6')}<br/>{t('Workspace.7')}</>:<>{t('Workspace.8')}<br/>{t('Workspace.9')}</>}</p>
    <div className="empty-state-actions">{welcome?[demo,open]:[open,demo]}</div>
    <small>{welcome?t('Workspace.10'):t('Workspace.11')}</small>
    </div>
  </div>;
}

/** Status information subscribes independently of the preview canvas. */
function StatusBar() {
  useLanguage();
  const status = useEditorValue('status'), size = useEditorValue('size');
  return <footer className="statusbar"><span id="status" role="status">{status}</span><span id="size-info">{size}</span></footer>;
}

/** Presentation metadata and isolated preview host. */
export function Workspace() {
  useLanguage();
  const [grid,setGrid]=useState({columns:null,rows:null});
  const busy=useEditorValue('busy');
  const name = useEditorValue('name'), summary = useEditorValue('summary'), notice = useEditorValue('notice');
  return <section className="workspace">
    <div className="workspace-bar"><div className="workspace-heading"><div className="workspace-title-row"><h1 id="filename">{name}</h1><PreviewGridControl grid={grid} disabled={busy} onChange={setGrid}/></div><p id="workspace-summary">{summary}</p></div>
      <TextFormatToolbar/>
      <div className="view-option workspace-options">
        <AppearanceControl/>
        <Checkbox variant="chip" id="box-select-mode" label={t('Help.3')} helpKey="box-select-mode"/>
        <Checkbox variant="chip" id="only-checked" label={t('Help.7')} helpKey="only-checked"/>
        <Checkbox variant="chip" id="only-with-selection" label={t('view.selectedElementsOnly')} helpKey="only-with-selection"/>
      </div>
    </div>
    <div id="notice" className="notice" role="alert" hidden={!notice}>{notice}</div>
    <EmptyState/><PreviewStage columns={grid.columns} rows={grid.rows}/><StatusBar/>
  </section>;
}
