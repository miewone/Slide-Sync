import {t} from '../i18n/I18n.js';
import {shareRows} from './row-sharing.js';

/** Small immutable UI store; PPTX XML and preview DOM stay outside React state. */
export class EditorStore {
  /** @param {object} initial Optional initial presentation state for embedding/tests. */
  constructor(initial = {}) {
    this.snapshot = Object.freeze({ready:false, busy:false, hasDeck:false,
      name:t('EditorStore.1'), status:t('EditorStore.2'), notice:'',
      summary:t('EditorStore.3'), size:'', slides:[], hoveredSlide:null,
      recentFiles:{files:[],busy:false,error:'',loaded:false},
      appearanceCriteria:{size:true,colors:true,layout:true},
      slideSearch:{query:'',matches:[]},
      elementSearch:{query:'',matches:[],selected:0,slides:0,names:[]},
      selection:{count:0, slides:0, size:'', rows:[]}, ...initial});
    this.initialSnapshot = this.snapshot;
    this.listeners = new Set();
  }
  /** Reset presentation state when a runtime is replaced by HMR or remount. */
  reset() {
    if (this.snapshot === this.initialSnapshot) return;
    this.snapshot = this.initialSnapshot;
    for (const listener of this.listeners) listener();
  }
  /** Read the same snapshot until state changes (useSyncExternalStore contract). */
  getSnapshot = () => this.snapshot;
  /** @param {Function} listener Subscriber; returns its cleanup function. */
  subscribe = listener => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  /** @param {object[]} rows Flat slide metadata; unchanged rows keep their references. */
  updateSlides(rows) { this.update({slides:shareRows(this.snapshot.slides, rows)}); }
  /** @param {object} selection Count, slide count, bounds text and flat result rows. */
  updateSelection(selection) {
    const previous = this.snapshot.selection;
    const rows = shareRows(previous.rows, selection.rows);
    if (rows === previous.rows && ['count','slides','size'].every(key => previous[key] === selection[key])) return;
    this.update({selection:{...selection, rows}});
  }
  /** @param {object} patch Changed fields; equal patches do not notify subscribers. */
  update(patch) {
    if (Object.keys(patch).every(key => Object.is(this.snapshot[key], patch[key]))) return;
    this.snapshot = Object.freeze({...this.snapshot, ...patch});
    for (const listener of this.listeners) listener();
  }
}
