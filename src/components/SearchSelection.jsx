import {useRef} from 'react';
import {Button} from './ui.jsx';

/**
 * Shared IME-safe literal-search input with explicit add/remove actions.
 * @param {object} props Stable IDs, labels, query/count state and onQueryChange/onApply callbacks.
 */
export function SearchSelection({idPrefix,label,placeholder,query,matchCount,selectedCount,summary,
  busy,hasSource,onQueryChange,onApply,selectId,removeId,help}) {
  const composing=useRef(false),blocked=busy || !hasSource || matchCount===0;
  return <section className="slide-search" aria-labelledby={`${idPrefix}-label`}>
    <label id={`${idPrefix}-label`} className="range-label" htmlFor={`${idPrefix}-query`}>{label}</label>
    <input id={`${idPrefix}-query`} type="search" placeholder={placeholder} value={query}
      disabled={busy || !hasSource} aria-describedby={`${idPrefix}-count ${idPrefix}-help`}
      onChange={event=>onQueryChange(event.target.value)}
      onCompositionStart={()=>{composing.current=true;}}
      onCompositionEnd={event=>{composing.current=false;onQueryChange(event.currentTarget.value);}}
      onKeyDown={event=>{
        if(event.key!=='Enter' || composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode===229)return;
        event.preventDefault();onApply(event.shiftKey?'remove':'select');
      }}/>
    <p id={`${idPrefix}-count`} className="field-help" role="status" aria-live="polite">
      {!hasSource?'파일을 열면 검색할 수 있습니다.':!query.trim()?'검색어를 입력하세요.':summary}
    </p>
    <div className="slide-search-actions">
      <Button id={selectId} disabled={blocked || selectedCount===matchCount} onClick={()=>onApply('select')}>일치 선택</Button>
      <Button id={removeId} disabled={blocked || selectedCount===0} onClick={()=>onApply('remove')}>일치 해제</Button>
    </div>
    <p id={`${idPrefix}-help`} className="field-help">{help || '대소문자 구분 없이 검색합니다.'}<br/>Enter: 선택 · Shift+Enter: 해제</p>
  </section>;
}
