import {memo,useLayoutEffect,useRef} from 'react';
import {scrollSidebarRow} from './scrollSidebarRow.js';
import {Button} from './ui.jsx';
import {SlideSearch} from './SlideSearch.jsx';
import {useEditor, useEditorValue} from '../hooks/useEditor.js';

/** @param {object} props Slide display metadata and shared checked-state command. */
const SlideRow = memo(function SlideRow({index, title, checked, disabled, onCheck, matched, hovered}) {
  const row=useRef(null);
  useLayoutEffect(()=>{if(hovered && row.current)scrollSidebarRow(row.current);},[hovered]);
  return <label ref={row} data-slide-index={index} data-preview-hover={hovered?'true':undefined} className={`slide-item${checked ? ' checked' : ''}${matched ? ' search-match' : ''}${hovered ? ' preview-hover' : ''}`} title={title}>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={event => onCheck(index, event.target.checked)}/>
    <span className="slide-number">{String(index + 1).padStart(2, '0')}</span><span className="slide-label">{title}</span>{matched && <span className="slide-match-label">일치</span>}
  </label>;
});

/** React-owned slide scope list; does not recreate preview frames. */
export function Sidebar() {
  const slides = useEditorValue('slides');
  const busy = useEditorValue('busy');
  const hoveredSlide = useEditorValue('hoveredSlide');
  const search = useEditorValue('slideSearch');
  const matches = new Set(search.matches);
  const {commands} = useEditor();
  return <aside className="sidebar">
    <div className="sidebar-head"><h2>슬라이드</h2><span id="slide-count" className="count">{slides.length}</span></div>
    <div className="scope-actions">
      <button id="select-all" type="button" className="text-button" disabled={busy} onClick={() => commands.selectSlides(true)}>전체 선택</button>
      <button id="select-none" type="button" className="text-button" disabled={busy} onClick={() => commands.selectSlides(false)}>선택 해제</button>
    </div>
    <label className="range-label" htmlFor="range">번호로 선택</label>
    <div className="range-control"><input id="range" placeholder="예: 1, 3–5" aria-label="적용할 슬라이드 번호"/><Button id="apply-range" className="compact">적용</Button></div>
    <SlideSearch/>
    <div id="slide-list" className="slide-list">{slides.length ? slides.map(slide => <SlideRow key={slide.index} {...slide} disabled={busy} hovered={hoveredSlide===slide.index} matched={matches.has(slide.index)} onCheck={commands.setSlideChecked}/>) : <p className="muted">파일을 열면 슬라이드가 표시됩니다.</p>}</div>
    <div className="sidebar-bottom">체크한 슬라이드에 함께 적용됩니다.</div>
  </aside>;
}
