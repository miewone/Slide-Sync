import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {Button, SelectField, NumberField, InspectorSection} from "./ui.jsx";

/** MovePanel controls; native form values are owned by the editor runtime. */
export function MovePanel() {
  useLanguage();
  return <InspectorSection id="editor-section-move" title={t('MovePanel.1')}>
      <p className="help">{t('MovePanel.2')}</p>
      <div className="separator">
      </div>
      <SelectField id="move-mode" label={t('MovePanel.3')} options={[{"value": "absolute", "label": t('MovePanel.4')}, {"value": "relative", "label": t('MovePanel.5')}]}/>
      <p id="position-help" className="field-help">{t('MovePanel.6')}</p>
      <div className="coordinates">
      <NumberField id="x" labelId="x-label" label={t('coordinate.x')} defaultValue="0"/>
      <NumberField id="y" labelId="y-label" label={t('coordinate.y')} defaultValue="0"/>
      </div>
      <Button id="move" variant="primary" full disabled>{t('MovePanel.7')}</Button>
      <details className="shortcuts">
      <summary>{t('MovePanel.8')}</summary>
      <dl>
      <dt>{t('MovePanel.9')}</dt>
      <dd>{t('MovePanel.10')}</dd>
      <dt>{t('MovePanel.11')}</dt>
      <dd>{t('MovePanel.12')}</dd>
      <dt>{t('MovePanel.13')}</dt>
      <dd>{t('MovePanel.14')}</dd>
      <dt>{t('MovePanel.15')}</dt>
      <dd>{t('MovePanel.16')}</dd>
      <dt>{t('MovePanel.17')}</dt>
      <dd>{t('MovePanel.18')}</dd>
      <dt>{t('MovePanel.19')}</dt>
      <dd>{t('MovePanel.20')}</dd>
      <dt>{t('MovePanel.21')}</dt>
      <dd>{t('MovePanel.22')}</dd>
      <dt>{t('MovePanel.23')}</dt>
      <dd>{t('MovePanel.24')}</dd>
      <dt>{t('MovePanel.25')}</dt>
      <dd>{t('MovePanel.26')}</dd>
      </dl>
      <p>{t('MovePanel.27')}</p>
      </details>
  </InspectorSection>;
}
