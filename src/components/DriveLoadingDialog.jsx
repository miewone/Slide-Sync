import {useEffect,useRef} from 'react';
import {t} from '../i18n/I18n.js';
import {useLanguage} from '../hooks/useLanguage.js';

/** Show classic folder-to-folder paper transfer until a Drive file opens. @param {object} props Optional fileName identifies the selected document. */
export function DriveLoadingDialog({fileName=''}) {
  useLanguage();
  const dialog=useRef(null);
  useEffect(()=>{dialog.current.showModal();dialog.current.focus();},[]);
  return <dialog ref={dialog} id="drive-loading-dialog" className="drive-dialog drive-loading-dialog" aria-labelledby="drive-loading-title" tabIndex={-1}
    onCancel={event=>event.preventDefault()} onKeyDownCapture={event=>{event.stopPropagation();if(event.key==='Escape')event.preventDefault();}}>
    <div className="drive-transfer-animation" aria-hidden="true">
      {[0,1].map(index=><svg key={index} className={`drive-transfer-folder ${index?'drive-transfer-destination':''}`} viewBox="0 0 36 34" width="40" height="38" shapeRendering="crispEdges">
        <path d="M3 9V5h12l4 4h12v21H3Z" fill="#e5e58b" stroke="#77774b"/>
        <path d="M4 6h10l4 4h12" fill="none" stroke="#ffffcf"/>
        {!index&&<><path d="m7 15 9-13 12 9-9 13Z" fill="white" stroke="#777"/><path d="m17 5 7 6m-9-3 7 6" stroke="#b8b8b8"/></>}
        <path d="M2 15h12l3-3h15l-2 18H4Z" fill="#dede72" stroke="#77774b"/>
        <path d="M3 16h12l3-3h13" fill="none" stroke="#ffffbf"/>
        <path d="M5 31h26" stroke="#555"/>
      </svg>)}
      {[0,1].map(index=><div key={index} className={`drive-flying-page ${index?'drive-flying-page-next':''}`}>
        <svg viewBox="0 0 22 28" width="22" height="28"><path d="M2 1h12l6 7v18H2Z" fill="#fff" stroke="#555"/><path d="M14 1v7h6" fill="#d5d5d5" stroke="#777"/><path d="M5 12h11M5 16h11M5 20h8" stroke="#b2b2b2"/></svg>
      </div>)}
    </div>
    <h2 id="drive-loading-title" role="status">{t('drive.loadingFile')}</h2>
    {fileName&&<p className="drive-loading-name">{fileName}</p>}
  </dialog>;
}
