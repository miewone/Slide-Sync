import {SearchSelection} from './SearchSelection.jsx';
import {useEditor,useEditorValue} from '../hooks/useEditor.js';

/** Search the deck without altering scope until the user selects or deselects matches. */
export function SlideSearch() {
  const {commands}=useEditor();
  const search=useEditorValue('slideSearch'),slides=useEditorValue('slides');
  const busy=useEditorValue('busy'),hasDeck=useEditorValue('hasDeck');
  const matches=new Set(search.matches);
  const selected=slides.reduce((count,slide)=>count+(slide.checked && matches.has(slide.index)?1:0),0);
  return <SearchSelection idPrefix="slide-search" label="문자열로 선택" placeholder="제목·본문 검색"
    query={search.query} matchCount={search.matches.length} selectedCount={selected}
    summary={`${search.matches.length}개 일치 · ${selected}개 선택됨`} busy={busy} hasSource={hasDeck}
    onQueryChange={commands.setSlideSearchQuery} onApply={commands.applySlideSearch}
    selectId="search-select" removeId="search-remove"/>;
}
