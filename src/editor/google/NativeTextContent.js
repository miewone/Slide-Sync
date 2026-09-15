/** Read native text for preview/search without changing Google text or its API indices. */
export class NativeTextContent {
  /** @param {string|null|undefined} value Run content. Normalize supported line-break controls to browser line feeds; leave printable characters intact. */
  static normalize(value){return String(value??'').replace(/\r\n?|[\u000b\u000c\u0085\u2028\u2029]/gu,'\n');}
  /** @param {string|null|undefined} value Unmodified API run. Identify a terminal paragraph newline, distinct from a soft break. */
  static endsParagraph(value){return /[\r\n]$/u.test(value??'');}
  /** @param {object|undefined} text Native TextContent. Concatenate adjacent runs before normalizing breaks. */
  static read(text){return this.normalize((text?.textElements||[]).map(e=>e.textRun?.content??e.autoText?.content??'').join(''));}
}
