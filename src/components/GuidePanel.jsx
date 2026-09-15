import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {Button, Checkbox, InspectorSection} from "./ui.jsx";

/** GuidePanel controls; native form values are owned by the editor runtime. */
export function GuidePanel() {
  useLanguage();
  return <>
      <InspectorSection id="editor-section-guides" initiallyOpen={false} title={t('GuidePanel.1')}>
      <div className="guide-options">
      <Checkbox id="guides-visible" label={t('GuidePanel.2')} defaultChecked/>
      <Checkbox id="guides-snap" label={t('GuidePanel.3')} defaultChecked/>
      <Checkbox id="guides-edit" label={t('GuidePanel.4')}/>
      </div>
      <div className="guide-add">
      <Button id="guide-horizontal" disabled>{t('GuidePanel.5')}</Button>
      <Button id="guide-vertical" disabled>{t('GuidePanel.6')}</Button>
      </div>
      <p id="guide-count" className="field-help">{t('GuidePanel.7')}</p>
      <label className="field-label" htmlFor="guide-select">{t('GuidePanel.8')}</label>
      <select id="guide-select" disabled>
      </select>
      <label className="field-label" id="guide-axis" htmlFor="guide-position">{t('GuidePanel.9')}</label>
      <div className="guide-position-row">
      <input id="guide-position" type="number" step="0.1" disabled/>
      <Button id="guide-apply" disabled>{t('GuidePanel.10')}</Button>
      <Button id="guide-delete" disabled>{t('GuidePanel.11')}</Button>
      </div>
      <p id="guide-readonly" className="field-help" hidden>{t('GuidePanel.12')}</p>
      <p className="field-help">{t('GuidePanel.13')}</p>
      </InspectorSection>
  </>;
}
