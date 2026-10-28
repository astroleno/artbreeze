/* Shared browser UI. No conversation text is inspected and no chat address is stored. */
(function (root) {
  'use strict';
  const G = root.GalleryExperience;
  const element = (tag, className, text) => { const e = document.createElement(tag); if (className) e.className = className; if (text) e.textContent = text; return e; };
  async function message(value) { const response = await chrome.runtime.sendMessage(value); if (!response?.ok) throw new Error('扩展暂不可用，请刷新页面重试。'); return response.value; }
  class Companion {
    constructor(kind) { this.kind = kind; this.ui = {}; this.loadRevision = 0; this.state = GalleryReading.empty(); this.ready = this.init(); }
    async init() {
      this.settings = G.preferences(await chrome.storage.sync.get(null), this.kind);
      this.createUI();
      this.session = new GallerySession.Session({ settings: this.settings, onShow: () => this.render(), onHide: () => this.hideUI(), onCycle: () => this.prepareCycle() });
      await this.restore();
      this.bind();
      this.applySettings();
    }
    async restore() {
      try { this.state = await message({ action: 'reading', operation: 'load' }); this.current = this.state.current?.item || null; this.sceneID = this.settings.sceneSelection === 'auto' ? this.state.current?.sceneID : this.settings.sceneSelection; this.session.locked = this.state.current?.locked === true; } catch { this.state = GalleryReading.empty(); }
      if (this.kind === 'reading' && this.current && !this.settings.contentTypes.includes(this.current.type)) this.current = null;
    }
    createUI() {
      const u = this.ui, reading = this.kind === 'reading', prefix = reading ? 'waitwiki' : 'artbreeze';
      u.container = element('section', 'companion-surface'); u.container.id = reading ? 'waitwiki-card-container' : 'artbreeze-artwork-container';
      u.container.setAttribute('aria-label', reading ? '知涟阅读' : '艺息画廊'); u.container.hidden = true;
      u.frame = element('article', reading ? 'companion-paper' : 'companion-art-frame');
      if (!reading) {
        u.imageContainer = element('div', 'companion-painting'); u.image = element('img', 'companion-image'); u.image.alt = ''; u.image.draggable = false;
        u.imageContainer.append(u.image); u.caption = element('div', 'companion-caption'); u.title = element('a', 'companion-title'); u.title.target = '_blank'; u.title.rel = 'noopener noreferrer'; u.artist = element('span', 'companion-artist');
        u.caption.append(u.title, u.artist); u.frame.append(u.imageContainer, u.caption);
      } else {
        u.title = element('h2', 'companion-heading'); u.content = element('div', 'companion-body'); u.source = element('a', 'companion-source'); u.source.target = '_blank'; u.source.rel = 'noopener noreferrer';
        u.frame.tabIndex = 0; u.frame.setAttribute('aria-label', '阅读正文'); u.frame.append(u.title, u.content, u.source);
      }
      u.notice = element('p', 'companion-notice'); u.status = element('p', 'companion-status'); u.status.setAttribute('role', 'status');
      u.updateStatus = element('p', 'companion-update-status'); u.updateStatus.setAttribute('role', 'status');
      u.tools = element('div', 'companion-tools');
      const button = (label, symbol, handler) => { const b = element('button', '', symbol); b.type = 'button'; b.setAttribute('aria-label', label); b.title = label; b.addEventListener('click', event => Promise.resolve(handler(event)).catch(e => this.error(e))); return b; };
      u.favorite = button('收藏当前内容', '♡', () => this.favorite()); u.favorite.setAttribute('aria-pressed', 'false');
      const more = element('details', 'companion-more'), summary = element('summary', '', '⋯'); summary.setAttribute('aria-label', '更多操作');
      const menu = element('div', 'companion-menu');
      u.lock = button('锁定当前内容', '锁定当前内容', () => {
        this.session.locked = !this.session.locked;
        if (this.session.locked && this.session.busy) { this.session.revision++; this.setLoading(false); u.updateStatus.textContent = '已保留当前内容。'; }
        this.persist(); this.updateTools();
      });
      const next = button(reading ? '换一条' : '换一幅', reading ? '换一条' : '换一幅', () => this.next());
      const settings = button('打开完整设置', '设置与最近内容', () => message({ action: 'openOptions' }));
      u.info = element('p', 'companion-rights');
      u.metadata = element('p', 'companion-metadata'); u.metadata.hidden = reading; if (!reading) u.metadata.tabIndex = 0;
      menu.append(u.metadata, next, u.lock, settings, u.info); more.append(summary, menu);
      u.close = button('收起', '↑', () => this.session.close()); u.tools.append(u.favorite, more, u.close);
      u.frame.append(u.notice); u.container.append(u.frame, u.status, u.tools, u.updateStatus);
      u.icon = button(reading ? '打开知涟' : '打开艺息', reading ? '知' : '艺', event => this.open({ focus: event.detail === 0 })); u.icon.id = prefix + '-circular-icon'; u.icon.className = 'companion-entry';
      document.body.append(u.container, u.icon);
      this.gallery = new G.Stage({ container: u.container, frame: u.frame, image: u.image, imageContainer: u.imageContainer, caption: u.caption, kind: this.kind });
    }
    bind() {
      const u = this.ui;
      const interaction = () => { u.container.dataset.interaction = String(this.session.interacting); };
      u.container.addEventListener('pointerenter', () => { this.session.interact('pointer', true); interaction(); });
      u.container.addEventListener('pointerleave', () => { this.session.interact('pointer', false); interaction(); });
      u.container.addEventListener('focusin', () => { this.session.interact('focus', true); interaction(); });
      u.container.addEventListener('focusout', () => queueMicrotask(() => { this.session.interact('focus', u.container.contains(document.activeElement)); interaction(); }));
      u.container.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        e.preventDefault(); e.stopPropagation();
        const details = u.container.querySelector('details');
        if (details.open) { details.open = false; details.querySelector('summary').focus({ preventScroll: true }); }
        else this.session.close();
      });
      u.icon.addEventListener('pointerenter', () => { if (this.settings.hoverToOpen) this.hoverTimer = setTimeout(() => this.open().catch(e => this.error(e)), 200); });
      u.icon.addEventListener('pointerleave', () => clearTimeout(this.hoverTimer));
      u.frame.addEventListener('scroll', () => { if (!this.current || this.restoring) return; clearTimeout(this.scrollTimer); const id = this.current.id, offset = u.frame.scrollTop; this.scrollTimer = setTimeout(() => { this.state.positions[id] = offset; message({ action: 'reading', operation: 'progress', id, offset }).catch(() => {}); }, 180); }, { passive: true });
      document.addEventListener('keydown', e => {
        if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229 || e.repeat || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || u.container.contains(e.target) || e.target === u.icon) return;
        const target = e.target;
        if (this.detectPlatform() && this.isComposer(target)) this.start();
      }, true);
      document.addEventListener('click', e => {
        const b = e.target.closest('button, [role="button"]');
        if (!b || u.container.contains(b) || b === u.icon || !this.detectPlatform()) return;
        const label = [b.getAttribute('data-testid'), b.getAttribute('aria-label'), b.getAttribute('title')].filter(Boolean).join(' ');
        if (/(?:send-button|send.message|发送|提交|^send$)/i.test(label)) this.start();
      }, true);
      document.addEventListener('submit', e => { if (this.detectPlatform() && e.target.querySelector('textarea, [contenteditable="true"], #prompt-textarea')) this.start(); }, true);
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync') {
          const old = this.settings; const values = { ...this.settings };
          for (const [key, change] of Object.entries(changes)) values[key] = change.newValue;
          this.settings = G.preferences(values, this.kind);
          if (old.sceneSelection !== this.settings.sceneSelection) { this.sceneID = G.chooseScene({ selection: this.settings.sceneSelection, kind: this.kind })?.id; this.persist(); }
          if (this.kind === 'reading' && this.current && !this.settings.contentTypes.includes(this.current.type)) { this.current = null; this.session.close(); }
          this.applySettings();
        }
        if (area === 'local' && changes.reading_state_v2) {
          if (!changes.reading_state_v2.newValue) { this.loadRevision++; this.current = null; this.preparedArtwork = null; this.state = GalleryReading.empty(); this.session.locked = false; this.session.close(); }
          else { const current = this.state.current; this.state = GalleryReading.normalize(changes.reading_state_v2.newValue); this.state.current = current; this.updateTools(); }
        }
        if (area === 'local' && changes.reading_selection_v2?.newValue) this.pendingSelection = changes.reading_selection_v2.newValue.id;
      });
      window.addEventListener('pagehide', e => { if (!e.persisted) { this.gallery.destroy(); this.session.destroy(); clearTimeout(this.hoverTimer); } });
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.session.close(false); });
    }
    detectPlatform() { return location.protocol === 'https:' && ContentProviders.supported(location.origin + (location.hostname === 'x.com' ? location.pathname : '/')); }
    isComposer(target) {
      if (!(target instanceof Element)) return false;
      return !!target.closest('#prompt-textarea, [data-testid="prompt-textarea"], [data-testid="composer-text-input"], .ProseMirror, rich-textarea, textarea:not([type="search"]), [contenteditable="true"][role="textbox"], [contenteditable="true"][data-placeholder], .tiptap');
    }
    start() { if (document.hidden || !document.hasFocus()) return; this.session.begin().catch(e => this.error(e)); }
    async requestContent() {
      if (this.kind === 'art') {
        const works = await message({ action: 'content', operation: 'catalogue' });
        const choices = works.filter(x => x.id !== this.current?.id);
        return (choices.length ? choices : works)[Math.floor(Math.random() * (choices.length || works.length))];
      }
      const types = this.settings.contentTypes, type = types[Math.floor(Math.random() * types.length)];
      return message({ action: 'content', operation: 'knowledge', type, exclude: this.current?.id });
    }
    async prepareCycle(force = false) {
      const revision = ++this.loadRevision, sessionRevision = this.session?.revision;
      const old = this.current;
      const content = force || !old || this.settings.randomContentOnNewWait ? await this.requestContent() : old;
      if (revision !== this.loadRevision || sessionRevision !== this.session?.revision) return;
      const candidate = GalleryReading.item(content);
      if (!candidate) throw new Error('内容暂不可用，请重试。');
      // A replacement is ready before the displayed work and scroll position change.
      const artwork = force && this.kind === 'art' ? await this.loadArtwork(candidate) : null;
      if (revision !== this.loadRevision || sessionRevision !== this.session?.revision) return;
      this.current = candidate;
      if (artwork) this.preparedArtwork = artwork;
      const input = { kind: this.kind, selection: this.settings.sceneSelection, palette: this.palette || 'neutral', aspect: this.ui.image?.naturalWidth / this.ui.image?.naturalHeight || 1 };
      this.previousSceneID = this.sceneID;
      this.needsScene = this.settings.galleryEnabled;
      this.sceneID = this.settings.galleryEnabled ? G.nextScene(input, this.sceneID)?.id : this.sceneID;
      if (old?.id !== this.current.id) this.ui.frame.scrollTop = 0;
    }
    async loadArtwork(item) {
      const pixels = Math.ceil(this.settings.panelWidth * devicePixelRatio);
      if (this.preparedArtwork?.id === item.id && this.preparedArtwork.pixels === pixels) return this.preparedArtwork;
      const data = await message({ action: 'content', operation: 'image', id: item.id, pixels });
      const image = new Image(); image.src = data; await image.decode();
      return { id: item.id, pixels, data, image };
    }
    async render() {
      const revision = this.session.revision;
      if (!this.current) await this.prepareCycle();
      if (revision !== this.session.revision || !this.session.visible) return;
      const u = this.ui, item = this.current;
      const prepared = this.preparedArtwork?.id === item.id;
      u.container.hidden = false; u.icon.hidden = true; u.status.textContent = this.kind === 'art' && !prepared ? '正在载入画作…' : ''; u.frame.style.visibility = this.kind === 'art' && !prepared ? 'hidden' : '';
      u.title.textContent = item.title; u.notice.textContent = item.notice || ''; u.notice.hidden = !item.notice;
      const source = G.safeURL(item.url);
      if (this.kind === 'art') {
        u.artist.textContent = item.artist; u.title.title = item.title; u.artist.title = item.artist;
        u.metadata.textContent = item.title + (item.artist ? '\n' + item.artist : '');
        if (source) u.title.href = source; else u.title.removeAttribute('href');
        try {
          const artwork = prepared ? this.preparedArtwork : await this.loadArtwork(item), { data, image } = artwork;
          if (revision !== this.session.revision || !this.session.visible || this.current?.id !== item.id) return;
          this.preparedArtwork = artwork;
          u.image.src = data; await u.image.decode();
          if (revision !== this.session.revision || !this.session.visible || this.current?.id !== item.id) return;
          u.image.alt = item.title + ' · ' + item.artist;
          this.palette = G.paletteFromImage(image);
          if (this.needsScene) {
            this.sceneID = G.nextScene({ kind: this.kind, selection: this.settings.sceneSelection, palette: this.palette, aspect: image.naturalWidth / image.naturalHeight }, this.previousSceneID)?.id;
            this.needsScene = false;
          }
          u.status.textContent = ''; u.frame.style.visibility = '';
        } catch {
          if (revision !== this.session.revision || !this.session.visible) return;
          u.status.textContent = '画作暂时无法加载。可稍后重开，或从“更多操作”换一幅。';
        }
      } else {
        u.content.textContent = item.content;
        u.source.textContent = '来源：' + item.source; u.source.hidden = !this.settings.showSourceInfo && !this.requiresAttribution();
        if (source) u.source.href = source; else u.source.removeAttribute('href');
      }
      if (revision !== this.session.revision || !this.session.visible) return;
      this.gallery.apply(this.settings); this.gallery.updateContent(item, this.palette, this.sceneID);
      this.restoring = true;
      requestAnimationFrame(() => { if (this.current?.id === item.id) u.frame.scrollTop = this.state.positions[item.id] || 0; this.restoring = false; });
      this.updateTools(); await this.persist();
    }
    setLoading(value) {
      this.session.setBusy(value); this.ui.frame.setAttribute('aria-busy', String(value));
      this.ui.container.dataset.loading = String(value);
    }
    hideUI() {
      const u = this.ui, restoreFocus = u.container.contains(document.activeElement);
      u.container.hidden = true; u.icon.hidden = !this.settings.enabled || !this.settings.showIcon;
      this.setLoading(false); u.updateStatus.textContent = '';
      const details = u.container.querySelector('details'); if (details) details.open = false;
      if (restoreFocus && !u.icon.hidden) u.icon.focus({ preventScroll: true });
    }
    applySettings() {
      this.session.configure(this.settings); this.gallery.apply(this.settings); this.gallery.updateContent(this.current || {}, this.palette, this.sceneID);
      if (!this.session.visible) this.ui.icon.hidden = !this.settings.enabled || !this.settings.showIcon;
      if (this.ui.source) this.ui.source.hidden = !this.settings.showSourceInfo && !this.requiresAttribution();
    }
    async persist() {
      if (!this.current) return;
      try { const value = await message({ action: 'reading', operation: 'record', item: this.current, sceneID: this.sceneID, locked: this.session.locked }); this.state = value; } catch { this.ui.notice.textContent = '当前内容可继续阅读，本地保存暂不可用。'; this.ui.notice.hidden = false; }
    }
    updateTools() {
      const favorite = this.state.favorites.some(x => x.id === this.current?.id);
      this.ui.favorite.textContent = favorite ? '♥' : '♡'; this.ui.favorite.setAttribute('aria-pressed', String(favorite));
      this.ui.lock.textContent = this.session.locked ? '解锁当前内容' : '锁定当前内容';
      this.ui.lock.setAttribute('aria-label', this.ui.lock.textContent); this.ui.lock.title = this.ui.lock.textContent;
      this.ui.lock.setAttribute('aria-pressed', String(this.session.locked));
      this.ui.info.textContent = [this.current?.source, this.current?.license].filter(Boolean).join('\n');
    }
    requiresAttribution() { return ['Wikipedia', 'ZenQuotes'].includes(this.current?.source) || /gapminder/i.test(this.current?.source || ''); }
    async favorite() { if (this.current) { this.state = await message({ action: 'reading', operation: 'favorite', item: this.current }); this.updateTools(); } }
    async open({ focus = false } = {}) {
      const initiator = document.activeElement;
      await this.ready;
      if (this.session.busy) { this.session.revision++; this.setLoading(false); this.ui.updateStatus.textContent = ''; }
      if (this.pendingSelection) { const state = await message({ action: 'reading', operation: 'load' }); const item = [...state.recent, ...state.favorites].find(x => x.id === this.pendingSelection); if (item) { this.current = item; this.sceneID = null; } this.pendingSelection = null; }
      const opening = this.session.open();
      if (focus && this.session.visible && (document.activeElement === initiator || document.activeElement === document.body)) {
        this.ui.container.hidden = false; this.ui.icon.hidden = true;
        (this.kind === 'reading' ? this.ui.frame : this.ui.favorite).focus({ preventScroll: true });
      }
      await opening;
    }
    async next() {
      if (!this.settings.enabled) return;
      const revision = ++this.session.revision, u = this.ui;
      this.session.locked = false; this.session.visible = true; this.setLoading(true);
      u.container.hidden = false; u.icon.hidden = true;
      u.updateStatus.textContent = this.kind === 'art' ? '正在准备下一幅画…' : '正在准备下一条内容…';
      const details = u.container.querySelector('details'), moveFocus = details.contains(document.activeElement);
      details.open = false;
      if (moveFocus) details.querySelector('summary').focus({ preventScroll: true });
      try {
        await this.prepareCycle(true);
        if (revision !== this.session.revision || !this.settings.enabled) return;
        await this.render();
        if (revision === this.session.revision) u.updateStatus.textContent = '';
      } catch {
        if (revision === this.session.revision) u.updateStatus.textContent = this.current ? '暂时无法换内容，已保留当前内容。可从更多操作重试。' : '内容暂不可用。可从更多操作重试。';
      } finally {
        if (revision === this.session.revision) { this.setLoading(false); this.updateTools(); }
      }
    }
    error(error) { if (!this.settings.enabled || document.hidden) return; this.ui.container.hidden = false; this.ui.status.textContent = error.message || '暂时不可用，请重试。'; this.session.visible = true; this.session.arm(); }
    showPopup() { return this.session.begin(); }
    showArtwork(force = false) { return force ? this.next() : this.open(); }
    showCard(force = false) { return force ? this.next() : this.open(); }
    hideArtwork() { this.session.close(); }
    hideCard() { this.session.close(); }
    get isShowingArtwork() { return this.session?.visible === true; }
    get isShowingCard() { return this.session?.visible === true; }
  }
  root.GalleryCompanion = Companion;
})(globalThis);
