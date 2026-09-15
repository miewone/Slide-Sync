import {SearchText} from './SearchText.js';

/** Cached literal text search over slide-owned XML (not preview DOM or truncated labels). */
export class SlideSearchIndex {
  /** @param {object|null} deck Loaded deck; paragraphs include tables and nested groups. */
  constructor(deck=null) {
    this.entries=(deck?.slides || []).map(slide=>({index:slide.index,
      text:SlideSearchIndex.normalize([slide.title,...SlideSearchIndex.paragraphs(slide.doc)].join('\n'))}));
  }

  /** @param {string} text Normalize Unicode, case and whitespace without interpreting regex. */
  static normalize(text) {
    return SearchText.normalize(text);
  }

  /**
   * Preserve adjacent formatting runs as continuous text, separating paragraphs and breaks.
   * @param {Document} document Slide XML only; notes and master placeholder samples are excluded.
   * @returns {string[]} Complete paragraph text, without the UI label length limit.
   */
  static paragraphs(document) {
    return SearchText.paragraphs(document);
  }

  /** @param {string} query Literal substring. Empty/whitespace-only queries never match all slides. */
  find(query) {
    const normalized=SlideSearchIndex.normalize(query);
    return normalized ? this.entries.filter(entry=>entry.text.includes(normalized)).map(entry=>entry.index) : [];
  }

  /** Release text when a deck is disposed. */
  clear() { this.entries=[]; }
}
