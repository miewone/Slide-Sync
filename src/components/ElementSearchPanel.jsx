import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {InspectorSection} from './ui.jsx';
import {SearchSelection} from './SearchSelection.jsx';
import {useEditor,useEditorValue} from '../hooks/useEditor.js';

/** Search and select editable elements within the checked slide scope. */
export function ElementSearchPanel() {
  useLanguage();
  const {commands}=useEditor(),search=useEditorValue('elementSearch');
  const busy=useEditorValue('busy'),hasDeck=useEditorValue('hasDeck');
  return <InspectorSection id="editor-section-search" title={t('ElementSearchPanel.1')}>
    <SearchSelection idPrefix="element-search" label={t('ElementSearchPanel.2')} placeholder={t('ElementSearchPanel.3')}
      query={search.query} matchCount={search.matches.length} selectedCount={search.selected}
      summary={t('ElementSearchPanel.4', {p0: search.matches.length, p1: search.slides, p2: search.selected})}
      busy={busy} hasSource={hasDeck} onQueryChange={commands.setElementSearchQuery} onApply={commands.applyElementSearch}
      selectId="element-search-select" removeId="element-search-remove"
      suggestions={search.names} onSuggestionPick={commands.selectElementName}
      help={t('ElementSearchPanel.5')}/>
  </InspectorSection>;
}
