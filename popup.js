document.addEventListener('DOMContentLoaded', async () => {
  const kind = chrome.runtime.getManifest().name.includes('WaitWiki') ? 'reading' : 'art';
  const settings = new GallerySettings(document.getElementById('settings'), kind, value => chrome.storage.sync.set(value), document.body.dataset.full === 'true');
  settings.load(await chrome.storage.sync.get(null));
  document.getElementById('version').textContent = chrome.runtime.getManifest().version;
  document.getElementById('open-settings')?.addEventListener('click', () => chrome.runtime.openOptionsPage());
  const status = document.getElementById('save-status');
  chrome.storage.onChanged.addListener(async (_, area) => { if (area === 'sync') { settings.load(await chrome.storage.sync.get(null)); if (status) status.textContent = '已保存'; } });
});
