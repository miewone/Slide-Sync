import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {Button,InspectorSection,NumberField} from './ui.jsx';
import {useState} from 'react';

const runtimeControls={id:name=>name,props:(name,defaults={})=>({id:name,...defaults})};

/** Resize each selected object about its own center. @param {object} props Shared editor control bindings. */
export function ResizePanel({controls=runtimeControls}){
  useLanguage();
  return <InspectorSection id={controls.id('editor-section-resize')} title={t('resize.title')} initiallyOpen={false}>
    <p className="field-help">{t('resize.help')}</p>
    <div className="coordinates">
      <NumberField {...controls.props('resize-width',{defaultValue:'100'})} label={t('resize.width')} min="1" max="1000" step="1"/>
      <NumberField {...controls.props('resize-height',{defaultValue:'100'})} label={t('resize.height')} min="1" max="1000" step="1"/>
    </div>
    <Button {...controls.props('resize-apply',{disabled:true})} variant="primary" full>{t('resize.apply')}</Button>
  </InspectorSection>;
}

/** Native adapter for the standalone resize panel. @param {object} props Model, checked slides, selection, busy state and edit callback. */
export function NativeResizePanel({model,checked,selected,busy,perform}){
  const [width,setWidth]=useState('100'),[height,setHeight]=useState('100');
  const enabled=[...checked].some(i=>model.elements(i).some(e=>selected.has(e.id)&&!e.deleted&&e.box));
  const entries={'resize-width':{value:width,onChange:e=>setWidth(e.target.value),disabled:busy},'resize-height':{value:height,onChange:e=>setHeight(e.target.value),disabled:busy},'resize-apply':{disabled:busy||!enabled,onClick:()=>perform(()=>model.resize(checked,selected,Number(width),Number(height)))}};
  const controls={id:name=>'native-'+name,props:(name,defaults={})=>{const props={id:'native-'+name,...defaults,...entries[name]};if('value' in props)delete props.defaultValue;return props;}};
  return <ResizePanel controls={controls}/>;
}
