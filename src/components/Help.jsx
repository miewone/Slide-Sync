import {useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';

/** Central catalog for option help. Consumers reference a key instead of duplicating copy. */
const HELP_TEXT = Object.freeze({
  'box-select-mode': {
    label:'영역 선택',
    text:'요소 위에서도 드래그로 영역을 그립니다. 영역 안에 완전히 포함된 요소를 적용 대상 슬라이드에서 함께 선택합니다. Ctrl·Shift·Cmd를 누르면 기존 선택에 추가합니다.',
  },
  'match-appearance': {
    label:'크기·색상·레이아웃 일치',
    text:'다음 클릭·영역 선택부터 기준 페이지와 크기, 채우기·테두리·글자색, 위치·회전·그룹 내부 배치가 같은 요소만 선택합니다. 기존 선택과 문자열 검색에는 적용되지 않습니다. 원본 서식이 다르면 화면상 같아 보여도 제외될 수 있습니다.',
  },
  'only-checked': {
    label:'선택한 슬라이드만 보기',
    text:'왼쪽 목록에서 적용 대상으로 체크한 슬라이드만 미리보기에 표시합니다. 끄면 모든 슬라이드가 다시 보이며, 적용 대상과 요소 선택은 유지됩니다.',
  },
});

/**
 * Shared help trigger with viewport-contained hover/focus text; clicking never toggles an option.
 * @param {object} props Component properties.
 * @param {string} props.helpKey Key in HELP_TEXT identifying the explanation to display.
 */
export function Help({helpKey}) {
  const id=useId(),trigger=useRef(null),tooltip=useRef(null);
  const [position,setPosition]=useState(null);
  const entry=HELP_TEXT[helpKey];
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
    <button ref={trigger} type="button" className="option-help" aria-label={`${entry.label} 도움말`}
      aria-describedby={position?id:undefined} onMouseEnter={show} onMouseLeave={leave}
      onFocus={show} onBlur={()=>setPosition(null)} onClick={show}
      onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();setPosition(null);}}}>?</button>
    {position && createPortal(<span ref={tooltip} id={id} role="tooltip" className="option-help-tooltip"
      style={position} onMouseLeave={leave}>{entry.text}</span>,document.body)}
  </>;
}
