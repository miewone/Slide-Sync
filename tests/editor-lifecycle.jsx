import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from '../src/App.jsx';
import {previewResources} from '../src/services/PreviewResources.js';
import '../src/styles/app.css';

let root;
const loadZip = previewResources.loadZip;
let resumeZip;
window.mountEditor = () => {
  root = createRoot(document.querySelector('#root'));
  root.render(<StrictMode><App/></StrictMode>);
};
window.unmountEditor = () => root.unmount();
window.pauseZip = () => {
  const gate = new Promise(resolve => {resumeZip = resolve;});
  previewResources.loadZip = async () => {await gate;return loadZip.call(previewResources);};
};
window.releaseZip = () => {previewResources.loadZip = loadZip;resumeZip();};
window.mountEditor();
