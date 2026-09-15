import {memo} from 'react';
import {Button, Checkbox} from './ui.jsx';
import {useEditor, useEditorValue} from '../hooks/useEditor.js';

/** Stable DOM island: only the preview engine owns descendants of this node. */
const PreviewStage = memo(function PreviewStage() { return <div id="stage" className="stage"/>; });

/** Empty-state file actions; hidden without being removed during a file load. */
function EmptyState() {
  const ready = useEditorValue('ready'), busy = useEditorValue('busy'), hasDeck = useEditorValue('hasDeck');
  const {commands} = useEditor();
  return <div className="empty-state" id="dropzone" hidden={hasDeck}>
    <div className="upload-symbol">↥</div><h2>PPTX 파일을 여기에 놓으세요</h2>
    <p>여러 슬라이드의 같은 좌표를 클릭하고<br/>선택된 요소를 함께 옮길 수 있습니다.</p>
    <Button id="empty-open" variant="primary" disabled={!ready || busy} onClick={commands.chooseFile}>파일 선택</Button>
    <button id="demo" className="text-button demo-button" disabled={!ready || busy} onClick={commands.openDemo}>예제 슬라이드로 사용해 보기</button>
    <small>파일은 브라우저 안에서 처리됩니다.</small>
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
