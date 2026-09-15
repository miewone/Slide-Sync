import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {Button, SelectField, InspectorSection} from './ui.jsx';
import {alignmentGroups, distributionActions} from '../editor/layout-options.js';

const targets = ()=>[{value:'selection', label:t('LayoutPanel.1')}, {value:'slide', label:t('LayoutPanel.2')}];

/** @param {object} props Action/label pairs, grid class and accessible group name. */
function ActionGrid({actions, className, label}) {
  useLanguage();
  return <div className={className}>{actions.map(([action, text]) =>
    <Button key={action} data-layout={action} aria-label={`${label} ${text}`} title={`${label}: ${text}`} disabled>{text}</Button>)}</div>;
}

/** Direction-specific alignment controls, directly below the current selection. */
export function LayoutPanel() {
  useLanguage();
  return <InspectorSection id="editor-section-layout" title={t('LayoutPanel.3')}>
    <SelectField id="layout-target" label={t('LayoutPanel.4')} options={targets()}/>
    {alignmentGroups().map(group => <fieldset key={group.label} className="alignment-group">
      <legend>{group.label}</legend>
      <ActionGrid className="align-grid" actions={group.actions} label={group.label}/>
    </fieldset>)}
    <p id="layout-help" className="field-help">{t('LayoutPanel.5')}</p>
    <details className="spacing-options"><summary>{t('LayoutPanel.6')}</summary>
      <ActionGrid className="distribute-grid" actions={distributionActions()} label={t('LayoutPanel.6')}/>
      <p className="field-help">{t('LayoutPanel.7')}</p>
    </details>
  </InspectorSection>;
}
