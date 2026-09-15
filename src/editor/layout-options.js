import {t} from '../i18n/I18n.js';
/** Shared action labels used by the alignment UI and completion messages. */
export const alignmentGroups = ()=>[
  {label:t('layout-options.1'),actions:[['left',t('layout-options.2')],['center',t('layout-options.3')],['right',t('layout-options.4')]]},
  {label:t('layout-options.5'),actions:[['top',t('layout-options.6')],['middle',t('layout-options.7')],['bottom',t('layout-options.8')]]},
];

/** Spacing actions preserve the two outermost elements. */
export const distributionActions = ()=>[['horizontal',t('layout-options.9')],['vertical',t('layout-options.10')]];

/** @param {string} action Layout action identifier. Return a user-facing result label. */
export function layoutActionLabel(action) {
  for(const group of alignmentGroups()) {
    const item=group.actions.find(([value])=>value===action);
    if(item)return `${group.label} · ${item[1]}`;
  }
  return distributionActions().find(([value])=>value===action)?.[1] || t('layout-options.11');
}
