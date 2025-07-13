// content.js
// 艺息ArtBreeze主脚本：所有网站插入右下角图标，AI网站支持Enter自动弹窗

(function() {
  // 配置：AI网站列表
  const AI_SITES = [
    'chat.openai.com',
    'claude.ai',
    'bard.google.com',
    'gemini.google.com',
    'www.bing.com',
    'copilot.microsoft.com',
    'chat.deepseek.com',
    'grok.x.ai',
    'x.ai',
    'yuanbao.tencent.com',
    'kimi.ai',
    'kimi.moonshot.cn',
    'doubao.com',
    'volcengine.com'
  ];

  // 判断当前是否AI网站
  function isAISite() {
    return AI_SITES.some(domain => window.location.hostname.endsWith(domain));
  }

  // 插入右下角圆形图标
  function insertArtIcon() {
    if (document.getElementById('artbreeze-fab')) return;
    try {
      const fab = document.createElement('div');
      fab.id = 'artbreeze-fab';
      fab.style.position = 'fixed';
      fab.style.right = '24px';
      fab.style.bottom = '24px';
      fab.style.width = '56px';
      fab.style.height = '56px';
      fab.style.borderRadius = '50%';
      fab.style.background = '#fff';
      fab.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
      fab.style.display = 'flex';
      fab.style.alignItems = 'center';
      fab.style.justifyContent = 'center';
      fab.style.cursor = 'pointer';
      fab.style.zIndex = 2147483647;
      fab.style.transition = 'box-shadow 0.2s';
      fab.title = '艺息ArtBreeze - 展示艺术作品';
      fab.innerHTML = '<img src="' + chrome.runtime.getURL('icons/logo48.png') + '" alt="ArtBreeze" style="width:36px;height:36px;border-radius:50%;">';
      document.body.appendChild(fab);
      fab.addEventListener('click', toggleArtPopup);
    } catch(e) {
      console.error('ArtBreeze: 插入右下角图标失败', e);
    }
  }

  // 插入/移除艺术作品弹窗
  function toggleArtPopup() {
    const popup = document.getElementById('artbreeze-popup');
    if (popup) {
      popup.remove();
      return;
    }
    showArtPopup();
  }

  // 展示艺术作品弹窗
  function showArtPopup(autoFoldMs) {
    try {
      if (document.getElementById('artbreeze-popup')) return;
      const popup = document.createElement('div');
      popup.id = 'artbreeze-popup';
      popup.style.position = 'fixed';
      popup.style.right = '96px';
      popup.style.bottom = '32px';
      popup.style.width = '320px';
      popup.style.maxWidth = '90vw';
      popup.style.background = '#fff';
      popup.style.borderRadius = '16px';
      popup.style.boxShadow = '0 4px 24px rgba(0,0,0,0.18)';
      popup.style.padding = '16px';
      popup.style.zIndex = 2147483647;
      popup.style.display = 'flex';
      popup.style.flexDirection = 'column';
      popup.style.alignItems = 'center';
      popup.style.transition = 'opacity 0.2s';
      // 示例图片，可替换为缓存图片
      popup.innerHTML = '<img src="https://artbreeze.placeholder/your-art.jpg" alt="艺术作品" style="width:100%;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:12px;">' +
        '<div style="font-size:16px;color:#333;text-align:center;">艺息ArtBreeze<br>艺术作品欣赏</div>';
      document.body.appendChild(popup);
      // 点击外部关闭
      setTimeout(() => {
        document.addEventListener('mousedown', onClickOutside, true);
      }, 0);
      // 自动折叠（仅AI网站Enter触发时）
      if (autoFoldMs) {
        setTimeout(() => {
          popup.remove();
        }, autoFoldMs);
      }
    } catch(e) {
      console.error('ArtBreeze: 展示艺术作品弹窗失败', e);
    }
  }

  // 点击弹窗外部关闭
  function onClickOutside(e) {
    const popup = document.getElementById('artbreeze-popup');
    const fab = document.getElementById('artbreeze-fab');
    if (!popup) return;
    if (popup.contains(e.target) || (fab && fab.contains(e.target))) return;
    popup.remove();
    document.removeEventListener('mousedown', onClickOutside, true);
  }

  // AI网站监听Enter键自动弹窗
  function setupEnterListener() {
    if (!isAISite()) return;
    try {
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          // 仅在未弹出时弹出
          if (!document.getElementById('artbreeze-popup')) {
            showArtPopup(20000); // 20秒后自动折叠
          }
        }
      }, true);
    } catch(e) {
      console.error('ArtBreeze: 监听Enter键失败', e);
    }
  }

  // 初始化
  function init() {
    insertArtIcon();
    setupEnterListener();
  }

  // DOM加载后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();