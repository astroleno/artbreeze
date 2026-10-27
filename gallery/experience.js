/* Shared, local-only gallery renderer. ArtBreeze is the canonical source. */
(function (root, factory) {
  const catalogue = typeof module === 'object' && module.exports
    ? require('./catalogue.js') : root.GalleryCatalogue;
  const api = factory(catalogue);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GalleryExperience = api;
})(globalThis, function (catalogue) {
  'use strict';

  const scenes = catalogue.scenes;
  const KEYS = ['galleryEnabled', 'sceneSelection', 'appearance', 'gallerySize'];
  const SIZES = { small: 360, medium: 520, large: 660 };

  function preferences(value = {}, kind = 'art') {
    return {
      galleryEnabled: typeof value.galleryEnabled === 'boolean' ? value.galleryEnabled : kind === 'art',
      sceneSelection: scenes.some(scene => scene.id === value.sceneSelection) ? value.sceneSelection : 'auto',
      appearance: ['system', 'light', 'dark'].includes(value.appearance) ? value.appearance
        : typeof value.darkMode === 'boolean' ? (value.darkMode ? 'dark' : 'light') : 'system',
      gallerySize: Object.hasOwn(SIZES, value.gallerySize) ? value.gallerySize : 'medium'
    };
  }

  function hash(value) {
    let result = 2166136261;
    for (const letter of String(value)) result = Math.imul(result ^ letter.codePointAt(0), 16777619);
    return result >>> 0;
  }

  function chooseScene({ key = '', aspect = 1, palette = 'neutral', kind = 'art', selection = 'auto' } = {}) {
    const fixed = scenes.find(scene => scene.id === selection);
    if (fixed) return fixed;
    const candidates = kind === 'reading' ? scenes.filter(scene => scene.readingSafe) : scenes;
    return candidates.map(scene => {
      const mountAspect = scene.mount.width * scene.width / (scene.mount.height * scene.height);
      const score = (scene.palettes.includes(palette) ? 2 : 0)
        + Math.max(0, 1 - Math.abs(Math.log(Math.max(.05, aspect) / mountAspect)))
        + (1 - scene.busyness) * .35;
      // A small, stable tie-break gives different content different rooms without reshuffling on hover.
      return { scene, score: score + (hash(`${key}:${scene.id}`) % 1000) / 2200 };
    }).sort((a, b) => b.score - a.score || a.scene.id.localeCompare(b.scene.id))[0].scene;
  }

  function dimensions(viewportWidth, viewportHeight, size = 'medium', kind = 'art') {
    const maxWidth = Math.max(120, viewportWidth - 32);
    const maxHeight = Math.max(100, viewportHeight - 32);
    const ratio = kind === 'reading' ? 1.38 : 16 / 9;
    const width = Math.min(SIZES[size] || SIZES.medium, maxWidth, maxHeight * ratio);
    return { width, height: width / ratio };
  }

  function layoutArtwork(scene, width, height, aspect = 1, showCaption = true) {
    const scale = Math.max(width / scene.width, height / scene.height);
    const offsetX = (width - scene.width * scale) / 2;
    const offsetY = (height - scene.height * scale) / 2;
    const mount = {
      x: offsetX + scene.mount.x * scene.width * scale,
      y: offsetY + scene.mount.y * scene.height * scale,
      width: scene.mount.width * scene.width * scale,
      height: scene.mount.height * scene.height * scale
    };
    const center = width / 2;
    // The painting is centered in the room; the caption never shifts its center.
    const maxWidth = Math.max(1, Math.min(center - mount.x, mount.x + mount.width - center) * 1.78);
    const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
    const artHeight = Math.min(mount.height * .88, maxWidth / safeAspect);
    const artWidth = artHeight * safeAspect;
    const x = center - artWidth / 2;
    const y = mount.y + (mount.height - artHeight) / 2;
    const captionX = x + artWidth + 10;
    const captionWidth = Math.max(0, Math.min(76, width - captionX - 16));
    return { x, y, width: artWidth, height: artHeight,
      caption: { x: captionX, y: y + artHeight * .6, width: captionWidth,
        visible: showCaption && captionWidth >= 38 && width >= 300 } };
  }

  function paletteFromImage(image) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 12;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, 12, 12);
      const pixels = context.getImageData(0, 0, 12, 12).data;
      let red = 0, green = 0, blue = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        red += pixels[i]; green += pixels[i + 1]; blue += pixels[i + 2];
      }
      red /= 144; green /= 144; blue /= 144;
      const luminance = .2126 * red + .7152 * green + .0722 * blue;
      if (luminance < 65) return 'dark';
      if (Math.max(red, green, blue) - Math.min(red, green, blue) < 18) return 'neutral';
      if (blue > red + 12) return 'cool';
      if (red > blue + 18) return 'warm';
      return 'muted';
    } catch (_) {
      // Cross-origin artwork remains usable even if a palette cannot be sampled.
      return 'neutral';
    }
  }

  function safeURL(value) {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch (_) { return null; }
  }

  class Stage {
    constructor({ container, frame, imageContainer, image, caption, kind = 'art', close, resourceURL }) {
      Object.assign(this, { container, frame, imageContainer, image, caption, kind });
      this.resourceURL = resourceURL || (path => chrome.runtime.getURL(path));
      this.settings = preferences({}, kind);
      this.content = {};
      this.palette = 'neutral';
      this.revision = 0;
      container.dataset.galleryKind = kind;
      this.environment = document.createElement('div');
      this.environment.className = 'gallery-environment';
      this.environment.setAttribute('aria-hidden', 'true');
      this.backdrop = document.createElement('img');
      this.backdrop.alt = '';
      this.backdrop.draggable = false;
      this.light = document.createElement('div');
      this.light.className = 'gallery-light';
      this.environment.append(this.backdrop, this.light);
      container.prepend(this.environment);
      this.closeButton = document.createElement('button');
      this.closeButton.className = 'gallery-close';
      this.closeButton.type = 'button';
      this.closeButton.setAttribute('aria-label', '收起');
      this.closeButton.title = '收起（Esc）';
      this.closeButton.textContent = '×';
      this.closeButton.addEventListener('click', event => { event.stopPropagation(); close(); });
      container.append(this.closeButton);
      container.setAttribute('role', 'region');
      container.setAttribute('aria-label', kind === 'art' ? '艺息画廊' : '知涟阅读');
      container.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.stopPropagation(); close(); }
      });
      this.media = matchMedia('(prefers-color-scheme: dark)');
      this.onAppearance = () => this.applyAppearance();
      this.media.addEventListener('change', this.onAppearance);
      this.onResize = () => this.layout();
      window.addEventListener('resize', this.onResize, { passive: true });
      if (image) image.addEventListener('load', () => this.layout());
    }

    apply(settings) {
      this.settings = preferences(settings, this.kind);
      this.container.dataset.galleryEnabled = String(this.settings.galleryEnabled);
      this.applyAppearance();
      this.updateContent(this.content, this.palette);
    }

    applyAppearance() {
      const dark = this.settings.appearance === 'dark'
        || (this.settings.appearance === 'system' && this.media.matches);
      this.container.dataset.galleryTheme = dark ? 'dark' : 'light';
      this.container.classList.toggle('dark-mode', dark);
    }

    updateContent(content = {}, palette) {
      this.content = content;
      this.palette = palette || this.palette;
      const aspect = this.image && this.image.naturalWidth
        ? this.image.naturalWidth / this.image.naturalHeight : 1;
      const key = content.image || content.url || `${content.type || ''}:${content.title || ''}:${content.content || ''}`;
      const scene = chooseScene({ key, aspect, palette: this.palette, kind: this.kind,
        selection: this.settings.sceneSelection });
      this.scene = scene;
      this.container.dataset.galleryScene = scene.id;
      this.container.dataset.galleryLight = scene.lightDirection;
      this.container.dataset.galleryCaptionTone = scene.captionTone;
      if (!this.settings.galleryEnabled) {
        this.revision++;
        this.backdrop.removeAttribute('src');
        this.container.dataset.galleryState = 'plain';
        this.loadedScene = null;
      } else if (this.loadedScene !== scene.id) {
        const revision = ++this.revision;
        this.loadedScene = scene.id;
        this.container.dataset.galleryState = 'loading';
        this.backdrop.onload = () => {
          if (revision === this.revision) this.container.dataset.galleryState = 'ready';
        };
        this.backdrop.onerror = () => {
          if (revision === this.revision) this.container.dataset.galleryState = 'fallback';
        };
        this.backdrop.src = this.resourceURL(scene.image);
      }
      this.layout();
    }

    layout() {
      if (!this.scene) return;
      const enabled = this.settings.galleryEnabled;
      const styles = this.container.style;
      if (!enabled) {
        ['width', 'height', '--gallery-art-x', '--gallery-art-y', '--gallery-art-width', '--gallery-art-height',
          '--gallery-caption-x', '--gallery-caption-y', '--gallery-caption-width'].forEach(key => styles.removeProperty(key));
        if (this.caption) this.caption.removeAttribute('data-gallery-caption');
        return;
      }
      const bounds = dimensions(window.innerWidth, window.innerHeight, this.settings.gallerySize, this.kind);
      styles.width = `${bounds.width}px`;
      styles.height = `${bounds.height}px`;
      if (this.kind === 'art') {
        const aspect = this.image.naturalWidth / this.image.naturalHeight || 1;
        const art = layoutArtwork(this.scene, bounds.width, bounds.height, aspect);
        for (const [key, value] of Object.entries({ x: art.x, y: art.y, width: art.width, height: art.height })) {
          styles.setProperty(`--gallery-art-${key}`, `${value}px`);
        }
        for (const [key, value] of Object.entries(art.caption)) {
          if (key !== 'visible') styles.setProperty(`--gallery-caption-${key}`, `${value}px`);
        }
        if (this.caption) this.caption.dataset.galleryCaption = art.caption.visible ? 'visible' : 'compact';
      }
    }

    destroy() {
      this.revision++;
      window.removeEventListener('resize', this.onResize);
      this.media.removeEventListener('change', this.onAppearance);
    }
  }

  return { version: catalogue.version, scenes, KEYS, SIZES, preferences, chooseScene, dimensions,
    layoutArtwork, paletteFromImage, safeURL, Stage };
});
