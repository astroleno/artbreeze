let gallerySettings;

async function loadSettings() {
  const result = await chrome.storage.sync.get(['enabled', 'showArtworkInfo', ...GalleryExperience.KEYS]);
  document.getElementById('enableToggle').checked = result.enabled !== false;
  document.getElementById('showInfoToggle').checked = result.showArtworkInfo !== false;
  gallerySettings.load(result);
}

async function saveSettings() {
  const settings = {
    enabled: document.getElementById('enableToggle').checked,
    showArtworkInfo: document.getElementById('showInfoToggle').checked,
    ...gallerySettings.values()
  };
  await chrome.storage.sync.set(settings);
  const tabs = await chrome.tabs.query({});
  await Promise.allSettled(tabs.map(tab => chrome.tabs.sendMessage(tab.id, { action: 'settingsChanged', settings })));
}

document.addEventListener('DOMContentLoaded', () => {
  gallerySettings = new GallerySettings(document.getElementById('gallery-settings'), 'art', saveSettings);
  document.getElementById('version').textContent = chrome.runtime.getManifest().version;
  loadSettings();
  document.getElementById('enableToggle').addEventListener('change', saveSettings);
  document.getElementById('showInfoToggle').addEventListener('change', saveSettings);
});
