/** Own only the playable-media URLs created by one vendor presentation load. */
export class PreviewMediaResources {
  /** @param {object} urlApi Browser URL API, injectable for isolated lifecycle tests. */
  constructor(urlApi = URL) {
    this.urlApi = urlApi;
    this.urls = new Set();
    this.disposed = false;
  }

  /** @param {Blob} blob Decoded playable media; throws when its load was disposed. */
  createObjectURL(blob) {
    if (this.disposed) throw new Error('Preview media resources have been disposed.');
    const url = this.urlApi.createObjectURL(blob);
    this.urls.add(url);
    return url;
  }

  /** Revoke this load's URLs exactly once, including when loading failed or was replaced. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const url of this.urls) this.urlApi.revokeObjectURL(url);
    this.urls.clear();
  }
}
