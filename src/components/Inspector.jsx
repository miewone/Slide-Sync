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
    <div className="delete-selection-control"><Button id="delete-selection" variant="danger" disabled>{t('Help.1')}</Button><Help helpKey="delete-selection"/></div>
    <Button id="undo" full disabled>{t('Inspector.2')}</Button>
    <ElementSearchPanel/><LayoutPanel/><MovePanel/><GuidePanel/><TextFitPanel/>
  </aside>;
});
