/** Tracks nearby slide surfaces without mounting every iframe up front. */
export class PreviewViewport {
  /**
   * @param {object} options Scroll root and callback for newly visible slide indices.
   * @param {HTMLElement} options.root Scrollable preview stage.
   * @param {Function} options.onEnter Attach cached content and refresh its overlays.
   */
  constructor({root, onEnter}) {
    this.entries = new Map();
    this.nearby = new Set();
    this.onEnter = onEnter;
    this.observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(records => {
      for (const record of records) {
        const index = Number(record.target.dataset.slide);
        // Ignore records queued before a deck was replaced.
        if (this.entries.get(index)?.surface !== record.target) continue;
        if (record.isIntersecting) {
          const changed = !this.nearby.has(index);
          this.nearby.add(index);
          if (changed) this.onEnter(index);
        } else this.nearby.delete(index);
      }
    }, {root, rootMargin:'300px 0px'});
  }
  /** @param {number} index Slide index. @param {object} entry Card, surface and content references. */
  register(index, entry) {
    this.entries.set(index, entry);
    if (this.observer) this.observer.observe(entry.surface);
    else {this.nearby.add(index);this.onEnter(index);}
  }
  /** @param {number} index Slide index. Return its cached DOM references. */
  get(index) { return this.entries.get(index); }
  /** @param {number} index Slide index. Whether content should be attached now. */
  isNearby(index) { return this.nearby.has(index); }
  /** Get nearby indices in DOM order; distant cards retain only light shells. */
  indices() { return [...this.nearby].sort((a, b) => a - b); }
  /** @param {Iterable<number>} indices Optional dirty slide indices to intersect with the viewport. */
  *surfaces(indices = this.nearby) {
    for (const index of indices) {
      const entry = this.entries.get(index);
      if (this.nearby.has(index) && entry && !entry.card.hidden) yield entry.surface;
    }
  }
  /** Release references and observations before replacing a deck or unmounting. */
  reset() {
    this.observer?.disconnect();
    this.entries.clear();this.nearby.clear();
  }
}
