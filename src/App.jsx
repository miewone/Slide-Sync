import {useEffect, useMemo, useRef} from 'react';
import {EditorStore} from './editor/EditorStore.js';
import {previewResources} from './services/PreviewResources.js';
import {EditorContext} from './hooks/useEditor.js';
import {Header} from './components/Header.jsx';
import {Sidebar} from './components/Sidebar.jsx';
import {Workspace} from './components/Workspace.jsx';
import {Inspector} from './components/Inspector.jsx';

/** A self-contained editor instance with a lazy engine and stable command facade. */
export default function App() {
  const root = useRef(null);
  const runtime = useRef(null);
  const services = useMemo(() => {
    const store = new EditorStore();
    const invoke = name => (...args) => runtime.current?.[name](...args);
    return {store, commands:{openFile:invoke('openFile'), openDemo:invoke('openDemo'),
      refreshRecentFiles:invoke('refreshRecentFiles'), openRecentFile:invoke('openRecentFile'),
      removeRecentFile:invoke('removeRecentFile'), clearRecentFiles:invoke('clearRecentFiles'),
      download:invoke('download'), setElementSearchQuery:invoke('setElementSearchQuery'), applyElementSearch:invoke('applyElementSearch'), setSlideSearchQuery:invoke('setSlideSearchQuery'), applySlideSearch:invoke('applySlideSearch'), setSlideChecked:invoke('setSlideChecked'), selectSlides:invoke('selectSlides'),
      chooseFile:() => root.current?.querySelector('#file').click()}};
  }, []);

  useEffect(() => {
    let cancelled = false;
    services.store.reset();
    import('./editor/createEditorRuntime.js').then(({createEditorRuntime}) => {
      if (cancelled) return;
      runtime.current = createEditorRuntime(root.current, services.store, previewResources);
      services.store.update({ready:true});
    }).catch(error => {
      if (!cancelled) services.store.update({notice:`편집기를 시작하지 못했습니다: ${error.message}`});
    });
    return () => {
      cancelled = true;
      runtime.current?.dispose();runtime.current = null;
      services.store.update({ready:false});
    };
  }, [services]);

  return <EditorContext.Provider value={services}>
    <div id="app" ref={root}><Header/><main><Sidebar/><Workspace/><Inspector/></main></div>
  </EditorContext.Provider>;
}
