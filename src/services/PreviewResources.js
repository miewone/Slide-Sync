/** Loads the existing, locally hosted vendor assets once and only when requested. */
export class PreviewResources {
  /** @param {string} base Deployment base URL, including its trailing slash. */
  constructor(base = import.meta.env?.BASE_URL || '/') {
    this.base = base;
    this.pending = new Map();
  }
  /** @param {string} filename Bundled classic script name. @param {string} globalName Export name. */
  loadScript(filename, globalName) {
    if (globalThis[globalName]) return Promise.resolve(globalThis[globalName]);
    if (!this.pending.has(filename)) {
      const promise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `${this.base}vendor/${filename}`;
        script.onload = () => globalThis[globalName]
          ? resolve(globalThis[globalName]) : reject(Error(`${filename} 초기화에 실패했습니다.`));
        script.onerror = () => {
          script.remove();
          reject(Error(`${filename} 파일을 불러오지 못했습니다. 다시 시도하세요.`));
        };
        document.head.append(script);
      }).catch(error => {
        this.pending.delete(filename);
        throw error;
      });
      this.pending.set(filename, promise);
    }
    return this.pending.get(filename);
  }
  /** Load the ZIP reader independently of the larger rendering dependencies. */
  loadZip() { return this.loadScript('jszip.min.js', 'JSZip'); }
  /** @param {object} options Set charts only for decks containing chart references. */
  async loadRenderer({charts = false} = {}) {
    await Promise.all([this.loadZip(), this.loadScript('lodash.min.js', '_'),
      this.loadScript('uuid.min.js', 'uuid'), ...(charts ? [this.loadScript('echarts.min.js', 'echarts')] : [])]);
    return import('../vendor/pptx-preview.es.js');
  }
}
export const previewResources = new PreviewResources();
