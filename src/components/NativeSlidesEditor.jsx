import {lazy,Suspense} from 'react';
import {t} from '../i18n/I18n.js';

const Workspace=lazy(()=>import('./NativeSlidesWorkspace.jsx'));

/** Load native editing only after a Google Slides document opens. @param {object} props Native document, source metadata, Google adapters and close callback. */
export function NativeSlidesEditor(props){
  return <Suspense fallback={<p role="status">{t('drive.working')}</p>}><Workspace {...props}/></Suspense>;
}
