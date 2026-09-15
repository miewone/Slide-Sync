import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {memo} from 'react';
import {Button} from './ui.jsx';
import {Help} from './Help.jsx';
import {ElementSearchPanel} from './ElementSearchPanel.jsx';
import {SelectionSummary} from './Selection.jsx';
import {MovePanel} from './MovePanel.jsx';
import {GuidePanel} from './GuidePanel.jsx';
import {LayoutPanel} from './LayoutPanel.jsx';
import {TextFitPanel} from './TextFitPanel.jsx';

/** Stable form boundary: React state updates never overwrite native edit drafts. */
export const Inspector = memo(function Inspector() {
  useLanguage();
  return <aside className="inspector"><h2>{t('Inspector.1')}</h2><SelectionSummary/>
    <div className="history-controls" role="group" aria-label={t('history.title')}>
      <Button id="delete-selection" variant="danger" disabled aria-label={t('Help.1')} title={`${t('Help.1')} (Delete)`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>
      </Button>
      <Help helpKey="delete-selection"/>
      <Button id="undo" disabled aria-label={t('Inspector.2')} aria-keyshortcuts="Control+z" title={`${t('Inspector.2')} (Ctrl+Z)`}>↶</Button>
      <Button id="redo" disabled aria-label={t('history.redo')} aria-keyshortcuts="Control+y" title={`${t('history.redo')} (Ctrl+Y)`}>↷</Button>
    </div>
    <ElementSearchPanel/><LayoutPanel/><MovePanel/><GuidePanel/><TextFitPanel/>
  </aside>;
});
