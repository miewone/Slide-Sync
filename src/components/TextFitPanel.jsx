import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {Button, Checkbox, SelectField, InspectorSection} from "./ui.jsx";

/** TextFitPanel controls; native form values are owned by the editor runtime. */
export function TextFitPanel() {
  useLanguage();
  return <>
      <InspectorSection id="editor-section-text-fit" initiallyOpen={false} title={t('TextFitPanel.1')}>
      <p className="field-help">{t('TextFitPanel.2')}</p>
      <SelectField id="fit-scope" label={t('TextFitPanel.3')} options={[{"value": "all", "label": t('TextFitPanel.4')}, {"value": "selected", "label": t('TextFitPanel.5')}]}/>
      <p id="fit-count" className="field-help">{t('TextFitPanel.6')}</p>
      <Button id="fit-text" full disabled>{t('TextFitPanel.7')}</Button>
      <SelectField id="fit-width-scope" label={t('textFit.widthScope')} defaultValue="selected" options={[{value:'all',label:t('TextFitPanel.4')},{value:'selected',label:t('TextFitPanel.5')}]}/>
      <div className="text-fit-options">
        <Checkbox id="fit-width-background" label={t('textFit.background')}/>
        <Checkbox id="fit-width-unwrap" label={t('textFit.unwrap')}/>
      </div>
      <Button id="fit-text-width" full disabled>{t('textFit.width')}</Button>
      <p className="field-help">{t('textFit.widthHelp')}</p>
      <p className="field-help">{t('TextFitPanel.8')}</p>
      </InspectorSection>
  </>;
}
