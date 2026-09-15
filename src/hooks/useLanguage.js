import {useSyncExternalStore} from 'react';
import {i18n} from '../i18n/I18n.js';

/** Subscribe a component without remounting it or resetting its local form state. */
export function useLanguage() {
  return useSyncExternalStore(i18n.subscribe,i18n.getLanguage,i18n.getLanguage);
}
