importScripts('gallery/catalogue.js', 'gallery/experience.js', 'gallery/reading-state.js', 'providers.js');
const kind = chrome.runtime.getManifest().name.includes('WaitWiki') ? 'reading' : 'art';
const providers = new ContentProviders.Providers({ kind, storage: chrome.storage.local, resourceURL: path => chrome.runtime.getURL(path) });
let queue = Promise.resolve();
const STATE_KEY = 'reading_state_v2';
async function migrate() {
  const existing = await chrome.storage.sync.get(null);
  await chrome.storage.sync.set(GalleryExperience.preferences(existing, kind));
}
chrome.runtime.onInstalled.addListener(() => { migrate().catch(() => {}); });
function enqueue(task) { const next = queue.then(task); queue = next.catch(() => {}); return next; }
async function reading(command, sender) {
  return enqueue(async () => {
    const saved = await chrome.storage.local.get(STATE_KEY);
    let state = GalleryReading.normalize(saved[STATE_KEY]);
    const key = sender.tab ? 'reading_tab_' + sender.tab.id : null;
    if (command.operation === 'load') {
      if (key && chrome.storage.session) {
        const tab = await chrome.storage.session.get(key); if (tab[key]) state.current = GalleryReading.normalize({ current: tab[key] }).current;
      }
      return state;
    }
    if (!['record', 'favorite', 'progress', 'clear', 'select'].includes(command.operation)) throw new Error('Unknown state operation');
    if (command.operation === 'select') {
      const chosen = [...state.favorites, ...state.recent].find(x => x.id === command.id);
      if (!chosen) throw new Error('Unknown content');
      state = GalleryReading.reduce(state, { operation: 'record', item: chosen });
    } else state = GalleryReading.reduce(state, command);
    await chrome.storage.local.set({ [STATE_KEY]: state });
    if (key && chrome.storage.session && command.operation === 'record') await chrome.storage.session.set({ [key]: state.current });
    if (command.operation === 'clear') {
      const all = await chrome.storage.local.get(null); await chrome.storage.local.remove(Object.keys(all));
      if (chrome.storage.session) await chrome.storage.session.clear();
      providers.artworks = null; providers.recentKnowledge?.clear();
    }
    return state;
  });
}
async function dispatch(request, sender) {
  if (!ContentProviders.allowedSender(sender, chrome.runtime.id)) throw new Error('Sender denied');
  if (request.action === 'reading') return reading(request, sender);
  if (request.action === 'openOptions') { await chrome.runtime.openOptionsPage(); return true; }
  if (request.action === 'content') {
    if (kind === 'art' && request.operation === 'catalogue') return providers.catalogue();
    if (kind === 'art' && request.operation === 'image' && typeof request.id === 'string') return providers.image(request.id, request.pixels);
    if (kind === 'reading' && request.operation === 'knowledge') {
      const prefs = GalleryExperience.preferences(await chrome.storage.sync.get(null), kind);
      if (!prefs.contentTypes.includes(request.type)) throw new Error('Content type disabled');
      if (request.exclude !== undefined && (typeof request.exclude !== 'string' || !/^[a-z0-9]{1,32}$/.test(request.exclude))) throw new Error('Invalid content ID');
      return providers.knowledge(request.type, prefs.language, request.exclude);
    }
  }
  throw new Error('Unknown operation');
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || typeof request !== 'object') return false;
  dispatch(request, sender).then(value => sendResponse({ ok: true, value }), error => sendResponse({ ok: false, error: error.message }));
  return true;
});
chrome.tabs.onRemoved.addListener(tabId => { chrome.storage.session?.remove('reading_tab_' + tabId).catch(() => {}); });
