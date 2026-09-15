import {useEffect,useRef,useState} from 'react';
import {FontResources} from '../services/FontResources.js';
import {FontCatalogue} from '../services/FontCatalogue.js';
import {Button} from './ui.jsx';
import {t} from '../i18n/I18n.js';

/** Browser-only font replacements, shared by native preview and measurement. @param {object} props Original family, overrides and async lifecycle handler. */
export function NativeSlidesFonts({family,overrides,setOverrides,run}){
  const resources=useRef(null),[replacement,setReplacement]=useState('Arial'),file=useRef(null);
  const loader=()=>resources.current||(resources.current=new FontResources({base:import.meta.env.BASE_URL}));
  useEffect(()=>()=>{resources.current?.dispose();resources.current=null;},[]);
  const apply=result=>setOverrides(previous=>new Map(previous).set(family.trim(),result.family));
  return <details className="inspector-section"><summary>{t('native.previewFonts')}</summary>
    <p className="field-help">{t('native.previewFontHelp')}</p>
    <p>{t('native.fontFamily')}: {family||'—'}</p>
    <label htmlFor="native-preview-font">{t('native.replacement')}</label><input id="native-preview-font" value={replacement} onChange={e=>setReplacement(e.target.value)} list="native-font-options"/>
    <datalist id="native-font-options">{FontCatalogue.families.map(font=><option key={font.id} value={font.family}/>)}</datalist>
    <Button id="native-preview-font-apply" disabled={!family.trim()||!replacement.trim()} onClick={()=>run(async()=>{
      const font=FontCatalogue.match(replacement)?.font;
      const result=font?await loader().web(font,400):await loader().local(replacement,400,'normal');apply(result);
    })}>{t('native.apply')}</Button>
    <input ref={file} id="native-preview-font-file" type="file" accept=".otf,.ttf,.woff,.woff2" hidden onChange={event=>{
      const value=event.target.files?.[0];event.target.value='';if(!value)return;
      run(async()=>{if(value.size>32*1024*1024)throw Error(t('native.fontLimit'));apply(await loader().binary(await value.arrayBuffer(),{mode:'uploaded',label:value.name}));});
    }}/>
    <Button id="native-preview-font-upload" disabled={!family.trim()} onClick={()=>file.current.click()}>{t('native.uploadFont')}</Button>
    <Button id="native-preview-font-reset" disabled={!overrides.has(family.trim())} onClick={()=>setOverrides(previous=>{const next=new Map(previous);next.delete(family.trim());return next;})}>{t('native.originalFont')}</Button>
  </details>;
}
