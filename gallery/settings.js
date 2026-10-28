/* Native, labelled controls and a preview using the same production renderer. */
(function (root) {
  'use strict';
  const G = root.GalleryExperience;
  const TITLES = { wikipedia: '百科摘要', quotes: '名言', facts: '数字趣闻', advice: '生活建议', catfacts: '猫咪趣闻', trivia: '知识问答', cocktails: '调酒', datafacts: '数据真相', gathas: '偈语' };
  class GallerySettings {
    constructor(host, kind, onChange, full = false) {
      Object.assign(this, { host, kind, onChange, full }); this.controls = {}; this.value = G.preferences({}, kind);
      this.row('启用' + (kind === 'art' ? '艺息' : '知涟'), 'enabled', 'checkbox');
      this.row('外观', 'appearance', [['system', '跟随系统'], ['light', '白天'], ['dark', '暗夜']]);
      this.row(kind === 'art' ? '展厅背景' : '阅读背景', 'galleryEnabled', 'checkbox');
      if (full) {
        if (kind === 'art') this.row('场景', 'sceneSelection', [['auto', '每轮适配换景'], ...G.scenes.map(s => [s.id, s.name])]);
        this.row(kind === 'art' ? '展开宽度' : '阅读宽度', 'panelWidth', 'range', { min: kind === 'art' ? 360 : 280, max: 800, step: 10, unit: 'px' });
        if (kind === 'art') this.row('画作占比', 'artworkScale', 'range', { min: .68, max: 1, step: .01, unit: '%' });
        this.row('自动收起', 'autoHideEnabled', 'checkbox');
        this.row('无交互时收起', 'autoHideDelay', 'number', { min: 1, max: 120, unit: '秒' });
        this.row('悬停入口展开', 'hoverToOpen', 'checkbox');
        this.row('每轮随机换内容', 'randomContentOnNewWait', 'checkbox');
        this.row('环境光影', 'roomLightEffects', 'checkbox');
        this.row('显示入口', 'showIcon', 'checkbox');
        this.row(kind === 'art' ? '显示画名与作者' : '显示来源', kind === 'art' ? 'showArtworkInfo' : 'showSourceInfo', 'checkbox');
        if (kind === 'reading') {
          this.row('百科语言', 'language', [['zh', '中文'], ['en', 'English'], ['ja', '日本語'], ['fr', 'Français'], ['de', 'Deutsch'], ['es', 'Español']]);
          const fieldset = document.createElement('fieldset'), legend = document.createElement('legend'); legend.textContent = '阅读内容'; fieldset.append(legend);
          const choices = document.createElement('div'); choices.className = 'content-types';
          for (const [id, name] of Object.entries(TITLES)) {
            const label = document.createElement('label'), input = document.createElement('input'); input.type = 'checkbox'; input.dataset.contentType = id; label.append(input, document.createTextNode(name)); choices.append(label);
          }
          fieldset.append(choices); host.append(fieldset);
        }
      }
      const note = document.createElement('p'); note.className = 'settings-hint';
      note.textContent = kind === 'reading' ? '背景开启时固定使用混凝土展厅，文字直接显示在背景上。' : '观看中、重开或切换昼夜时，当前画作与背景保持。'; host.append(note);
      this.buildPreview();
      host.addEventListener('change', () => { this.value = this.values(); this.update(); Promise.resolve(this.onChange(this.value)).catch(() => { note.textContent = '保存暂不可用，请重试。'; }); });
      host.addEventListener('input', () => this.updateOutputs());
    }
    row(name, key, type, attrs = {}) {
      const label = document.createElement('label'); label.className = 'settings-row';
      const text = document.createElement('span'); text.textContent = name;
      const input = document.createElement(Array.isArray(type) ? 'select' : 'input'); input.id = key; input.name = key; input.setAttribute('aria-label', name);
      if (Array.isArray(type)) for (const [value, title] of type) input.add(new Option(title, value)); else input.type = type;
      for (const [k, v] of Object.entries(attrs)) if (k !== 'unit') input.setAttribute(k, v);
      const wrap = document.createElement('span'); wrap.className = 'settings-control'; wrap.append(input);
      if (attrs.unit) { const output = document.createElement('output'); output.htmlFor = key; output.dataset.for = key; output.dataset.unit = attrs.unit; wrap.append(output); }
      label.append(text, wrap); this.host.append(label); this.controls[key] = input;
    }
    buildPreview() {
      this.preview = document.createElement('div'); this.preview.className = 'settings-preview'; this.preview.setAttribute('aria-label', '实际排版预览');
      this.surface = document.createElement('div'); this.surface.className = 'companion-surface'; this.surface.setAttribute('aria-hidden', 'true');
      this.frame = document.createElement('article'); this.frame.className = this.kind === 'art' ? 'companion-art-frame' : 'companion-paper';
      if (this.kind === 'art') {
        const mount = document.createElement('div'); mount.className = 'companion-painting'; this.image = document.createElement('img'); this.image.className = 'companion-image'; this.image.alt = ''; mount.append(this.image);
        this.caption = document.createElement('div'); this.caption.className = 'companion-caption';
        this.title = document.createElement('span'); this.title.className = 'companion-title'; this.artist = document.createElement('span'); this.artist.className = 'companion-artist'; this.caption.append(this.title, this.artist); this.frame.append(mount, this.caption);
      } else {
        const h = document.createElement('h2'); h.className = 'companion-heading'; h.textContent = '留一段阅读的时间';
        const p = document.createElement('div'); p.className = 'companion-body'; p.textContent = '这里预览实际字号、行距与阅读空间。\n\n悬停或聚焦时保持展开；重新打开，继续上次的阅读。';
        this.frame.append(h, p);
      }
      this.surface.append(this.frame); this.preview.append(this.surface); this.host.append(this.preview);
      this.stage = new G.Stage({ container: this.surface, frame: this.frame, image: this.image, caption: this.caption, kind: this.kind });
      this.previewContent().catch(() => { if (this.kind === 'art') { this.title.textContent = '画名'; this.artist.textContent = '作者'; } });
      this.onResize = () => this.update(); window.addEventListener('resize', this.onResize);
      this.onMedia = () => this.update(); this.media = matchMedia('(prefers-color-scheme: dark)'); this.media.addEventListener('change', this.onMedia);
    }
    async previewContent() {
      if (this.kind !== 'art') return;
      const state = await chrome.runtime.sendMessage({ action: 'reading', operation: 'load' });
      let item = state.value?.current?.item;
      if (!item) { const result = await chrome.runtime.sendMessage({ action: 'content', operation: 'catalogue' }); item = result.value?.[0]; }
      if (!item) return;
      this.title.textContent = item.title; this.artist.textContent = item.artist;
      const result = await chrome.runtime.sendMessage({ action: 'content', operation: 'image', id: item.id });
      if (result.ok) { this.image.src = result.value; await this.image.decode(); this.update(); }
    }
    load(value) {
      this.value = G.preferences(value, this.kind);
      for (const [key, input] of Object.entries(this.controls)) { if (input.type === 'checkbox') input.checked = this.value[key]; else input.value = this.value[key]; }
      for (const input of this.host.querySelectorAll('[data-content-type]')) input.checked = this.value.contentTypes.includes(input.dataset.contentType);
      this.update();
    }
    values() {
      const result = { ...this.value };
      for (const [key, input] of Object.entries(this.controls)) result[key] = input.type === 'checkbox' ? input.checked : ['number', 'range'].includes(input.type) ? Number(input.value) : input.value;
      if (this.kind === 'reading' && this.full) {
        result.contentTypes = [...this.host.querySelectorAll('[data-content-type]:checked')].map(e => e.dataset.contentType);
        if (!result.contentTypes.length) { result.contentTypes = ['wikipedia']; this.host.querySelector('[data-content-type="wikipedia"]').checked = true; }
      }
      return G.preferences(result, this.kind);
    }
    updateOutputs() {
      for (const output of this.host.querySelectorAll('output')) { const value = Number(this.controls[output.dataset.for].value); output.value = (output.dataset.for === 'artworkScale' ? Math.round(value * 100) : value) + ' ' + output.dataset.unit; }
    }
    update() {
      const prefs = this.values(); this.updateOutputs();
      document.body.dataset.theme = prefs.appearance === 'dark' || prefs.appearance === 'system' && this.media?.matches ? 'dark' : 'light';
      if (this.controls.sceneSelection) this.controls.sceneSelection.disabled = !prefs.galleryEnabled;
      if (this.controls.autoHideDelay) this.controls.autoHideDelay.disabled = !prefs.autoHideEnabled;
      this.stage.apply(prefs); this.stage.updateContent({}, 'neutral', G.chooseScene({ selection: prefs.sceneSelection })?.id);
      const width = parseFloat(this.surface.style.width), height = parseFloat(this.surface.style.height), scale = Math.min(1, (this.preview.clientWidth || 296) / width);
      this.surface.style.transform = 'scale(' + scale + ')'; this.preview.style.height = Math.ceil(height * scale) + 'px';
    }
  }
  root.GallerySettings = GallerySettings;
})(globalThis);
