/* Shared renderer. Product catalogues and resources are generated separately. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./catalogue.js') : root.GalleryCatalogue);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.GalleryExperience = api;
})(globalThis, function (catalogue) {
  'use strict';
  const scenes = catalogue.scenes;
  const SIZES = { small: 360, medium: 520, large: 660 };
  const TYPES = ['wikipedia', 'quotes', 'facts', 'advice', 'catfacts', 'trivia', 'cocktails', 'datafacts', 'gathas'];
  const clamp = (n, lo, hi, fallback) => Number.isFinite(Number(n)) && n !== null && n !== '' && n !== undefined ? Math.min(hi, Math.max(lo, Number(n))) : fallback;
  function preferences(v = {}, kind = catalogue.product === 'waitwiki' ? 'reading' : 'art') {
    const reading = kind === 'reading';
    const galleryEnabled = typeof v.galleryEnabled === 'boolean' ? v.galleryEnabled : !reading;
    const oldWidth = galleryEnabled ? SIZES[v.gallerySize] : reading ? { small: 280, medium: 320, large: 400 }[v.cardSize] : SIZES[v.gallerySize];
    const oldDuration = ['10', '20', 'always'].includes(String(v.displayDuration)) ? String(v.displayDuration) : undefined;
    return {
      settingsVersion: 2, enabled: v.enabled !== false, showIcon: v.showIcon !== false,
      showArtworkInfo: v.showArtworkInfo !== false, showSourceInfo: v.showSourceInfo !== false,
      galleryEnabled, sceneSelection: reading ? 'bg-027' : scenes.some(s => s.id === v.sceneSelection) ? v.sceneSelection : 'auto',
      appearance: ['system', 'light', 'dark'].includes(v.appearance) ? v.appearance : typeof v.darkMode === 'boolean' ? v.darkMode ? 'dark' : 'light' : 'system',
      panelWidth: clamp(v.panelWidth ?? oldWidth, reading ? 280 : 360, 800, 600),
      artworkScale: clamp(v.artworkScale, .68, 1, .92),
      autoHideEnabled: typeof v.autoHideEnabled === 'boolean' ? v.autoHideEnabled : oldDuration !== 'always',
      autoHideDelay: clamp(v.settingsVersion === 2 ? v.autoHideDelay : oldDuration && oldDuration !== 'always' ? Number(oldDuration) : undefined, 1, 120, 2),
      hoverToOpen: v.hoverToOpen !== false, randomContentOnNewWait: v.randomContentOnNewWait !== false,
      roomLightEffects: v.roomLightEffects !== false,
      language: ['zh', 'en', 'ja', 'fr', 'de', 'es'].includes(v.language) ? v.language : 'zh',
      contentTypes: Array.isArray(v.contentTypes) && v.contentTypes.some(t => TYPES.includes(t)) ? TYPES.filter(t => v.contentTypes.includes(t)) : [...TYPES]
    };
  }
  const KEYS = Object.keys(preferences());
  function hash(value) { let n = 2166136261; for (const c of String(value)) n = Math.imul(n ^ c.codePointAt(0), 16777619); return (n >>> 0).toString(36); }
  function safeURL(value) { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; } }
  function ranked({ aspect = 1, palette = 'neutral' } = {}) {
    aspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
    return scenes.map(scene => {
      const a = scene.mount.width * scene.width / (scene.mount.height * scene.height);
      return { scene, score: (scene.palettes.includes(palette) ? 2 : 0) + Math.min(aspect, a) / Math.max(aspect, a) + (1 - scene.busyness) * 2 };
    }).sort((a, b) => b.score - a.score || a.scene.id.localeCompare(b.scene.id));
  }
  function chooseScene(input = {}) { return scenes.find(s => s.id === input.selection) || ranked(input)[0]?.scene; }
  function nextScene(input = {}, excluding, random = Math.random) {
    if (input.kind === 'reading' || input.selection && input.selection !== 'auto') return chooseScene(input);
    const ordered = ranked(input).map(row => row.scene);
    const compatible = ordered.filter(s => s.palettes.includes(input.palette || 'neutral'));
    const choices = (compatible.length ? compatible : ordered).slice(0, 6).filter(s => s.id !== excluding);
    return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))] || chooseScene(input);
  }
  function dimensions(vw, vh, width = 600, kind = 'art', aspect = 1) {
    const w = Math.max(1, Math.min(typeof width === 'string' ? SIZES[width] || 600 : width, Math.max(1, vw - 32)));
    const preferred = kind === 'reading' ? Math.max(300, w * .84) : Math.max(340, w * (aspect < .85 ? 1.12 : .78));
    return { width: w, height: Math.max(1, Math.min(preferred, vh - 32)) };
  }
  function layoutArtwork(scene, width, height, aspect = 1, showCaption = true, occupancy = .92) {
    const source = scene || { width: 1672, height: 941, mount: { x: .08, y: .13, width: .84, height: .7 } };
    const scale = Math.max(width / source.width, height / source.height);
    const background = { x: (width - source.width * scale) / 2, y: (height - source.height * scale) / 2, width: source.width * scale, height: source.height * scale };
    const safe = { x: width * .06, y: Math.min(44, height * .13), width: width * .88, height: Math.max(1, height - Math.min(44, height * .13) - Math.min(36, height * .12)) };
    const m = source.mount;
    let mount = { x: Math.max(safe.x, background.x + m.x * background.width), y: Math.max(safe.y, background.y + m.y * background.height) };
    mount.width = Math.min(safe.x + safe.width, background.x + (m.x + m.width) * background.width) - mount.x;
    mount.height = Math.min(safe.y + safe.height, background.y + (m.y + m.height) * background.height) - mount.y;
    const usesFallback = mount.width < Math.min(80, width * .4) || mount.height < Math.min(100, height * .4);
    if (usesFallback) mount = safe;
    aspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
    const cw = showCaption ? Math.min(100, Math.max(42, width * .16)) : 0, gap = showCaption ? Math.min(18, Math.max(8, width * .025)) : 0;
    const maxCenteredWidth = Math.max(1, Math.min(width / 2 - safe.x - 4, width / 2 - 12 - cw - gap) * 2);
    const aw = Math.max(1, Math.min(Math.max(1, mount.width - 12), Math.max(1, mount.height - 12) * aspect, maxCenteredWidth)) * clamp(occupancy, .68, 1, .92);
    const ah = aw / aspect, x = width / 2 - aw / 2, y = mount.y + (mount.height - ah) / 2;
    return { x, y, width: aw, height: ah, background, mount, usesFallback,
      caption: { x: x + aw + gap, y: Math.min(Math.max(safe.y, y + ah - 34), safe.y + safe.height - 34), width: cw, visible: showCaption } };
  }
  function paletteFromImage(image) {
    try {
      const c = document.createElement('canvas'); c.width = c.height = 12;
      const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(image, 0, 0, 12, 12);
      const p = ctx.getImageData(0, 0, 12, 12).data, rgb = [0, 0, 0];
      for (let i = 0; i < p.length; i += 4) for (let j = 0; j < 3; j++) rgb[j] += p[i + j] / 144;
      const [r, g, b] = rgb;
      return .2126 * r + .7152 * g + .0722 * b < 65 ? 'dark' : Math.max(...rgb) - Math.min(...rgb) < 18 ? 'neutral' : b > r + 12 ? 'cool' : r > b + 18 ? 'warm' : 'muted';
    } catch { return 'neutral'; }
  }
  class Stage {
    constructor({ container, frame, image, imageContainer, caption, kind = 'art', resourceURL }) {
      Object.assign(this, { container, frame, image, imageContainer, caption, kind });
      this.resourceURL = resourceURL || (p => chrome.runtime.getURL(p)); this.settings = preferences({}, kind);
      this.environment = document.createElement('div'); this.environment.className = 'gallery-environment'; this.environment.setAttribute('aria-hidden', 'true');
      this.backdrop = document.createElement('img'); this.backdrop.alt = ''; this.backdrop.draggable = false; this.backdrop.crossOrigin = 'anonymous';
      this.light = document.createElement('div'); this.light.className = 'gallery-light'; this.environment.append(this.backdrop, this.light); container.prepend(this.environment);
      container.dataset.galleryKind = kind;
      this.media = matchMedia('(prefers-color-scheme: dark)'); this.onAppearance = () => this.applyAppearance(); this.media.addEventListener('change', this.onAppearance);
      this.onResize = () => this.layout(); window.addEventListener('resize', this.onResize, { passive: true });
      this.backdrop.onload = () => { container.dataset.galleryState = 'ready'; this.layout(); };
      this.backdrop.onerror = () => { container.dataset.galleryState = 'fallback'; };
    }
    apply(settings) { this.settings = preferences(settings, this.kind); this.applyAppearance(); this.updateContent(this.content || {}, this.palette, this.scene?.id); }
    applyAppearance() { this.container.dataset.galleryTheme = this.settings.appearance === 'dark' || this.settings.appearance === 'system' && this.media.matches ? 'dark' : 'light'; }
    updateContent(content = {}, palette = 'neutral', sceneID) {
      this.content = content; this.palette = palette;
      this.scene = scenes.find(s => s.id === sceneID) || chooseScene({ palette, aspect: this.image?.naturalWidth / this.image?.naturalHeight || 1, selection: this.settings.sceneSelection });
      const root = this.container;
      root.dataset.galleryEnabled = String(this.settings.galleryEnabled); root.dataset.galleryScene = this.scene?.id || '';
      root.dataset.galleryLight = this.scene?.lightDirection || 'top'; root.dataset.lightEffects = String(this.settings.roomLightEffects);
      if (!this.settings.galleryEnabled) { this.backdrop.removeAttribute('src'); this.loadedScene = null; root.dataset.galleryState = 'plain'; }
      else if (this.scene && this.loadedScene !== this.scene.id) { this.loadedScene = this.scene.id; root.dataset.galleryState = 'loading'; this.backdrop.src = this.resourceURL(this.scene.image); }
      this.layout();
    }
    layout() {
      const aspect = this.image?.naturalWidth / this.image?.naturalHeight || .8;
      const d = dimensions(innerWidth, innerHeight, this.settings.panelWidth, this.kind, aspect);
      this.container.style.width = d.width + 'px'; this.container.style.height = d.height + 'px';
      this.container.style.setProperty('--companion-panel-height', d.height + 'px');
      if (this.kind === 'reading') {
        if (this.settings.galleryEnabled) {
          const mount = layoutArtwork(this.scene, d.width, d.height, 1, false).mount;
          for (const [key, value] of Object.entries(mount)) this.container.style.setProperty('--gallery-reading-' + key, value + 'px');
        }
        return;
      }
      const art = layoutArtwork(this.settings.galleryEnabled ? this.scene : null, d.width, d.height, aspect, this.settings.showArtworkInfo, this.settings.artworkScale);
      for (const [key, value] of Object.entries(art)) if (typeof value === 'number') this.container.style.setProperty('--gallery-art-' + key, value + 'px');
      for (const [key, value] of Object.entries(art.caption)) if (typeof value === 'number') this.container.style.setProperty('--gallery-caption-' + key, value + 'px');
      if (this.caption) this.caption.hidden = !art.caption.visible;
      this.container.dataset.galleryCaptionTone = this.captionTone(art);
    }
    captionTone(art) {
      if (!this.settings.galleryEnabled || !this.backdrop.complete || !this.backdrop.naturalWidth) return 'dark';
      try {
        const c = document.createElement('canvas'); c.width = 16; c.height = 6;
        const b = art.background, r = art.caption, ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(this.backdrop, (r.x - b.x) / b.width * this.backdrop.naturalWidth, (r.y - b.y) / b.height * this.backdrop.naturalHeight, r.width / b.width * this.backdrop.naturalWidth, 34 / b.height * this.backdrop.naturalHeight, 0, 0, 16, 6);
        const p = ctx.getImageData(0, 0, 16, 6).data; let min = 1, max = 0;
        const linear = value => value / 255 <= .04045 ? value / 255 / 12.92 : ((value / 255 + .055) / 1.055) ** 2.4;
        for (let i = 0; i < p.length; i += 4) { const l = .2126 * linear(p[i]) + .7152 * linear(p[i + 1]) + .0722 * linear(p[i + 2]); min = Math.min(min, l); max = Math.max(max, l); }
        return .94 / (max + .05) > (min + .05) / .06 ? 'light' : 'dark';
      } catch { return this.scene?.captionTone || 'dark'; }
    }
    destroy() { window.removeEventListener('resize', this.onResize); this.media.removeEventListener('change', this.onAppearance); this.backdrop.onload = this.backdrop.onerror = null; }
  }
  return { version: 2, scenes, KEYS, SIZES, TYPES, preferences, hash, safeURL, chooseScene, nextScene, dimensions, layoutArtwork, paletteFromImage, Stage };
});
