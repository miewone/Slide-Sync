/** Owns application event subscriptions for deterministic unmount/HMR cleanup. */
export class EventScope {
  /** Create an independent subscription lifetime. */
  constructor() { this.abortController = new AbortController(); }
  /** @param {EventTarget} target Event source. @param {string} type Event name. @param {Function} handler Callback. @param {object} options Listener options. */
  on(target, type, handler, options = {}) {
    target.addEventListener(type, handler, {...options, signal:this.abortController.signal});
  }
  /** Remove every listener owned by this scope. */
  dispose() { this.abortController.abort(); }
}
