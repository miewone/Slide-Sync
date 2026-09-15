import {useRef,useState,useLayoutEffect} from 'react';
import {useLanguage} from '../hooks/useLanguage.js';
import {useEditor,useEditorValue} from '../hooks/useEditor.js';
import {t} from '../i18n/I18n.js';
import {Checkbox} from './ui.jsx';

/** Floating selection criteria; preferences affect subsequent clicks and ranges only. */
export function AppearanceControl() {
  useLanguage();
  const {commands}=useEditor(),criteria=useEditorValue('appearanceCriteria'),busy=useEditorValue('busy');
  const anchor=useRef(null),panel=useRef(null);
  const [open,setOpen]=useState(false);
  useLayoutEffect(()=>{
    if(!open)return;
    const place=()=>{
      const rect=anchor.current.getBoundingClientRect(),box=panel.current;
      box.style.left=`${Math.max(12,Math.min(rect.left,window.innerWidth-box.offsetWidth-12))}px`;
      box.style.top=`${Math.max(12,Math.min(rect.bottom+8,window.innerHeight-box.offsetHeight-12))}px`;
    };
    place();panel.current.querySelector('input')?.focus();window.addEventListener('resize',place);document.addEventListener('scroll',place,true);
    return ()=>{window.removeEventListener('resize',place);document.removeEventListener('scroll',place,true);};
  },[open]);
  return <div className="appearance-control" ref={anchor}>
    <Checkbox variant="chip" id="match-appearance" label={t('Help.5')} helpKey="match-appearance"
      onChange={event=>{if(event.target.checked)panel.current.showPopover();}}/>
    <button id="appearance-settings" type="button" className="appearance-settings" disabled={busy}
      popoverTarget="appearance-panel" aria-haspopup="dialog" aria-expanded={open} aria-label={t('appearance.settings')}>▾</button>
    <section id="appearance-panel" ref={panel} popover="auto" role="dialog" aria-labelledby="appearance-title"
      className="appearance-panel" onToggle={event=>setOpen(event.newState==='open')}
      onKeyDownCapture={event=>{if(event.key==='Escape'){event.stopPropagation();panel.current.hidePopover();anchor.current.querySelector('#appearance-settings').focus();}}}>
      <header><strong id="appearance-title">{t('appearance.settings')}</strong>
        <button type="button" aria-label={t('appearance.close')} onClick={()=>{panel.current.hidePopover();anchor.current.querySelector('#appearance-settings').focus();}}>×</button></header>
      <p>{t('appearance.description')}</p>
      {['size','colors','layout'].map(key=><Checkbox key={key} id={`appearance-${key}`} label={t(`appearance.${key}`)}
        autoFocus={key==='size'} checked={criteria[key]} disabled={busy} onChange={event=>commands.setAppearanceCriterion(key,event.target.checked)}/>)}
      <small>{t('appearance.empty')}</small>
    </section>
  </div>;
}
