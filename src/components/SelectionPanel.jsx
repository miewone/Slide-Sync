import {InspectorSection} from "./ui.jsx";
import {SelectionList} from "./Selection.jsx";

/** SelectionPanel controls; native form values are owned by the editor runtime. */
export function SelectionPanel() {
  return <InspectorSection id="editor-section-selection" title="선택 결과" initiallyOpen={false}>
      <div className="selection-heading">
      <button id="clear-selection" className="text-button">비우기</button>
      </div>
      <SelectionList/>
      <details className="details">
      <summary>미리보기 안내</summary>
      <p>브라우저 미리보기는 PowerPoint와 글꼴·효과가 다를 수 있습니다. 원본 파일에서 선택한 요소의 위치·텍스트 상자 높이 변경과 삭제 결과를 저장합니다. 클릭 판정은 요소의 회전된 사각 영역 기준입니다. 그룹은 한 단위로 이동하며 배경과 마스터 요소는 편집 대상에서 제외됩니다.</p>
      </details>
  </InspectorSection>;
}
