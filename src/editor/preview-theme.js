/** Renders inherited theme artwork with the existing PPTX renderer. */
export class PreviewTheme {
  /** @param {object} renderer Loaded pptx-preview HTML renderer to adapt. */
  constructor(renderer) {
    this.renderer = renderer;
  }

  /** Install once per renderer, before any slides are rendered. */
  install() {
    const renderer = this.renderer;
    const renderSlide = renderer.renderSlide;
    const theme = this;
    renderer.renderSlide = function (index) {
      const slide = this.pptx.slides[index];
      theme.showMaster = theme.isVisible(slide, 'p:sld') &&
        theme.isVisible(slide.slideLayout, 'p:sldLayout');
      return renderSlide.call(this, index);
    };
    renderer._renderSlideMaster = (part, parent) => {
      this.renderLayer(part, parent, 'slide-master-wrapper', this.showMaster);
    };
    renderer._renderSlideLayout = (part, parent) => {
      this.renderLayer(part, parent, 'slide-layout-wrapper', true);
    };
  }

  /** @param {object} part Parsed slide/layout. @param {string} tag XML root name. */
  isVisible(part, tag) {
    return !['0', 'false'].includes(String(part?.source?.[tag]?.attrs?.showMasterSp));
  }

  /** @param {object} node Parsed shape whose placeholder/visibility flags are checked. */
  isArtwork(node) {
    for (const [key, value] of Object.entries(node.source || {})) {
      if (!key.startsWith('p:nv')) continue;
      // Placeholders supply inheritance; their sample text is not slide artwork.
      if (value?.['p:nvPr']?.['p:ph'] !== undefined) return false;
      if (['1', 'true'].includes(String(value?.['p:cNvPr']?.attrs?.hidden))) return false;
    }
    return true;
  }

  /**
   * Render decorative shapes in native drawing order and scale.
   * @param {object} part Parsed master/layout (never mutated).
   * @param {HTMLElement} parent Slide preview container.
   * @param {string} className Inherited layer class, separate from editable shapes.
   * @param {boolean} visible Whether inherited master artwork is enabled.
   */
  renderLayer(part, parent, className, visible) {
    const nodes = visible ? (part?.nodes || []).filter(node => this.isArtwork(node)) : [];
    this.renderer._renderSlide({nodes}, parent);
    parent.lastElementChild.className = className;
  }
}
