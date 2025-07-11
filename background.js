// ArtBreeze Background Script
// 艺息ArtBreeze - 后台服务

chrome.runtime.onInstalled.addListener(() => {
  console.log('ArtBreeze extension installed');
  
  // 设置默认设置
  chrome.storage.sync.set({
    enabled: true,
    artworkChangeInterval: 'auto', // auto, 30s, 1m, 5m
    showArtworkInfo: true,
    position: 'center', // center, top-left, top-right, bottom-left, bottom-right
    opacity: 0.9,
    autoHideDelay: 1000
  });
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.sync.get([
      'enabled',
      'artworkChangeInterval',
      'showArtworkInfo',
      'position',
      'opacity',
      'autoHideDelay'
    ], (result) => {
      sendResponse(result);
    });
    return true;
  }
  
  if (request.action === 'saveSettings') {
    chrome.storage.sync.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'toggleExtension') {
    chrome.storage.sync.get(['enabled'], (result) => {
      const newState = !result.enabled;
      chrome.storage.sync.set({ enabled: newState }, () => {
        sendResponse({ enabled: newState });
      });
    });
    return true;
  }
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 检查是否是支持的AI平台
    const supportedPlatforms = [
      'chat.openai.com',
      'claude.ai',
      'bard.google.com',
      'gemini.google.com',
      'copilot.microsoft.com',
      'bing.com',
      'chat.deepseek.com',
      'grok.x.ai',
      'yuanbao.tencent.com',
      'kimi.ai',
      'kimi.moonshot.cn'
    ];
    
    const isSupported = supportedPlatforms.some(platform => 
      tab.url.includes(platform)
    );
    
    if (isSupported) {
      // 向content script发送消息
      chrome.tabs.sendMessage(tabId, { 
        action: 'platformDetected',
        platform: tab.url 
      }).catch(() => {
        // 忽略错误，可能是页面还没有加载content script
      });
    }
  }
});

// 处理扩展图标点击
chrome.action.onClicked.addListener((tab) => {
  // 打开popup而不是执行动作
  chrome.action.openPopup();
});

// 检查权限
chrome.runtime.onStartup.addListener(() => {
  chrome.permissions.contains({
    origins: [
      'https://chat.openai.com/*',
      'https://claude.ai/*',
      'https://bard.google.com/*',
      'https://gemini.google.com/*',
      'https://copilot.microsoft.com/*',
      'https://www.bing.com/*',
      'https://chat.deepseek.com/*',
      'https://grok.x.ai/*',
      'https://yuanbao.tencent.com/*',
      'https://kimi.ai/*',
      'https://kimi.moonshot.cn/*'
    ]
  }, (hasPermissions) => {
    if (!hasPermissions) {
      console.log('ArtBreeze: Missing required permissions');
    }
  });
});