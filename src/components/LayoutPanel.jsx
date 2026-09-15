import {Button, SelectField, InspectorSection} from './ui.jsx';
import {alignmentGroups, distributionActions} from '../editor/layout-options.js';

const targets = [{value:'selection', label:'선택한 요소들의 영역'}, {value:'slide', label:'슬라이드 전체'}];

/** @param {object} props Action/label pairs, grid class and accessible group name. */
function ActionGrid({actions, className, label}) {
  return <div className={className}>{actions.map(([action, text]) =>
    <Button key={action} data-layout={action} aria-label={`${label} ${text}`} title={`${label}: ${text}`} disabled>{text}</Button>)}</div>;
}

/** Direction-specific alignment controls, directly below the current selection. */
export function LayoutPanel() {
  return <InspectorSection id="editor-section-layout" title="선택한 요소 정렬">
    <SelectField id="layout-target" label="정렬 기준" options={targets}/>
    {alignmentGroups.map(group => <fieldset key={group.label} className="alignment-group">
      <legend>{group.label}</legend>
      <ActionGrid className="align-grid" actions={group.actions} label={group.label}/>
    </fieldset>)}
    <p id="layout-help" className="field-help">같은 슬라이드에서 요소를 2개 이상 선택하세요.</p>
    <details className="spacing-options"><summary>간격 균등</summary>
      <ActionGrid className="distribute-grid" actions={distributionActions} label="간격 균등"/>
      <p className="field-help">각 슬라이드에서 3개 이상 선택하면 양 끝 요소를 유지하고 간격을 맞춥니다.</p>
    </details>
  </InspectorSection>;
}
