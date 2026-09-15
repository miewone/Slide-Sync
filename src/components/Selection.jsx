import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {useEditorValue} from '../hooks/useEditor.js';

/** Selected element count and bounds, independent of form/preview updates. */
export function SelectionSummary() {
  useLanguage();
  const selection = useEditorValue('selection');
  return <><div id="selection-summary" className="selection-summary"><span className="selection-number">{selection.count}</span><span>{t('Selection.1')}{selection.slides}{t('Selection.2')}</span></div><p id="selection-size" className="field-help">{selection.size}</p></>;
}

/** Read-only selection list; uploaded text is escaped by React. */
export function SelectionList() {
  useLanguage();
  const selection = useEditorValue('selection');
  return <div id="selection-list" className="selection-list">{selection.rows.length ? selection.rows.map(row =>
    <div key={row.index} className={`selection-row${row.matched ? '' : ' miss'}`} title={row.title}>
      <span>{String(row.index + 1).padStart(2, '0')}</span><span>{row.label}</span>
    </div>) : <p className="muted">{t('Selection.3')}</p>}</div>;
}
