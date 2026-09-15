import {useRef} from 'react';
import {Button} from './ui.jsx';
import {RecentFiles} from './RecentFiles.jsx';
import {useEditor, useEditorValue} from '../hooks/useEditor.js';

/** File commands; the native input remains reusable after opening the same file. */
export function Header() {
  const input = useRef(null);
  const {commands} = useEditor();
  const busy = useEditorValue('busy');
  const ready = useEditorValue('ready');
  const hasDeck = useEditorValue('hasDeck');
  return <header className={`topbar${busy ? ' busy' : ''}`}>
    <div className="brand"><span className="brand-icon">▱</span><strong>Slide Sync</strong><span className="beta">PPTX 편집</span></div>
    <div className="header-actions">
      <Button id="open" disabled={!ready || busy} onClick={() => input.current.click()}>PPTX 열기</Button>
      <RecentFiles/>
      <Button id="download" variant="primary" disabled={!hasDeck || busy} onClick={commands.download}>수정본 다운로드 <span>↓</span></Button>
    </div>
    <input ref={input} id="file" type="file" accept=".pptx" hidden onChange={event => {
      const file = event.target.files[0];event.target.value = '';commands.openFile(file);
    }}/>
  </header>;
}
