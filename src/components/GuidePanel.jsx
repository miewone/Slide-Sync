import {Button, Checkbox, InspectorSection} from "./ui.jsx";

/** GuidePanel controls; native form values are owned by the editor runtime. */
export function GuidePanel() {
  return <>
      <InspectorSection id="editor-section-guides" initiallyOpen={false} title="안내선">
      <div className="guide-options">
      <Checkbox id="guides-visible" label="안내선 표시" defaultChecked/>
      <Checkbox id="guides-snap" label="이동할 때 안내선에 맞추기" defaultChecked/>
      <Checkbox id="guides-edit" label="안내선을 드래그하여 편집"/>
      </div>
      <div className="guide-add">
      <Button id="guide-horizontal" disabled>+ 가로 안내선</Button>
      <Button id="guide-vertical" disabled>+ 세로 안내선</Button>
      </div>
      <p id="guide-count" className="field-help">파일을 열면 기존 안내선을 불러옵니다.</p>
      <label className="field-label" htmlFor="guide-select">안내선 선택</label>
      <select id="guide-select" disabled>
      </select>
      <label className="field-label" id="guide-axis" htmlFor="guide-position">왼쪽에서 (cm)</label>
      <div className="guide-position-row">
      <input id="guide-position" type="number" step="0.1" disabled/>
      <Button id="guide-apply" disabled>적용</Button>
      <Button id="guide-delete" disabled>삭제</Button>
      </div>
      <p id="guide-readonly" className="field-help" hidden>마스터·레이아웃 안내선은 표시와 맞추기만 지원합니다.</p>
      <p className="field-help">공통 안내선은 모든 슬라이드에 적용되며 수정본 PPTX에도 저장됩니다. Alt를 누르고 드래그하면 안내선 맞추기를 잠시 해제합니다.</p>
      </InspectorSection>
  </>;
}
