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
    <article key={row.index} data-selection-slide={row.index} className={`selection-row${row.matched ? '' : ' miss'}`} title={row.title}
      aria-label={t('selection.slideTitle',{p0:row.index+1})}>
      <div className="selection-row-heading"><strong>{t('selection.slideTitle',{p0:String(row.index+1).padStart(2,'0')})}</strong>
        <span className="selection-row-count">{row.matched?t('selection.selectedCount',{p0:row.count}):t('createEditorRuntime.14')}</span>
      </div>
      {row.matched&&<p className="selection-element-summary">{row.label}</p>}
    </article>) : <p className="muted">{t('Selection.3')}</p>}</div>;
}
