import {useState} from 'react';
import {t} from '../i18n/I18n.js';
import {GoogleSetupCommands} from '../services/google/GoogleSetupCommands.js';
import {Button} from './ui.jsx';

/** Copyable gcloud instructions plus the remaining OAuth console steps. */
export function GoogleSetupGuide(){
  const [message,setMessage]=useState('');
  const commands=GoogleSetupCommands.create(location.origin);
  return <details className="google-setup-guide" id="google-setup-guide">
    <summary>{t('drive.gcloudTitle')}</summary>
    <p className="field-help">{t('drive.gcloudHelp')}</p>
    <p className="field-help">{t('drive.gcloudExisting')}</p>
    <Button id="google-setup-copy" onClick={async()=>{
      try{await navigator.clipboard.writeText(commands);setMessage('drive.gcloudCopied');}
      catch{setMessage('drive.gcloudCopyFailed');}
    }}>{t('drive.gcloudCopy')}</Button>
    {message&&<p role="status">{t(message)}</p>}
    <pre id="google-setup-commands" tabIndex={0}><code>{commands}</code></pre>
    <h4>{t('drive.gcloudConsoleTitle')}</h4>
    <ol><li>{t('drive.gcloudConsent')} <a href="https://console.cloud.google.com/auth/branding" target="_blank" rel="noopener noreferrer">{t('drive.gcloudBranding')}</a></li>
      <li>{t('drive.gcloudClient')} <a href="https://console.cloud.google.com/auth/clients" target="_blank" rel="noopener noreferrer">{t('drive.settingsClient')}</a></li>
      <li>{t('drive.settingsOrigin')} <code>{location.origin}</code>{location.hostname==='localhost'&&<>, <code>http://localhost</code></>}</li>
      <li>{t('drive.gcloudFinish')}</li></ol>
    <a href="https://docs.cloud.google.com/sdk/gcloud/reference/services/api-keys/create" target="_blank" rel="noopener noreferrer">{t('drive.gcloudReference')}</a>
  </details>;
}
