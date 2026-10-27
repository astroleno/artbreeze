/* Development only: in-memory Chrome APIs and deterministic content, never packaged. */
(function () {
  const kind = document.title.includes('WaitWiki') ? 'reading' : 'art';
  const query = new URLSearchParams(location.search);
  const base = new URL('../', location.href);
  const storageKey = `gallery-fixture-${kind}`;
  const initial = {
    enabled: true, showArtworkInfo: true, showSourceInfo: true, showIcon: true,
    contentTypes: ['wikipedia', 'quotes', 'facts', 'advice', 'catfacts', 'trivia', 'cocktails', 'datafacts', 'gathas'],
    cardSize: 'medium', displayDuration: '10'
  };
  let sync = { ...initial, ...JSON.parse(sessionStorage.getItem(storageKey) || '{}') };
  if (query.has('gallery')) sync.galleryEnabled = query.get('gallery') === 'true';
  if (query.has('scene')) sync.sceneSelection = query.get('scene');
  if (query.has('appearance')) sync.appearance = query.get('appearance');
  const local = {};
  const changes = [];
  const messages = [];
  const resultFor = (store, keys) => keys === null ? { ...store }
    : Object.fromEntries((Array.isArray(keys) ? keys : [keys]).filter(key => store[key] !== undefined).map(key => [key, store[key]]));
  const area = (store, name) => ({
    get(keys, callback) { const value = resultFor(store, keys); if (callback) callback(value); return Promise.resolve(value); },
    set(value, callback) {
      const event = Object.fromEntries(Object.entries(value).map(([key, newValue]) => [key, { oldValue: store[key], newValue }]));
      Object.assign(store, value);
      if (name === 'sync') sessionStorage.setItem(storageKey, JSON.stringify(store));
      changes.forEach(listener => listener(event, name));
      if (callback) callback();
      return Promise.resolve();
    }
  });
  window.chrome = {
    storage: { sync: area(sync, 'sync'), local: area(local, 'local'), onChanged: { addListener: fn => changes.push(fn) } },
    runtime: {
      id: 'local-gallery-fixture', lastError: null,
      getURL: path => new URL(path, base).href,
      getManifest: () => ({ version: kind === 'reading' ? '1.3.0' : '1.1.0' }),
      onMessage: { addListener: fn => messages.push(fn) },
      sendMessage: async () => ({ success: true })
    },
    tabs: { query: async () => [], sendMessage: async () => {} }
  };
  const nativeFetch = window.fetch.bind(window);
  const works = [
    { title: '山间的光（测试画作）', creator: '横幅排版夹具', image: new URL('tests/fixtures/landscape.svg', base).href },
    { title: '静物（测试画作）', creator: '竖幅排版夹具', image: new URL('tests/fixtures/portrait.svg', base).href },
    { title: '水面（测试画作）', creator: '方幅排版夹具', image: new URL('tests/fixtures/square.svg', base).href }
  ];
  window.fixtureWorks = works;
  window.fixtureErrors = [];
  window.addEventListener('error', event => { if (event.error) window.fixtureErrors.push(event.error.message); });
  window.addEventListener('unhandledrejection', event => window.fixtureErrors.push(String(event.reason)));
  window.fetch = async function (input, init) {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.origin === location.origin) return nativeFetch(input, init);
    if (url.hostname === 'www.gstatic.com') return new Response(JSON.stringify(works.map(work => ({ ...work, link: 'https://example.org/art' }))));
    if (url.hostname.endsWith('wikipedia.org')) return new Response(JSON.stringify({
      title: '光与空间', extract: '展厅中的留白让观看有了节奏。画作周围的空间、柔和的光线与恰当的观看距离，会共同影响我们停留的时间。这是用于检查阅读排版的本地测试内容。',
      content_urls: { desktop: { page: 'https://zh.wikipedia.org/wiki/光' } }
    }));
    return new Response('{}', { status: 503 });
  };
})();
