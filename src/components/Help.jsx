import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';

/** Central catalog for option help. Consumers reference a key instead of duplicating copy. */
const helpEntries = ()=>({
  'delete-selection': {
    label:t('Help.1'),
    text:t('Help.2'),
  },
  'box-select-mode': {
    label:t('Help.3'),
    text:t('Help.4'),
  },
  'match-appearance': {
    label:t('Help.5'),
    text:t('Help.6'),
  },
  'only-checked': {
    label:t('Help.7'),
    text:t('Help.8'),
  },
});

/**
 * Shared help trigger with viewport-contained hover/focus text; clicking never toggles an option.
 * @param {object} props Component properties.
 * @param {string} props.helpKey Key in HELP_TEXT identifying the explanation to display.
 */
export function Help({helpKey}) {
  useLanguage();
  const id=useId(),trigger=useRef(null),tooltip=useRef(null);
  const [position,setPosition]=useState(null);
  const entry=helpEntries()[helpKey];
  if(!entry)return null;
  const show=()=>{
    const rect=trigger.current.getBoundingClientRect(),width=Math.min(300,window.innerWidth-24);
    setPosition({left:Math.max(12,Math.min(rect.left,window.innerWidth-width-12)),top:rect.bottom+8,width});
  };
  const leave=event=>{
    const next=event.relatedTarget;
    if(next instanceof Node && (trigger.current?.contains(next)||tooltip.current?.contains(next)))return;
    if(document.activeElement!==trigger.current)setPosition(null);
  };
  return <>
    <button ref={trigger} type="button" className="option-help" aria-label={t('Help.9', {p0: entry.label})}
      aria-describedby={position?id:undefined} onMouseEnter={show} onMouseLeave={leave}
      onFocus={show} onBlur={()=>setPosition(null)} onClick={show}
      onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();setPosition(null);}}}>?</button>
    {position && createPortal(<span ref={tooltip} id={id} role="tooltip" className="option-help-tooltip"
      style={position} onMouseLeave={leave}>{entry.text}</span>,document.body)}
  </>;
}
