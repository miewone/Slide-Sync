import {Button, SelectField, InspectorSection} from "./ui.jsx";

/** TextFitPanel controls; native form values are owned by the editor runtime. */
export function TextFitPanel() {
  return <>
      <InspectorSection id="editor-section-text-fit" initiallyOpen={false} title="텍스트 상자 맞춤">
      <p className="field-help">원래 글자 크기와 너비를 유지하고, 높이를 내용에 맞게 늘리거나 줄입니다.</p>
      <SelectField id="fit-scope" label="맞춤 대상" options={[{"value": "all", "label": "적용 슬라이드의 모든 텍스트 상자"}, {"value": "selected", "label": "현재 선택한 텍스트 상자"}]}/>
      <p id="fit-count" className="field-help">대상 텍스트 상자 없음</p>
      <Button id="fit-text" full disabled>텍스트에 맞게 높이 조정</Button>
      <p className="field-help">제목 포함 · 그룹 안 텍스트, 세로쓰기, 다단 텍스트 제외</p>
      </InspectorSection>
  </>;
}
