import {useEffect,useState} from 'react';
import {Button} from './ui.jsx';
import {createPortal} from 'react-dom';
import {NativeSlidesFonts} from './NativeSlidesFonts.jsx';
import {t} from '../i18n/I18n.js';
import {NativeSlidesText} from '../editor/google/NativeSlidesText.js';
import {NativeSlidesSelection} from '../editor/google/NativeSlidesSelection.js';

/** Native text, appearance selection and guide controls. @param {object} props Shared document, scope, selection and lifecycle callbacks. */
export function NativeSlidesTools({model,checked,selected,setSelected,perform,run,guides,showGuides,setShowGuides,snap,setSnap,fontOverrides,setFontOverrides,toolbarHost,busy}){
  const [size,setSize]=useState('18'),[family,setFamily]=useState('Arial'),[fitScope,setFitScope]=useState('selected'),[unwrap,setUnwrap]=useState(false),[background,setBackground]=useState(false);
  const [axis,setAxis]=useState('x'),[position,setPosition]=useState('0'),[guideId,setGuideId]=useState(''),[criteria,setCriteria]=useState({size:true,colors:true,layout:true});
  const text=model.textShapes(checked,selected),hasText=!!text.length;
  useEffect(()=>{
    const reader=new NativeSlidesText(model),styles=text.map(e=>reader.inherited(e)),sizes=styles.map(s=>s.fontSize?.unit==='EMU'?s.fontSize.magnitude/12700:s.fontSize?.magnitude||18);
    setSize(sizes.length&&sizes.every(n=>n===sizes[0])?String(sizes[0]):'');
    const families=styles.map(s=>s.fontFamily||'Arial');setFamily(families.length&&families.every(n=>n===families[0])?families[0]:'');
  },[model,model.changes,selected,checked]);
  const format=patch=>perform(()=>model.format(checked,selected,patch));
  const fit=dimension=>run(async()=>{
    const elements=[...checked].flatMap(i=>model.elements(i)).filter(e=>!e.deleted&&(fitScope==='all'||selected.has(e.id)));
    const plans=await new NativeSlidesText(model,fontOverrides).measure(elements,dimension,{unwrap,background:dimension==='width'&&background});
    if(!plans.length)throw Error(t('native.noText'));
    model.resizeText(plans);
  });
  return <>
    <details className="inspector-section" open><summary>{t('native.appearance')}</summary>
      {Object.keys(criteria).map(key=><label key={key}><input type="checkbox" checked={criteria[key]} onChange={e=>setCriteria({...criteria,[key]:e.target.checked})}/>{t('native.'+key)}</label>)}
      <Button id="native-select-similar" disabled={!selected.size} onClick={()=>{
        const reference=[...checked].flatMap(i=>model.elements(i)).find(e=>selected.has(e.id)&&!e.deleted);if(!reference)return;
        setSelected(previous=>{const next=new Set(previous);for(const i of checked)for(const e of model.elements(i))if(NativeSlidesSelection.similar(reference,e,criteria))next.add(e.id);return next;});
      }}>{t('native.selectSimilar')}</Button>
    </details>
    {toolbarHost&&createPortal(<fieldset className="text-format-toolbar" disabled={busy} aria-label={t('textFormat.title')}><span className="text-format-label">{t('textFormat.title')}</span>
      <button type="button" id="native-format-decrease" disabled={!hasText} aria-label={t('textFormat.decrease')} onClick={()=>perform(()=>model.adjustFontSize(checked,selected,-1,e=>{const value=new NativeSlidesText(model).inherited(e).fontSize;return value?.unit==='EMU'?value.magnitude/12700:value?.magnitude||18;}))}>−</button>
      <input id="native-font-size" type="number" min="1" max="400" disabled={!hasText} aria-label={t('textFormat.size')} value={size} onChange={e=>setSize(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&size.trim())format({size:Number(size)});}}/>
      <button type="button" id="native-format-increase" disabled={!hasText} aria-label={t('textFormat.increase')} onClick={()=>perform(()=>model.adjustFontSize(checked,selected,1,e=>{const value=new NativeSlidesText(model).inherited(e).fontSize;return value?.unit==='EMU'?value.magnitude/12700:value?.magnitude||18;}))}>+</button>
      <button type="button" id="native-format-size" className="native-format-apply" disabled={!hasText||!size.trim()} onClick={()=>format({size:Number(size)})}>{t('native.apply')}</button><span className="text-format-divider"/>
      <button type="button" id="native-format-bold" className="text-format-bold" aria-label={t('textFormat.bold')} disabled={!hasText} onClick={()=>format({bold:!text.every(e=>new NativeSlidesText(model).inherited(e).bold)})}>B</button>
    </fieldset>,toolbarHost)}
    <details className="inspector-section"><summary>{t('native.fontFamily')}</summary>
      <label htmlFor="native-font-family">{t('native.fontFamily')}</label><input id="native-font-family" maxLength={200} value={family} onChange={e=>setFamily(e.target.value)}/>
      <Button id="native-format-family" disabled={!hasText||!family.trim()} onClick={()=>format({fontFamily:family})}>{t('native.apply')}</Button>
    </details>
    <NativeSlidesFonts family={family} overrides={fontOverrides} setOverrides={setFontOverrides} run={run}/>
    <details className="inspector-section" open><summary>{t('TextFitPanel.1')}</summary>
      <label htmlFor="native-fit-scope">{t('TextFitPanel.3')}</label><select id="native-fit-scope" value={fitScope} onChange={e=>setFitScope(e.target.value)}><option value="selected">{t('TextFitPanel.5')}</option><option value="all">{t('TextFitPanel.4')}</option></select>
      <Button id="native-fit-height" disabled={!checked.size||(fitScope==='selected'&&!hasText)} onClick={()=>fit('height')}>{t('TextFitPanel.7')}</Button>
      <label><input id="native-fit-unwrap" type="checkbox" checked={unwrap} onChange={e=>setUnwrap(e.target.checked)}/>{t('textFit.unwrap')}</label>
      <label><input id="native-fit-background" type="checkbox" checked={background} onChange={e=>setBackground(e.target.checked)}/>{t('textFit.background')}</label>
      <Button id="native-fit-width" disabled={!checked.size||(fitScope==='selected'&&!hasText)} onClick={()=>fit('width')}>{t('textFit.width')}</Button>
      <p className="field-help">{t('native.fitHelp')}</p>
    </details>
    <details className="inspector-section" open><summary>{t('native.guides')}</summary>
      <p className="field-help">{t('native.guideHelp')}</p>
      <label><input id="native-guide-visible" type="checkbox" checked={showGuides} onChange={e=>setShowGuides(e.target.checked)}/>{t('native.showGuides')}</label>
      <label><input id="native-guide-snap" type="checkbox" checked={snap} onChange={e=>setSnap(e.target.checked)}/>{t('native.snap')}</label>
      <label htmlFor="native-guide-axis">{t('native.axis')}</label><select id="native-guide-axis" value={axis} onChange={e=>setAxis(e.target.value)}><option value="x">X</option><option value="y">Y</option></select>
      <label htmlFor="native-guide-position">{t('native.position')}</label><input id="native-guide-position" type="number" step="0.1" value={position} onChange={e=>setPosition(e.target.value)}/>
      <Button id="native-guide-add" disabled={!position.trim()} onClick={()=>perform(()=>guides.add(axis,Number(position)*72/2.54))}>{t('native.add')}</Button>
      <label htmlFor="native-guide-list">{t('native.guides')}</label><select id="native-guide-list" value={guideId} onChange={e=>{setGuideId(e.target.value);const guide=guides.items.find(g=>g.id===e.target.value);if(guide){setAxis(guide.axis);setPosition(String(guide.pos*2.54/72));}}}><option value="">—</option>{guides.items.map(g=><option key={g.id} value={g.id}>{g.axis.toUpperCase()} {(g.pos*2.54/72).toFixed(2)} cm</option>)}</select>
      <div className="drive-actions"><Button id="native-guide-change" disabled={!guides.items.some(g=>g.id===guideId)||!position.trim()} onClick={()=>perform(()=>guides.change(guideId,Number(position)*72/2.54))}>{t('native.apply')}</Button>
        <Button id="native-guide-remove" disabled={!guides.items.some(g=>g.id===guideId)} onClick={()=>perform(()=>guides.remove(guideId))}>{t('drive.delete')}</Button>
        <Button id="native-guide-undo" disabled={!guides.undoStack.length} onClick={()=>perform(()=>guides.undo())}>{t('drive.undo')}</Button>
        <Button id="native-guide-redo" disabled={!guides.redoStack.length} onClick={()=>perform(()=>guides.redo())}>{t('drive.redo')}</Button></div>
    </details>
  </>;
}
