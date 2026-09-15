import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Button} from './ui.jsx';
import {ElementNamePopover} from './ElementNamePopover.jsx';

/**
 * Shared IME-safe literal-search input with explicit add/remove actions.
 * @param {object} props Stable IDs, query/count state, action callbacks and optional name suggestions/onSuggestionPick.
 */
export function SearchSelection({idPrefix,label,placeholder,query,matchCount,selectedCount,summary,
  busy,hasSource,onQueryChange,onApply,selectId,removeId,help,suggestions,onSuggestionPick}) {
  useLanguage();
  const composing=useRef(false),blocked=busy || !hasSource || matchCount===0;
  const inputRef=useRef(null),[namesOpen,setNamesOpen]=useState(false);
  const closeNames=useCallback(()=>setNamesOpen(false),[]);
  const hasSuggestions=!!suggestions,popoverId=`${idPrefix}-names`,showNames=namesOpen && !busy && hasSource;
  useEffect(()=>{if(busy || !hasSource)closeNames();},[busy,hasSource,closeNames]);
  return <section className="slide-search" aria-labelledby={`${idPrefix}-label`}>
    <label id={`${idPrefix}-label`} className="range-label" htmlFor={`${idPrefix}-query`}>{label}</label>
    <input ref={inputRef} id={`${idPrefix}-query`} type="search" placeholder={placeholder} value={query}
      disabled={busy || !hasSource} aria-describedby={`${idPrefix}-count ${idPrefix}-help`}
      aria-haspopup={hasSuggestions?'dialog':undefined} aria-expanded={hasSuggestions?showNames:undefined}
      aria-controls={hasSuggestions && showNames?popoverId:undefined}
      onFocus={()=>{if(hasSuggestions)setNamesOpen(true);}}
      onChange={event=>onQueryChange(event.target.value)}
      onCompositionStart={()=>{composing.current=true;}}
      onCompositionEnd={event=>{composing.current=false;onQueryChange(event.currentTarget.value);}}
      onKeyDown={event=>{
        if(composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode===229)return;
        if(event.key==='Escape' && showNames){event.preventDefault();event.stopPropagation();closeNames();return;}
        if(event.key==='ArrowDown' && hasSuggestions){
          event.preventDefault();setNamesOpen(true);
          requestAnimationFrame(()=>{
            if(document.activeElement===inputRef.current)document.getElementById(popoverId)?.querySelector('.element-name-item')?.focus();
          });
          return;
        }
        if(event.key!=='Enter')return;
        event.preventDefault();onApply(event.shiftKey?'remove':'select');
      }}/>
    {hasSuggestions && <ElementNamePopover anchorRef={inputRef} id={popoverId} items={suggestions}
      open={showNames} onClose={closeNames} onPick={name=>{onSuggestionPick(name);inputRef.current?.focus();}}/>}
    <p id={`${idPrefix}-count`} className="field-help" role="status" aria-live="polite">
      {!hasSource?t('SearchSelection.1'):!query.trim()?t('SearchSelection.2'):summary}
    </p>
    <div className="slide-search-actions">
      <Button id={selectId} disabled={blocked || selectedCount===matchCount} onClick={()=>onApply('select')}>{t('SearchSelection.3')}</Button>
      <Button id={removeId} disabled={blocked || selectedCount===0} onClick={()=>onApply('remove')}>{t('SearchSelection.4')}</Button>
    </div>
    <p id={`${idPrefix}-help`} className="field-help">{help || t('SearchSelection.5')}<br/>{t('SearchSelection.6')}{hasSuggestions && <><br/>{t('SearchSelection.7')}</>}</p>
  </section>;
}
