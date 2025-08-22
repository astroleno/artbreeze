// ArtBreeze Popup Script

// 加载设置
function loadSettings() {
  chrome.storage.sync.get([
    'enabled',
    'showArtworkInfo',
    'showIcon',
    'darkMode',
    'artworkSize',
    'displayDuration'
  ], (result) => {
    document.getElementById('enableToggle').checked = result.enabled !== false;
    document.getElementById('showInfoToggle').checked = result.showArtworkInfo !== false;
    document.getElementById('showIconToggle').checked = result.showIcon !== false;
    document.getElementById('darkModeToggle').checked = result.darkMode === true;
    
    // 设置画板大小
    const size = result.artworkSize || 'medium';
    document.querySelector(`input[name="artworkSize"][value="${size}"]`).checked = true;
    
    // 设置展示时长
    const duration = result.displayDuration || '10';
    document.querySelector(`input[name="displayDuration"][value="${duration}"]`).checked = true;
    
    // 应用暗夜模式
    applyDarkMode(result.darkMode === true);
  });
}

// 保存设置
function saveSettings() {
  const artworkSizeElement = document.querySelector('input[name="artworkSize"]:checked');
  const durationElement = document.querySelector('input[name="displayDuration"]:checked');
  const settings = {
    enabled: document.getElementById('enableToggle').checked,
    showArtworkInfo: document.getElementById('showInfoToggle').checked,
    showIcon: document.getElementById('showIconToggle').checked,
    darkMode: document.getElementById('darkModeToggle').checked,
    artworkSize: artworkSizeElement ? artworkSizeElement.value : 'medium',
    displayDuration: durationElement ? durationElement.value : '10'
  };
  
  chrome.storage.sync.set(settings, () => {
    console.log('Settings saved');
    
    // 应用暗夜模式
    applyDarkMode(settings.darkMode);
    
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

// 应用暗夜模式
function applyDarkMode(isDark) {
  if (isDark) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  // 绑定事件
  document.getElementById('enableToggle').addEventListener('change', saveSettings);
  document.getElementById('showInfoToggle').addEventListener('change', saveSettings);
  document.getElementById('showIconToggle').addEventListener('change', saveSettings);
  document.getElementById('darkModeToggle').addEventListener('change', saveSettings);
  
  // 绑定画板大小选择器事件
  document.querySelectorAll('input[name="artworkSize"]').forEach(radio => {
    radio.addEventListener('change', saveSettings);
  });
  
  // 绑定展示时长选择器事件
  document.querySelectorAll('input[name="displayDuration"]').forEach(radio => {
    radio.addEventListener('change', saveSettings);
  });
});