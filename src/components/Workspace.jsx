import {memo} from 'react';
import {Button, Checkbox} from './ui.jsx';
import {useEditor, useEditorValue} from '../hooks/useEditor.js';

/** Stable DOM island: only the preview engine owns descendants of this node. */
const PreviewStage = memo(function PreviewStage() { return <div id="stage" className="stage"/>; });

/** Empty-state file actions; hidden without being removed during a file load. */
function EmptyState() {
  const ready = useEditorValue('ready'), busy = useEditorValue('busy'), hasDeck = useEditorValue('hasDeck');
  const recent=useEditorValue('recentFiles');
  const {commands} = useEditor();
  const welcome=ready&&!hasDeck&&recent.loaded&&!recent.busy&&!recent.error&&recent.files.length===0;
  const demo=<Button key="demo" id="demo" variant={welcome?'primary':undefined}
    className={welcome?'welcome-demo':'demo-button'} disabled={!ready||busy} onClick={commands.openDemo}>예제 슬라이드 사용해보기</Button>;
  const open=<Button key="open" id="empty-open" variant={welcome?undefined:'primary'} disabled={!ready||busy} onClick={commands.chooseFile}>내 PPTX 파일 열기</Button>;
  return <div className={`empty-state${welcome?' welcome-state':''}`} id="dropzone" hidden={hasDeck}>
    <div className="privacy-highlight"><strong>파일은 서버에 전송·저장되지 않습니다.</strong><span>모든 편집은 브라우저 안에서만 이루어집니다.</span></div>
    <div className="empty-state-content">
    <div className="upload-symbol" aria-hidden="true">{welcome?'▱':'↥'}</div>
    {welcome&&<span className="welcome-eyebrow">처음이라면 예제로 시작하세요</span>}
    <h2>{welcome?'슬라이드 편집, 바로 경험해 보세요':'PPTX 파일을 여기에 놓으세요'}</h2>
    <p>{welcome?<>파일 없이도 예제로 시작할 수 있어요.<br/>여러 슬라이드의 요소를 함께 선택하고, 옮기고, 삭제해 보세요.</>:<>여러 슬라이드의 같은 좌표를 클릭하고<br/>선택된 요소를 함께 옮길 수 있습니다.</>}</p>
    <div className="empty-state-actions">{welcome?[demo,open]:[open,demo]}</div>
    <small>{welcome?'내 PPTX 파일을 이곳에 끌어 놓아도 됩니다.':'파일은 브라우저 안에서 처리됩니다.'}</small>
    </div>
  </div>;
}

/** Status information subscribes independently of the preview canvas. */
function StatusBar() {
  const status = useEditorValue('status'), size = useEditorValue('size');
  return <footer className="statusbar"><span id="status" role="status">{status}</span><span id="size-info">{size}</span></footer>;
}

/** Presentation metadata and isolated preview host. */
export function Workspace() {
  const name = useEditorValue('name'), summary = useEditorValue('summary'), notice = useEditorValue('notice');
  return <section className="workspace">
    <div className="workspace-bar"><div><h1 id="filename">{name}</h1><p id="workspace-summary">{summary}</p></div>
      <div className="view-option workspace-options">
        <Checkbox id="match-appearance" label="크기·색상·레이아웃 일치" helpKey="match-appearance"/>
        <Checkbox id="box-select-mode" label="영역 선택" helpKey="box-select-mode"/>
        <Checkbox id="only-checked" label="선택한 슬라이드만 보기" helpKey="only-checked"/>
      </div>
    </div>
    <div id="notice" className="notice" role="alert" hidden={!notice}>{notice}</div>
    <EmptyState/><PreviewStage/><StatusBar/>
  </section>;
}
