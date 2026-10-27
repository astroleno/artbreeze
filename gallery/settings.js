/* Settings UI shared by the two extension popups; no network or remote code. */
(function (root) {
  'use strict';
  const api = root.GalleryExperience;
  class GallerySettings {
    constructor(host, kind, onChange) {
      this.kind = kind;
      this.host = host;
      this.media = matchMedia('(prefers-color-scheme: dark)');
      this.controls = {};
      const title = document.createElement('h2');
      title.textContent = '空间与光线';
      host.append(title);
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      this.addRow('展厅背景', 'galleryEnabled', checkbox);
      const scene = document.createElement('select');
      for (const item of [{ id: 'auto', name: '自动匹配内容' }, ...api.scenes]) {
        scene.add(new Option(item.name, item.id));
      }
      this.addRow('场景', 'sceneSelection', scene);
      const appearance = document.createElement('select');
      for (const [value, text] of [['system', '跟随系统'], ['light', '白天'], ['dark', '夜间']]) appearance.add(new Option(text, value));
      this.addRow('光线', 'appearance', appearance);
      const size = document.createElement('select');
      for (const [value, text] of [['small', '小'], ['medium', '中'], ['large', '大']]) size.add(new Option(text, value));
      this.addRow('展厅大小', 'gallerySize', size);
      this.preview = document.createElement('img');
      this.preview.className = 'gallery-settings-preview';
      this.preview.alt = '';
      this.preview.setAttribute('aria-hidden', 'true');
      this.previewLabel = document.createElement('p');
      this.previewLabel.className = 'settings-hint';
      host.append(this.preview, this.previewLabel);
      host.addEventListener('change', () => { this.update(); onChange(); });
      this.media.addEventListener('change', () => this.update());
    }

    addRow(text, key, input) {
      const label = document.createElement('label');
      label.className = 'settings-row';
      const name = document.createElement('span');
      name.textContent = text;
      input.id = key;
      input.name = key;
      input.setAttribute('aria-label', text);
      label.append(name, input);
      this.host.append(label);
      this.controls[key] = input;
    }

    load(value) {
      const prefs = api.preferences(value, this.kind);
      for (const [key, input] of Object.entries(this.controls)) {
        if (input.type === 'checkbox') input.checked = prefs[key];
        else input.value = prefs[key];
      }
      this.update();
    }

    values() {
      return Object.fromEntries(Object.entries(this.controls).map(([key, input]) => [key,
        input.type === 'checkbox' ? input.checked : input.value]));
    }

    update() {
      const prefs = this.values();
      const dark = prefs.appearance === 'dark' || (prefs.appearance === 'system' && this.media.matches);
      document.body.dataset.theme = dark ? 'dark' : 'light';
      const scene = api.chooseScene({ kind: this.kind, selection: prefs.sceneSelection, key: 'settings-preview' });
      this.preview.src = chrome.runtime.getURL(scene.image);
      this.preview.hidden = !prefs.galleryEnabled;
      this.previewLabel.textContent = prefs.galleryEnabled
        ? prefs.sceneSelection === 'auto' ? '按内容配色与比例匹配；悬停和切换光线不会换景。' : scene.name
        : this.kind === 'art' ? '使用素色背景展示完整画作。' : '使用纯色阅读界面。';
      this.controls.sceneSelection.disabled = !prefs.galleryEnabled;
      this.controls.gallerySize.disabled = !prefs.galleryEnabled;
    }
  }
  root.GallerySettings = GallerySettings;
})(globalThis);
