import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {memo,useLayoutEffect,useRef} from 'react';
import {scrollSidebarRow} from './scrollSidebarRow.js';
import {Button} from './ui.jsx';
import {SlideSearch} from './SlideSearch.jsx';
import {SelectionPanel} from './SelectionPanel.jsx';
import {useEditor, useEditorValue} from '../hooks/useEditor.js';

/** @param {object} props Slide display metadata and shared checked-state command. */
const SlideRow = memo(function SlideRow({index, title, checked, disabled, onCheck, matched, hovered, selectedCount=0}) {
  useLanguage();
  const row=useRef(null);
  useLayoutEffect(()=>{if(hovered && row.current)scrollSidebarRow(row.current);},[hovered]);
  return <label ref={row} data-slide-index={index} data-preview-hover={hovered?'true':undefined} data-selected-count={selectedCount} className={`slide-item${checked ? ' checked' : ''}${matched ? ' search-match' : ''}${hovered ? ' preview-hover' : ''}`} title={title}>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={event => onCheck(index, event.target.checked)}/>
    <span className="slide-item-body">
      <span className="slide-item-heading"><span className="slide-number">{String(index + 1).padStart(2, '0')}</span>
        <span className="slide-scope-state">{t(checked?'createEditorRuntime.36':'sidebar.excluded')}</span>
        {matched&&<span className="slide-match-label">{t('Sidebar.1')}</span>}
      </span>
      {selectedCount>0&&<span className="slide-element-count">{t('selection.selectedCount',{p0:selectedCount})}</span>}
      <span className="slide-label">{title}</span>
    </span>
  </label>;
});

/** React-owned slide scope list; does not recreate preview frames. */
export function Sidebar() {
  useLanguage();
  const slides = useEditorValue('slides');
  const busy = useEditorValue('busy');
  const selection=useEditorValue('selection');
  const selectedCounts=new Map(selection.rows.map(row=>[row.index,row.count||0]));
  const hoveredSlide = useEditorValue('hoveredSlide');
  const search = useEditorValue('slideSearch');
  const matches = new Set(search.matches);
  const {commands} = useEditor();
  return <aside className="sidebar">
    <div className="sidebar-head"><h2>{t('Sidebar.2')}</h2><span id="slide-count" className="count">{slides.length}</span></div>
    <div className="scope-actions">
      <button id="select-all" type="button" className="text-button" disabled={busy} onClick={() => commands.selectSlides(true)}>{t('Sidebar.3')}</button>
      <button id="select-none" type="button" className="text-button" disabled={busy} onClick={() => commands.selectSlides(false)}>{t('Sidebar.4')}</button>
    </div>
    <label className="range-label" htmlFor="range">{t('Sidebar.5')}</label>
    <div className="range-control"><input id="range" placeholder={t('Sidebar.6')} aria-label={t('Sidebar.7')}/><Button id="apply-range" className="compact">{t('GuidePanel.10')}</Button></div>
    <SlideSearch/>
    <div id="slide-list" className="slide-list">{slides.length ? slides.map(slide => <SlideRow key={slide.index} {...slide} disabled={busy} selectedCount={selectedCounts.get(slide.index)||0} hovered={hoveredSlide===slide.index} matched={matches.has(slide.index)} onCheck={commands.setSlideChecked}/>) : <p className="muted">{t('Sidebar.8')}</p>}</div>
    <SelectionPanel/>
    <div className="sidebar-bottom">{t('Sidebar.9')}</div>
  </aside>;
}
