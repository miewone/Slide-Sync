import {Button, SelectField, NumberField, InspectorSection} from "./ui.jsx";

/** MovePanel controls; native form values are owned by the editor runtime. */
export function MovePanel() {
  return <InspectorSection id="editor-section-move" title="요소 이동">
      <p className="help">빈 곳을 드래그하면 사각형 안에 완전히 포함된 요소를 적용 대상 슬라이드마다 선택합니다. 요소를 드래그하면 선택한 요소가 함께 이동합니다. 배경이 꽉 찬 슬라이드에서는 ‘영역 선택’을 켜세요.</p>
      <div className="separator">
      </div>
      <SelectField id="move-mode" label="이동 방식" options={[{"value": "absolute", "label": "모두 같은 위치로 맞추기"}, {"value": "relative", "label": "같은 거리만큼 이동하기"}]}/>
      <p id="position-help" className="field-help">선택 영역의 왼쪽 위 · 여러 요소는 간격 유지</p>
      <div className="coordinates">
      <NumberField id="x" labelId="x-label" label="X (cm)" defaultValue="0"/>
      <NumberField id="y" labelId="y-label" label="Y (cm)" defaultValue="0"/>
      </div>
      <Button id="move" variant="primary" full disabled>선택한 요소 이동</Button>
      <details className="shortcuts">
      <summary>선택·이동 단축키</summary>
      <dl>
      <dt>빈 곳에서 드래그</dt>
      <dd>사각형 범위로 선택</dd>
      <dt>Ctrl / Shift / ⌘ + 영역 드래그</dt>
      <dd>기존 선택에 추가</dd>
      <dt>Ctrl / Shift + 클릭</dt>
      <dd>선택 추가·해제</dd>
      <dt>Shift + 요소 드래그</dt>
      <dd>가로·세로 방향 고정</dd>
      <dt>방향키</dt>
      <dd>0.1 cm 이동</dd>
      <dt>Shift + 방향키</dt>
      <dd>1 cm 이동</dd>
      <dt>Ctrl + 방향키</dt>
      <dd>0.01 cm 이동</dd>
      <dt>Ctrl + A / Ctrl + Z</dt>
      <dd>전체 요소 선택 / 실행 취소</dd>
      <dt>Esc</dt>
      <dd>드래그 취소·선택 해제</dd>
      </dl>
      <p>방향키·전체 선택은 미리보기를 클릭한 상태에서 사용합니다. Mac에서는 Ctrl 대신 ⌘도 사용할 수 있습니다.</p>
      </details>
  </InspectorSection>;
}
