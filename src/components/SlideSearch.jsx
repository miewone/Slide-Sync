import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {SearchSelection} from './SearchSelection.jsx';
import {useEditor,useEditorValue} from '../hooks/useEditor.js';

/** Search the deck without altering scope until the user selects or deselects matches. */
export function SlideSearch() {
  useLanguage();
  const {commands}=useEditor();
  const search=useEditorValue('slideSearch'),slides=useEditorValue('slides');
  const busy=useEditorValue('busy'),hasDeck=useEditorValue('hasDeck');
  const matches=new Set(search.matches);
  const selected=slides.reduce((count,slide)=>count+(slide.checked && matches.has(slide.index)?1:0),0);
  return <SearchSelection idPrefix="slide-search" label={t('SlideSearch.1')} placeholder={t('SlideSearch.2')}
    query={search.query} matchCount={search.matches.length} selectedCount={selected}
    summary={t('SlideSearch.3', {p0: search.matches.length, p1: selected})} busy={busy} hasSource={hasDeck}
    onQueryChange={commands.setSlideSearchQuery} onApply={commands.applySlideSearch}
    selectId="search-select" removeId="search-remove"/>;
}
