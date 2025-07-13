// popup.js
// 在页面右下角插入艺术作品图片，3秒后自动消失
try {
  // 避免重复插入
  if (!document.getElementById('artbreeze-artwork')) {
    const img = document.createElement('img');
    img.id = 'artbreeze-artwork';
    img.src = 'https://artbreeze.placeholder/your-art.jpg'; // TODO: 替换为实际图片或缓存图片
    img.alt = '艺息ArtBreeze 艺术作品';
    img.style.position = 'fixed';
    img.style.bottom = '20px';
    img.style.right = '20px';
    img.style.width = '200px';
    img.style.zIndex = 99999;
    img.style.borderRadius = '16px';
    img.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
    img.style.background = '#fff';
    img.style.padding = '8px';
    document.body.appendChild(img);
    // 3秒后自动消失
    setTimeout(() => {
      img.remove();
    }, 3000);
    console.log('ArtBreeze: 艺术作品已插入页面');
  }
} catch (e) {
  console.error('ArtBreeze: 插入艺术作品失败', e);
}

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