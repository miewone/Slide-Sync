import {useEffect,useSyncExternalStore} from 'react';
import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';
import {analyticsConsent} from '../services/AnalyticsConsent.js';
import {Button} from './ui.jsx';

/** Non-blocking analytics choice; refusal does not prevent editing or Google authorization. */
export function AnalyticsConsentBanner(){
  useLanguage();const state=useSyncExternalStore(analyticsConsent.subscribe,analyticsConsent.getSnapshot);
  useEffect(()=>{analyticsConsent.start();},[]);
  if(!analyticsConsent.enabled||state.choice&&!state.open)return null;
  return <section className="analytics-consent" id="analytics-consent" aria-labelledby="analytics-consent-title" onKeyDownCapture={e=>e.stopPropagation()}>
    <h2 id="analytics-consent-title">{t('consent.title')}</h2><p>{t('consent.description')}</p>
    <a href={`${import.meta.env.BASE_URL}privacy.html#korean`} target="_blank" rel="noopener noreferrer">{t('legal.privacy')}</a>
    <div className="drive-actions"><Button id="analytics-reject" onClick={()=>analyticsConsent.choose(false)}>{t('consent.reject')}</Button><Button id="analytics-accept" onClick={()=>analyticsConsent.choose(true)}>{t('consent.accept')}</Button>
      {state.choice&&<Button id="analytics-close" onClick={()=>analyticsConsent.close()}>{t('drive.close')}</Button>}</div>
  </section>;
}

/** Reopen analytics choices from the editor footer. */
export function AnalyticsSettingsButton(){return analyticsConsent.enabled?<button type="button" id="analytics-settings" className="policy-button" onClick={()=>analyticsConsent.open()}>{t('consent.settings')}</button>:null;}
