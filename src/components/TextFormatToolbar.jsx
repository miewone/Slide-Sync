import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';

/** Compact whole-box formatting controls; native values and pressed state belong to the runtime. */
export function TextFormatToolbar() {
  useLanguage();
  return <div id="text-format-toolbar" className="text-format-toolbar" role="group" aria-label={t('textFormat.title')}>
    <span className="text-format-label">{t('textFormat.title')}</span>
    <button type="button" id="text-format-decrease" aria-label={t('textFormat.decrease')} title={t('textFormat.decrease')} disabled>−</button>
    <input id="text-format-size" type="number" min="1" max="400" step="0.01" aria-label={t('textFormat.size')} title={t('textFormat.sizeHelp')} disabled/>
    <button type="button" id="text-format-increase" aria-label={t('textFormat.increase')} title={t('textFormat.increase')} disabled>+</button>
    <span className="text-format-divider" aria-hidden="true"/>
    <button type="button" id="text-format-bold" className="text-format-bold" aria-label={t('textFormat.bold')} title={t('textFormat.bold')} disabled>B</button>
  </div>;
}
