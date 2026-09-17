import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {t} from '../i18n/I18n.js';
import {Button,Checkbox,SelectField} from './ui.jsx';

/** Open the shared selection dialog. @param {Event} event Context-menu event. @param {Function} apply Callback receiving criteria and scope. */
export function openSimilarSelection(event,apply){
  event.preventDefault();
  event.currentTarget.dispatchEvent(new CustomEvent('similar-selection',{bubbles:true,detail:{x:event.clientX,y:event.clientY,anchor:event.currentTarget,apply}}));
}

/** React-owned context menu for both document editors. @param {object} props Editor root reference. */
export function SimilarSelectionMenu({root}){
  const scopeId=useId();
  const [menu,setMenu]=useState(null),[criteria,setCriteria]=useState({layout:true,colors:false,format:false}),[scope,setScope]=useState('page'),panel=useRef(null);
  useEffect(()=>{const host=root.current,open=event=>{setMenu(event.detail);setScope('page');};host.addEventListener('similar-selection',open);return ()=>host.removeEventListener('similar-selection',open);},[root]);
  useEffect(()=>{
    if(!menu)return;
    const el=panel.current,r=el.getBoundingClientRect();el.style.left=`${Math.max(8,Math.min(menu.x,innerWidth-r.width-8))}px`;el.style.top=`${Math.max(8,Math.min(menu.y,innerHeight-r.height-8))}px`;el.querySelector('input').focus();
    const close=()=>setMenu(null),outside=e=>{if(!el.contains(e.target))close();},key=e=>{if(e.key==='Escape'){e.stopPropagation();close();menu.anchor.focus();}if(e.key==='Tab'){const items=[...el.querySelectorAll('input,select,button')].filter(n=>!n.disabled),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
    document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',key,true);window.addEventListener('resize',close);window.addEventListener('scroll',close,true);
    return ()=>{document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',key,true);window.removeEventListener('resize',close);window.removeEventListener('scroll',close,true);};
  },[menu]);
  if(!menu)return null;
  return createPortal(<form ref={panel} className="appearance-panel similar-selection-menu" role="dialog" aria-label={t('similar.title')} onSubmit={e=>{e.preventDefault();menu.apply(criteria,scope);setMenu(null);menu.anchor.focus();}}>
    <header><strong>{t('similar.title')}</strong></header>
    {['layout','colors','format'].map(key=><Checkbox key={key} name={key} label={t(`similar.${key}`)} checked={criteria[key]} onChange={e=>setCriteria(previous=>({...previous,[key]:e.target.checked}))}/>)}
    <div className="similar-selection-scope">
      <SelectField id={scopeId} label={t('similar.scope')} value={scope} onChange={e=>setScope(e.target.value)} options={[{value:'page',label:t('similar.page')},{value:'all',label:t('similar.all')}]}/>
    </div>
    <Button type="submit" variant="primary" full disabled={!Object.values(criteria).some(Boolean)}>{t('similar.apply')}</Button>
  </form>,document.body);
}
