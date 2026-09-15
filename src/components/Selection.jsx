import {useEditorValue} from '../hooks/useEditor.js';

/** Selected element count and bounds, independent of form/preview updates. */
export function SelectionSummary() {
  const selection = useEditorValue('selection');
  return <><div id="selection-summary" className="selection-summary"><span className="selection-number">{selection.count}</span><span>개 요소 · {selection.slides}개 슬라이드</span></div><p id="selection-size" className="field-help">{selection.size}</p></>;
}

/** Read-only selection list; uploaded text is escaped by React. */
export function SelectionList() {
  const selection = useEditorValue('selection');
  return <div id="selection-list" className="selection-list">{selection.rows.length ? selection.rows.map(row =>
    <div key={row.index} className={`selection-row${row.matched ? '' : ' miss'}`} title={row.title}>
      <span>{String(row.index + 1).padStart(2, '0')}</span><span>{row.label}</span>
    </div>) : <p className="muted">슬라이드에서 요소를 클릭하세요.</p>}</div>;
}
