// ArtBreeze Popup Script

// 加载设置
function loadSettings() {
  chrome.storage.sync.get([
    'enabled',
    'showArtworkInfo'
  ], (result) => {
    document.getElementById('enableToggle').checked = result.enabled !== false;
    document.getElementById('showInfoToggle').checked = result.showArtworkInfo !== false;
  });
}

// 保存设置
function saveSettings() {
  const settings = {
    enabled: document.getElementById('enableToggle').checked,
    showArtworkInfo: document.getElementById('showInfoToggle').checked
  };
  
  chrome.storage.sync.set(settings, () => {
    console.log('Settings saved');
    
    // 通知所有标签页的设置变更
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'settingsChanged', 
          settings: settings 
        }).catch(() => {
          // 忽略错误，某些标签页可能没有content script
        });
      });
    });
  });
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  // 绑定事件
  document.getElementById('enableToggle').addEventListener('change', saveSettings);
  document.getElementById('showInfoToggle').addEventListener('change', saveSettings);
});