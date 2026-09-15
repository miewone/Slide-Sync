import {createContext, useContext, useSyncExternalStore, useCallback} from 'react';

export const EditorContext = createContext(null);

/** Read editor services from the enclosing editor instance. */
export function useEditor() {
  const value = useContext(EditorContext);
  if (!value) throw Error('Editor components require EditorContext.');
  return value;
}

/** @param {string} key Store field; subscribe only to that field's identity. */
export function useEditorValue(key) {
  const {store} = useEditor();
  const snapshot = useCallback(() => store.getSnapshot()[key], [store, key]);
  return useSyncExternalStore(store.subscribe, snapshot, snapshot);
}
