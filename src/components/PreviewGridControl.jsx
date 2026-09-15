import {useState} from 'react';
import {useLanguage} from '../hooks/useLanguage.js';
import {t} from '../i18n/I18n.js';

/**
 * Compact presets and inline columns × rows inputs; only valid values affect previews.
 * @param {object} props Current grid, disabled state and onChange({columns,rows}) callback.
 */
export function PreviewGridControl({grid,disabled,onChange}) {
  useLanguage();
  const [columns,setColumns]=useState(String(grid.columns??2)),[rows,setRows]=useState(String(grid.rows??2));
  const choose=value=>{
    setColumns(String(value));setRows(String(value));onChange({columns:value,rows:value});
  };
  const input=(key,value,setValue)=> <input id={`preview-grid-${key}`} type="number" min="1" max="8" step="1"
    aria-label={t(`previewGrid.${key}`)} title={t(`previewGrid.${key}`)} disabled={disabled} value={value}
    onChange={event=>{
      const draft=event.target.value;setValue(draft);
      const number=Number(draft);
      if(draft&&Number.isInteger(number)&&number>=1&&number<=8){
        const otherKey=key==='columns'?'rows':'columns';
        const otherDraft=Number(key==='columns'?rows:columns);
        const other=Number.isInteger(otherDraft)&&otherDraft>=1&&otherDraft<=8?otherDraft:2;
        if(key==='columns')setRows(String(other));else setColumns(String(other));
        onChange({[key]:number,[otherKey]:other});
      }
    }} onBlur={()=>setValue(String(grid[key]??2))} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}}}/>;
  return <div className="preview-grid-control" role="group" aria-label={t('previewGrid.label')}>
    <span className="preview-grid-label">{t('previewGrid.label')}</span>
    <button id="preview-grid-default" type="button" disabled={disabled} aria-pressed={grid.columns===null} onClick={()=>onChange({columns:null,rows:null})}>{t('previewGrid.default')}</button>
    <span className="preview-grid-divider" aria-hidden="true">·</span>
    <button id="preview-grid-2" type="button" disabled={disabled} aria-pressed={grid.columns===2&&grid.rows===2} onClick={()=>choose(2)}>2<span className="preview-grid-times">×</span>2</button>
    <span className="preview-grid-divider" aria-hidden="true">·</span>
    <button id="preview-grid-4" type="button" disabled={disabled} aria-pressed={grid.columns===4&&grid.rows===4} onClick={()=>choose(4)}>4<span className="preview-grid-times">×</span>4</button>
    <span className="preview-grid-divider" aria-hidden="true">·</span>
    <span className="preview-grid-inputs">{input('columns',columns,setColumns)}<span className="preview-grid-times" aria-hidden="true">×</span>{input('rows',rows,setRows)}</span>
  </div>;
}
