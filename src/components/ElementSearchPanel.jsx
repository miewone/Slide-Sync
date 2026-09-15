import {InspectorSection} from './ui.jsx';
import {SearchSelection} from './SearchSelection.jsx';
import {useEditor,useEditorValue} from '../hooks/useEditor.js';

/** Search and select editable elements within the checked slide scope. */
export function ElementSearchPanel() {
  const {commands}=useEditor(),search=useEditorValue('elementSearch');
  const busy=useEditorValue('busy'),hasDeck=useEditorValue('hasDeck');
  return <InspectorSection id="editor-section-search" title="문자열로 요소 선택">
    <SearchSelection idPrefix="element-search" label="요소 이름·텍스트 검색" placeholder="찾을 문자열 입력"
      query={search.query} matchCount={search.matches.length} selectedCount={search.selected}
      summary={`${search.matches.length}개 요소 · ${search.slides}개 슬라이드 일치 · ${search.selected}개 선택됨`}
      busy={busy} hasSource={hasDeck} onQueryChange={commands.setElementSearchQuery} onApply={commands.applyElementSearch}
      selectId="element-search-select" removeId="element-search-remove"
      help="체크한 슬라이드에서 검색합니다. 그룹은 전체를 선택합니다."/>
  </InspectorSection>;
}
