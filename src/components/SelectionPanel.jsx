import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {InspectorSection} from "./ui.jsx";
import {SelectionList} from "./Selection.jsx";

/** SelectionPanel controls; native form values are owned by the editor runtime. */
export function SelectionPanel() {
  useLanguage();
  return <InspectorSection id="editor-section-selection" title={t('SelectionPanel.1')} initiallyOpen={false}>
      <div className="selection-heading">
      <button id="clear-selection" className="text-button">{t('SelectionPanel.2')}</button>
      </div>
      <SelectionList/>
      <details className="details">
      <summary>{t('SelectionPanel.3')}</summary>
      <p>{t('SelectionPanel.4')}</p>
      </details>
  </InspectorSection>;
}
