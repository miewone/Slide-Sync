import {useState} from 'react';
import {t} from '../i18n/I18n.js';
import {GoogleSetupGuide} from './GoogleSetupGuide.jsx';
import {Button} from './ui.jsx';

/** User-owned Google project settings. @param {object} props Current values, busy state and save/cancel/remove callbacks. */
export function GoogleDriveSettings({value,busy,onSave,onCancel,onRemove}){
  const [draft,setDraft]=useState(()=>({clientId:value.clientId||'',apiKey:value.apiKey||'',appId:value.appId||''}));
  return <form id="drive-settings" className="drive-settings" autoComplete="off" onSubmit={event=>{event.preventDefault();onSave(draft);}}>
    <h3>{t('drive.settingsTitle')}</h3><p className="field-help">{t('drive.settingsHelp')}</p>
    <fieldset disabled={busy}>
      <label htmlFor="drive-client-id">{t('drive.settingsClient')}</label><input id="drive-client-id" value={draft.clientId} maxLength={250} spellCheck={false} autoCapitalize="none" required onChange={e=>setDraft({...draft,clientId:e.target.value})}/>
      <label htmlFor="drive-api-key">API Key</label><input id="drive-api-key" type="password" autoComplete="new-password" value={draft.apiKey} maxLength={104} required onChange={e=>setDraft({...draft,apiKey:e.target.value})}/>
      <label htmlFor="drive-app-id">{t('drive.settingsProject')}</label><input id="drive-app-id" inputMode="numeric" value={draft.appId} maxLength={30} required onChange={e=>setDraft({...draft,appId:e.target.value})}/>
      <p className="field-help">{t('drive.settingsOrigin')} <code>{location.origin}</code></p>
      <a href="https://developers.google.com/workspace/drive/picker/guides/web-picker" target="_blank" rel="noopener noreferrer">{t('drive.settingsGuide')}</a>
      <GoogleSetupGuide/>
      <div className="drive-actions"><button type="submit" className="button primary" id="drive-settings-save">{t('drive.settingsSave')}</button>
        {onCancel&&<Button id="drive-settings-cancel" onClick={onCancel}>{t('drive.cancel')}</Button>}
        {onRemove&&<Button id="drive-settings-remove" onClick={onRemove}>{t('drive.settingsRemove')}</Button>}
      </div>
    </fieldset>
  </form>;
}
