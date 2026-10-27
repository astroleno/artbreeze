const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const gallery = require('../gallery/experience.js');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
const kind = manifest.name.includes('WaitWiki') ? 'reading' : 'art';

test('24 local scenes are complete, unique, and match the reviewed hashes', () => {
  const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'gallery/scenes.json')));
  assert.deepEqual(catalogue.scenes, gallery.scenes);
  assert.equal(gallery.scenes.length, 24);
  assert.equal(new Set(gallery.scenes.map(s => s.id)).size, 24);
  let total = 0;
  for (const scene of gallery.scenes) {
    const bytes = fs.readFileSync(path.join(root, scene.image));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), scene.provenance.sha256);
    assert.ok(scene.mount.x >= 0 && scene.mount.x + scene.mount.width <= 1);
    assert.ok(scene.mount.y >= 0 && scene.mount.y + scene.mount.height <= 1);
    assert.equal(scene.width, 1280);
    total += bytes.length;
  }
  assert.ok(total < 1_500_000, 'The whole scene collection stays below 1.5 MB');
});

test('product defaults, legacy dark mode, and invalid preferences normalize safely', () => {
  assert.equal(gallery.preferences({}, 'art').galleryEnabled, true);
  assert.equal(gallery.preferences({}, 'reading').galleryEnabled, false);
  assert.equal(gallery.preferences({}).appearance, 'system');
  assert.equal(gallery.preferences({ darkMode: true }).appearance, 'dark');
  assert.equal(gallery.preferences({ darkMode: false }).appearance, 'light');
  assert.equal(gallery.preferences({ darkMode: true, appearance: 'system' }).appearance, 'system');
  assert.deepEqual(gallery.preferences({ sceneSelection: '../bad', gallerySize: 'bad', appearance: 'bad' }), gallery.preferences({}));
  assert.equal(gallery.preferences({ galleryEnabled: false }).galleryEnabled, false);
});

test('matching is deterministic, content aware, and all 24 fixed scenes are reachable', () => {
  const input = { key: 'painting-1', aspect: 1.8, palette: 'warm' };
  assert.equal(gallery.chooseScene(input).id, gallery.chooseScene(input).id);
  assert.ok(gallery.chooseScene(input).palettes.includes('warm'));
  const chosen = new Set(Array.from({ length: 30 }, (_, i) => gallery.chooseScene({ key: `art-${i}`, aspect: i % 2 ? .6 : 1.8, palette: i % 2 ? 'cool' : 'warm' }).id));
  assert.ok(chosen.size > 1);
  for (const scene of gallery.scenes) assert.equal(gallery.chooseScene({ selection: scene.id }).id, scene.id);
  assert.ok(gallery.chooseScene({ kind: 'reading', key: 'reading' }).readingSafe);
  assert.ok(gallery.chooseScene({ selection: 'removed-scene' }));
});

test('painting stays centered, contained, proportional, and separate from its caption', () => {
  for (const scene of gallery.scenes) {
    for (const width of [240, 320, 360, 520, 660]) {
      for (const aspect of [.35, .65, 1, 1.6, 3.5]) {
        const height = width * 9 / 16;
        const art = gallery.layoutArtwork(scene, width, height, aspect);
        assert.ok(Math.abs(art.x + art.width / 2 - width / 2) < .001, scene.id);
        assert.ok(art.x >= 0 && art.x + art.width <= width);
        assert.ok(art.y >= 0 && art.y + art.height <= height);
        assert.ok(Math.abs(art.width / art.height - aspect) < .001);
        if (art.caption.visible) {
          assert.ok(art.caption.x >= art.x + art.width);
          assert.ok(art.caption.x + art.caption.width <= width);
        }
      }
    }
  }
});

test('all gallery sizes fit small screens and short windows', () => {
  for (const kind of ['art', 'reading']) for (const size of ['small', 'medium', 'large']) {
    for (const [width, height] of [[320, 568], [390, 300], [1280, 800]]) {
      const stage = gallery.dimensions(width, height, size, kind);
      assert.ok(stage.width <= width - 32);
      assert.ok(stage.height <= height - 32 + .001);
    }
  }
});

test('only safe source links are navigable', () => {
  assert.equal(gallery.safeURL('javascript:alert(1)'), null);
  assert.equal(gallery.safeURL('data:text/html,bad'), null);
  assert.equal(gallery.safeURL('https://example.org/a'), 'https://example.org/a');
});

test('MV3 declares local scripts and images on supported AI sites only', () => {
  assert.equal(manifest.manifest_version, 3);
  const scripts = manifest.content_scripts[0];
  assert.deepEqual(scripts.js.slice(0, 2), ['gallery/catalogue.js', 'gallery/experience.js']);
  assert.ok(!scripts.matches.includes('<all_urls>'));
  assert.ok(scripts.matches.includes('https://chatgpt.com/*'));
  const resources = manifest.web_accessible_resources.flatMap(item => item.resources);
  assert.ok(resources.includes('gallery/images/*.webp'));
  for (const group of manifest.web_accessible_resources) for (const match of group.matches) {
    assert.match(match, /^https:\/\/[^/]+\/\*$/, 'MV3 resource matches must use an origin with /*');
  }
  for (const file of [...scripts.js, ...scripts.css, manifest.background.service_worker, manifest.action.default_popup]) {
    assert.ok(fs.existsSync(path.join(root, file)), file);
  }
});

test('install/update preserves disabled state, fixed scenes, and legacy appearance', async () => {
  let onInstalled;
  const stored = { enabled: false, sceneSelection: 'bg-004', darkMode: true, contentTypes: ['gathas'] };
  const event = { addListener() {} };
  const chrome = {
    runtime: { onInstalled: { addListener(fn) { onInstalled = fn; } }, onMessage: event, onStartup: event },
    storage: { sync: { async get() { return { ...stored }; }, async set(value) { Object.assign(stored, value); } } },
    tabs: { onUpdated: event }, action: { onClicked: event }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'background.js'), 'utf8'), { chrome, GalleryExperience: gallery, importScripts() {}, console: { log() {} } });
  await onInstalled({ reason: 'update' });
  assert.equal(stored.enabled, false);
  assert.equal(stored.sceneSelection, 'bg-004');
  assert.equal(stored.appearance, 'dark');
  assert.deepEqual(stored.contentTypes, ['gathas']);
  assert.equal(stored.galleryEnabled, kind === 'art');
});

if (kind === 'art') test('closing during an artwork load cannot reopen the gallery', async () => {
  const code = fs.readFileSync(path.join(root, 'content.js'), 'utf8').replace('const artBreeze = new ArtBreeze();', 'globalThis.TestApp = ArtBreeze;');
  const context = { GalleryExperience: gallery, console: { log() {}, warn() {} }, clearTimeout, document: { removeEventListener() {} } };
  vm.runInNewContext(code, context);
  const app = Object.create(context.TestApp.prototype);
  let resolve;
  let changedImage = false;
  Object.assign(app, {
    settings: { enabled: true }, displayRevision: 0,
    currentArtwork: { image: 'test', title: 'Test' },
    getImage: () => new Promise(done => { resolve = done; }),
    ui: { container: { classList: { remove() {} } }, icon: { style: {} }, image: { set src(_) { changedImage = true; } } }
  });
  app.showArtwork();
  app.hideArtwork();
  resolve({ src: 'late-image', async decode() {} });
  await new Promise(done => setImmediate(done));
  assert.equal(app.isShowingArtwork, false);
  assert.equal(changedImage, false);
});
