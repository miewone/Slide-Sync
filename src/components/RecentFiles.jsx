import {useRef} from 'react';
import {Button} from './ui.jsx';
import {useEditor,useEditorValue} from '../hooks/useEditor.js';

/** Explicit recent-file chooser; opening the list never opens a presentation. */
export function RecentFiles() {
  const dialog=useRef(null),trigger=useRef(null);
  const {commands}=useEditor();
  const recent=useEditorValue('recentFiles'),busy=useEditorValue('busy'),ready=useEditorValue('ready');
  const blocked=busy||recent.busy||!ready;
  const close=()=>dialog.current.close();
  return <>
    <Button id="recent-files-open" ref={trigger} disabled={!ready||busy} onClick={()=>{
      dialog.current.showModal();commands.refreshRecentFiles();
    }}>최근 PPTX{recent.files.length?` (${recent.files.length})`:''}</Button>
    <dialog ref={dialog} id="recent-files-dialog" className="recent-files-dialog" aria-labelledby="recent-files-title"
      aria-describedby="recent-files-help" onClose={()=>trigger.current?.focus()} onKeyDown={event=>event.stopPropagation()}>
      <div className="recent-files-heading"><h2 id="recent-files-title">최근 사용한 PPTX</h2>
        <Button id="recent-files-close" onClick={close}>닫기</Button></div>
      <p id="recent-files-help" className="field-help">이 브라우저에 보관한 원본 파일입니다. 사용할 파일을 선택하세요.<br/>
        편집 내용은 자동 저장되지 않습니다. 수정본은 다운로드해 보관하세요.</p>
      {recent.error && <p className="recent-files-error" role="alert">{recent.error}</p>}
      <p className="field-help" role="status">{recent.busy?'최근 파일을 처리하고 있습니다…':`${recent.files.length}개 파일 보관 중`}</p>
      {!recent.files.length&&!recent.busy&&<p className="recent-files-empty">아직 보관한 파일이 없습니다. PPTX를 열면 이 목록에 추가됩니다.</p>}
      <ul className="recent-files-list">{recent.files.map(file=><li key={file.id} data-recent-id={file.id}>
        <button type="button" className="recent-file-select" disabled={blocked} onClick={async()=>{
          if(await commands.openRecentFile(file.id))close();
        }}>
          <strong>{file.name}</strong>
          <span>{(file.size/1024/1024).toLocaleString('ko-KR',{maximumFractionDigits:2})} MB · {new Date(file.lastOpened).toLocaleString('ko-KR')}</span>
        </button>
        <Button className="recent-file-delete" disabled={blocked} aria-label={`${file.name} 보관 삭제`}
          onClick={()=>commands.removeRecentFile(file.id)}>삭제</Button>
      </li>)}</ul>
      <div className="recent-files-footer"><p className="field-help">브라우저를 닫아도 유지됩니다. 사이트 데이터를 지우거나 브라우저가 저장 공간을 정리하면 삭제될 수 있습니다.</p>
        <Button id="recent-files-clear" disabled={blocked||!recent.files.length} onClick={commands.clearRecentFiles}>전체 삭제</Button>
      </div>
    </dialog>
  </>;
}
