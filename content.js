// ArtBreeze Content Script V7.0 - Safe, Stable, and Event-Driven
// 艺息ArtBreeze - 在AI对话期间展示名画

class ArtBreeze {
  constructor() {
    this.isShowingArtwork = false;
    this.conversationState = 'idle'; // 'idle' | 'generating'
    this.artworks = [];
    this.lastArtworkIndex = -1;
    this.settings = { enabled: true, showArtworkInfo: true };
    this.activeSubObservers = new Set();
    this.ui = {}; // Will be populated by createUI
    
    // 全局跨站点图片缓存池 - 使用chrome.storage持久化
    this.globalCacheKey = 'artbreeze_global_cache_v1';
    this.cachedImages = new Map(); // 内存缓存
    this.cacheStats = { hits: 0, misses: 0, failures: 0 };
    this.preloadedImageUrls = new Set(); // 记录已预载的图片URL
    
    // V8.4: 更精确的平台检测和输入框匹配
    this.platformConfig = {
      chatgpt: {
        sendButton: 'button[data-testid="send-button"]',
        inputArea: '#prompt-textarea',
        responseContainer: '[data-message-author-role="assistant"]',
        generatingIndicator: 'button[data-testid="stop-button"]',
      },
      claude: {
        sendButton: 'button[data-testid="send-button"]',
        inputArea: 'div[contenteditable="true"]',
        responseContainer: 'div[data-is-streaming="true"]',
        generatingIndicator: 'button[aria-label="Stop generating"]',
      },
      gemini: {
        sendButton: 'button[aria-label="Send message"]',
        inputArea: 'rich-textarea',
        responseContainer: 'model-response',
        generatingIndicator: '.loading-dots',
      },
      deepseek: {
        sendButton: 'button:has(svg)',
        inputArea: 'textarea',
        responseContainer: '.message.assistant',
        generatingIndicator: '.loading',
      },
      copilot: {
        sendButton: 'button[type="submit"]',
        inputArea: '#userInput',
        responseContainer: '.ac-container',
        generatingIndicator: '.typing-indicator',
      },
      kimi: {
        sendButton: 'button[data-testid="send-button"]',
        inputArea: 'textarea',
        responseContainer: '.message-assistant',
        generatingIndicator: '.generating',
      },
      grok: {
        sendButton: 'button[data-testid="send-button"]',
        inputArea: 'div[contenteditable="true"]',
        responseContainer: '.grok-response',
        generatingIndicator: '.generating',
      },
      yuanbao: {
        sendButton: 'button[type="submit"]',
        inputArea: 'textarea',
        responseContainer: '.message-assistant',
        generatingIndicator: '.generating',
      },
    };

    this.init();
  }

  async init() {
    await this.loadSettings();
    this.createUISafe();
    this.setupEventListeners();
    
    // 加载全局缓存
    await this.loadGlobalCache();
    
    // 图标在所有网站都显示
    this.showCircularIcon();
    
    // 在所有网站都设置通用Enter键监听
    this.setupUniversalEnterListener();
    
    // 页面卸载时保存缓存
    window.addEventListener('beforeunload', () => {
      this.saveGlobalCache();
    });
    
    const platform = this.detectPlatform();
    await this.loadArtworksFromAPI();
    console.log(`ArtBreeze V8.4 Initialized on ${platform || 'a non-LLM page'} with global cache (${this.cachedImages.size} images cached).`);
  }

  detectPlatform() {
    const H = window.location.hostname;
    const P = window.location.pathname;
    
    // 更精确的平台检测
    if (H.includes('chatgpt.com') || H.includes('chat.openai.com')) return 'chatgpt';
    if (H.includes('claude.ai')) return 'claude';
    if (H.includes('gemini.google.com') || H.includes('bard.google.com')) return 'gemini';
    if (H.includes('copilot.microsoft.com') || H.includes('bing.com')) return 'copilot';
    if (H.includes('kimi.moonshot.cn') || H.includes('kimi.ai')) return 'kimi';
    if (H.includes('grok') || (H.includes('x.com') && P.includes('grok'))) return 'grok';
    if (H.includes('chat.deepseek.com')) return 'deepseek';
    if (H.includes('yuanbao.tencent.com')) return 'yuanbao';
    if (H.includes('doubao.com') || H.includes('volcengine.com')) return 'doubao';
    return null;
  }

  async loadSettings() {
    const data = await chrome.storage.sync.get(['enabled', 'showArtworkInfo']);
    this.settings.enabled = data.enabled !== false;
    this.settings.showArtworkInfo = data.showArtworkInfo !== false;
  }

  // 加载全局缓存
  async loadGlobalCache() {
    try {
      const result = await chrome.storage.local.get([this.globalCacheKey]);
      const cacheData = result[this.globalCacheKey] || {};
      console.log(`ArtBreeze: Loading global cache with ${Object.keys(cacheData).length} entries`);
      
      // 恢复内存缓存
      for (const [url, base64] of Object.entries(cacheData)) {
        const img = new Image();
        img.src = base64;
        this.cachedImages.set(url, img);
        this.preloadedImageUrls.add(url);
      }
      
      console.log(`ArtBreeze: Global cache loaded, ${this.cachedImages.size} images ready`);
    } catch (error) {
      console.warn('ArtBreeze: Failed to load global cache:', error);
    }
  }

  // 保存全局缓存
  async saveGlobalCache() {
    try {
      const cacheData = {};
      let savedCount = 0;
      
      // 限制缓存大小，只保存最近的50张图片
      const maxCacheSize = 50;
      const entries = Array.from(this.cachedImages.entries()).slice(-maxCacheSize);
      
      for (const [url, img] of entries) {
        if (img && img.src && img.src.startsWith('data:')) {
          cacheData[url] = img.src;
          savedCount++;
        }
      }
      
      await chrome.storage.local.set({ [this.globalCacheKey]: cacheData });
      console.log(`ArtBreeze: Global cache saved, ${savedCount} images stored`);
    } catch (error) {
      console.warn('ArtBreeze: Failed to save global cache:', error);
    }
  }

  setupUniversalEnterListener() {
    console.log('ArtBreeze: Setting up universal Enter key detection');
    
    // 添加更多的事件监听器来捕获ChatGPT的输入
    document.addEventListener('keydown', (e) => {
      // 确保网页处于激活状态
      if (document.hidden || !document.hasFocus()) {
        return;
      }
      
      // 只在启用且是Enter键（非Shift+Enter，非Ctrl+Enter）时触发
      if (!this.settings.enabled || e.key !== 'Enter' || e.shiftKey || e.ctrlKey) {
        return;
      }
      
      const target = e.target;
      console.log(`ArtBreeze: Enter key pressed on element:`, {
        tagName: target.tagName,
        contentEditable: target.contentEditable,
        className: target.className,
        id: target.id,
        placeholder: target.placeholder,
        role: target.getAttribute('role'),
        spellcheck: target.getAttribute('spellcheck'),
        isContentEditable: target.isContentEditable,
        closest_prosemirror: !!target.closest('.ProseMirror'),
        closest_prompt_textarea: !!target.closest('[data-testid="prompt-textarea"]'),
        closest_contenteditable: !!target.closest('[contenteditable="true"]')
      });
      
      // 确保目标元素处于焦点状态且是活动元素
      if (target !== document.activeElement) {
        console.log('ArtBreeze: Target is not active element, but checking anyway');
        // 不直接返回，继续检查
      }
      
      // 更全面的输入框检测
      const isTextInput = this.isTextInputElement(target);
      
      console.log(`ArtBreeze: Is text input: ${isTextInput}`);
      
      if (isTextInput) {
        const platform = this.detectPlatform();
        console.log(`ArtBreeze: Platform detected: ${platform}`);
        if (platform) {
          console.log(`ArtBreeze: Enter detected in active input on ${platform}, showing popup`);
          this.showPopup();
        }
      }
    }, true);
    
    // 添加一个更宽泛的监听器用于ChatGPT
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && this.settings.enabled) {
        const platform = this.detectPlatform();
        if (platform === 'chatgpt') {
          const target = e.target;
          console.log(`ArtBreeze: ChatGPT keyup Enter detected on:`, {
            tagName: target.tagName,
            contentEditable: target.contentEditable,
            className: target.className,
            closest_prosemirror: !!target.closest('.ProseMirror'),
            closest_prompt: !!target.closest('[data-testid="prompt-textarea"]')
          });
          
          // 特别检查ChatGPT的编辑器
          if (target.closest('.ProseMirror') || 
              target.closest('[data-testid="prompt-textarea"]') ||
              target.isContentEditable) {
            console.log('ArtBreeze: ChatGPT editor detected via keyup, showing popup');
            this.showPopup();
          }
        }
      }
    }, true);
    
    console.log('ArtBreeze: Universal Enter listener ready');
  }
  
  isTextInputElement(element) {
    // 基本检查
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      return true;
    }
    
    // contenteditable检查
    if (element.contentEditable === 'true' || element.getAttribute('contentededitable') === 'true') {
      return true;
    }
    
    // 特定平台的特殊元素
    const platform = this.detectPlatform();
    if (platform === 'chatgpt') {
      // ChatGPT的ProseMirror编辑器 - 更精确的检测
      if (element.classList.contains('ProseMirror') || 
          element.closest('.ProseMirror') ||
          element.closest('[data-testid="prompt-textarea"]') ||
          element.id === 'prompt-textarea' ||
          element.closest('#prompt-textarea') ||
          // 检查是否在ChatGPT的输入区域内
          element.closest('[data-testid="composer-text-input"]') ||
          element.closest('[data-testid="chat-input"]') ||
          // 检查父元素是否包含输入相关的类名
          element.closest('[class*="input"]') ||
          element.closest('[class*="textarea"]') ||
          element.closest('[class*="composer"]') ||
          // 检查是否有输入框的特征
          (element.getAttribute('spellcheck') === 'false' && element.tagName === 'DIV') ||
          // 检查是否在可编辑的div内
          (element.tagName === 'DIV' && element.getAttribute('contenteditable') === 'true') ||
          (element.tagName === 'P' && element.closest('[contenteditable="true"]'))) {
        return true;
      }
    }
    
    if (platform === 'kimi') {
      // Kimi的输入框
      if (element.closest('.kimi-chat-input') ||
          element.closest('[data-testid="chat-input"]') ||
          element.matches('[placeholder*="请输入"]') ||
          element.matches('[placeholder*="问问"]')) {
        return true;
      }
    }
    
    if (platform === 'grok') {
      // Grok的输入框（在X平台上）
      if (element.closest('[data-testid="tweetTextarea"]') ||
          element.closest('.grok-input') ||
          element.matches('[placeholder*="Ask Grok"]') ||
          element.matches('[aria-label*="message"]')) {
        return true;
      }
    }
    
    // 通用检查
    if (element.getAttribute('role') === 'textbox' ||
        element.closest('[role="textbox"]') ||
        element.matches('[data-testid*="input"]') ||
        element.matches('[placeholder]') ||
        element.closest('textarea') ||
        element.closest('[contenteditable="true"]') ||
        // 更宽泛的检查
        (element.tagName === 'DIV' && element.isContentEditable)) {
      return true;
    }
    
    return false;
  }

  showPopup() {
    console.log("ArtBreeze: Showing popup immediately");
    this.onConversationStart();
    
    // 每次显示popup时，预加载一张新图片到缓存
    this.preloadOneMoreImage();
    
    // 20秒后自动隐藏
    setTimeout(() => {
      console.log("ArtBreeze: Auto-hiding popup");
      this.onConversationEnd(null);
    }, 20000);
  }

  // 每次触发时预加载一张新图片
  preloadOneMoreImage() {
    const uncachedArtworks = this.artworks.filter(artwork => 
      !this.preloadedImageUrls.has(artwork.image)
    );
    
    if (uncachedArtworks.length > 0) {
      const randomArtwork = uncachedArtworks[Math.floor(Math.random() * uncachedArtworks.length)];
      console.log(`ArtBreeze: Preloading new image: ${randomArtwork.title}`);
      
      this.preloadImageWithBase64(randomArtwork.image, randomArtwork.title)
        .then(() => {
          console.log(`ArtBreeze: Successfully preloaded: ${randomArtwork.title}`);
        })
        .catch(error => {
          console.warn(`ArtBreeze: Failed to preload: ${randomArtwork.title}`, error);
        });
    } else {
      console.log('ArtBreeze: All images already cached');
    }
  }

  // V7: Safe UI creation using createElement
  createUISafe() {
    // Container
    const container = document.createElement('div');
    container.id = 'artbreeze-artwork-container';
    this.ui.container = container;

    // Frame
    const frame = document.createElement('div');
    frame.className = 'artbreeze-artwork-frame';
    this.ui.frame = frame;

    // Image Container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'artbreeze-artwork-image-container';

    // Loader
    const loader = document.createElement('div');
    loader.className = 'artbreeze-loader';
    this.ui.loader = loader;

    // Image
    const image = document.createElement('img');
    image.className = 'artbreeze-artwork-image';
    image.alt = '';
    this.ui.image = image;

    imageContainer.append(loader, image);

    // Info Container
    const info = document.createElement('div');
    info.className = 'artbreeze-artwork-info';
    this.ui.info = info;

    // Title
    const title = document.createElement('h3');
    title.className = 'artbreeze-artwork-title';
    this.ui.title = title;

    // Artist
    const artist = document.createElement('p');
    artist.className = 'artbreeze-artwork-artist';
    this.ui.artist = artist;

    info.append(title, artist);
    frame.append(imageContainer, info);
    container.appendChild(frame);
    document.body.appendChild(container);

    // Circular Icon
    const icon = document.createElement('div');
    icon.id = 'artbreeze-circular-icon';
    const iconImg = document.createElement('img');
    iconImg.className = 'artbreeze-icon-image';
    iconImg.src = chrome.runtime.getURL('icons/logo48.png');
    iconImg.alt = 'ArtBreeze';
    icon.appendChild(iconImg);
    document.body.appendChild(icon);
    this.ui.icon = icon;
  }

  setupEventListeners() {
    this.ui.icon.addEventListener('click', (e) => {
      console.log('ArtBreeze: Icon clicked');
      e.stopPropagation();
      if (!this.settings.enabled) {
        console.log('ArtBreeze: Plugin disabled, ignoring click');
        return;
      }
      console.log(`ArtBreeze: Icon click - currently showing: ${this.isShowingArtwork}`);
      this.isShowingArtwork ? this.hideArtwork() : this.showArtwork(true);
    });

    chrome.storage.onChanged.addListener((changes) => {
      Object.keys(changes).forEach(key => {
        if (this.settings.hasOwnProperty(key)) this.settings[key] = changes[key].newValue;
      });
      this.applySettings();
    });
  }
  
  applySettings() {
    if (!this.settings.enabled) {
      this.hideArtwork();
      this.hideCircularIcon();
    } else {
      this.showCircularIcon();
    }
    this.updateArtworkInfoVisibility();
  }

  setupActionListeners(platform) {
    const config = this.platformConfig[platform];
    console.log(`ArtBreeze: Setting up auto-popup listeners for ${platform}`);
    console.log(`ArtBreeze: Send button: ${config.sendButton}`);
    console.log(`ArtBreeze: Input area: ${config.inputArea}`);
    console.log(`ArtBreeze: Response container: ${config.responseContainer}`);
    
    const handler = () => {
      if (!this.settings.enabled) {
        console.log('ArtBreeze: Auto-popup disabled in settings');
        return;
      }
      console.log(`ArtBreeze: Send action detected on ${platform}`);
      this.waitForResponse(config);
    };

    // 更强的点击监听
    document.addEventListener('click', (e) => {
      try {
        const target = e.target;
        // 检查直接匹配
        if (target.matches && target.matches(config.sendButton)) {
          console.log(`ArtBreeze: Direct send button match on ${platform}`);
          handler();
          return;
        }
        // 检查父元素匹配
        const sendButton = target.closest(config.sendButton);
        if (sendButton) {
          console.log(`ArtBreeze: Parent send button match on ${platform}`);
          handler();
          return;
        }
      } catch (err) {
        console.warn('ArtBreeze: Click handler error:', err);
      }
    }, true);

    // 键盘监听
    document.addEventListener('keydown', (e) => {
      try {
        if (e.key === 'Enter' && !e.shiftKey) {
          const target = e.target;
          if (target.matches && target.matches(config.inputArea)) {
            console.log(`ArtBreeze: Direct input Enter on ${platform}`);
            handler();
            return;
          }
          const inputArea = target.closest(config.inputArea);
          if (inputArea) {
            console.log(`ArtBreeze: Parent input Enter on ${platform}`);
            handler();
            return;
          }
        }
      } catch (err) {
        console.warn('ArtBreeze: Keydown handler error:', err);
      }
    }, true);

    console.log(`ArtBreeze: Auto-popup listeners ready for ${platform}`);
  }

  waitForResponse(config) {
    console.log("ArtBreeze: Starting artwork display");
    
    // 立即显示艺术作品
    this.onConversationStart();
    
    // 简单的定时器隐藏，不再过度检测
    setTimeout(() => {
      console.log("ArtBreeze: Auto-hiding artwork after delay");
      this.onConversationEnd(null);
    }, 12000); // 12秒后隐藏
  }

  monitorResponse(targetNode, config) {
    console.log("ArtBreeze: Starting to monitor response for AI output");
    
    let typingTimer;
    let hasStarted = false;
    let lastTextLength = 0;
    const checkInterval = 500; // 每500ms检查一次
    const timeout = 3000; // 3秒无变化则认为结束

    const checkForTextGrowth = () => {
      const currentTextLength = targetNode.textContent.length;
      console.log(`ArtBreeze: Text length check - Current: ${currentTextLength}, Last: ${lastTextLength}`);
      
      // 检查文本是否在增长（AI正在输出）
      if (currentTextLength > lastTextLength && currentTextLength > 5) {
        if (!hasStarted) {
          hasStarted = true;
          console.log("ArtBreeze: AI output detected, showing artwork!");
          this.onConversationStart();
        }
        
        // 文本还在增长，重置计时器
        lastTextLength = currentTextLength;
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
          console.log("ArtBreeze: No text growth detected, checking generation indicator");
          const isGenerating = document.querySelector(config.generatingIndicator);
          if (!isGenerating) {
            console.log("ArtBreeze: Generation complete, hiding artwork after delay");
            this.onConversationEnd(subObserver);
          }
        }, timeout);
      } else if (currentTextLength === lastTextLength && hasStarted) {
        // 文本不再增长，检查生成指示器
        const isGenerating = document.querySelector(config.generatingIndicator);
        console.log(`ArtBreeze: Text stopped growing, generation indicator: ${!!isGenerating}`);
        if (!isGenerating) {
          console.log("ArtBreeze: Generation complete, hiding artwork after delay");
          this.onConversationEnd(subObserver);
        }
      }
    };

    const subObserver = new MutationObserver(() => {
      checkForTextGrowth();
    });

    subObserver.observe(targetNode, { childList: true, subtree: true, characterData: true });
    this.activeSubObservers.add(subObserver);
    
    // 初始检查
    setTimeout(() => checkForTextGrowth(), 500);
    
    // 备用超时，如果30秒后还没有检测到输出
    setTimeout(() => {
      if (!hasStarted) {
        console.log("ArtBreeze: Fallback timeout, no output detected");
        this.onConversationEnd(subObserver);
      }
    }, 30000);
  }

  onConversationStart() {
    if (this.conversationState === 'generating' || !this.settings.enabled) return;
    this.conversationState = 'generating';
    this.showArtwork();
  }

  onConversationEnd(subObserver) {
    if (subObserver) {
      subObserver.disconnect();
      this.activeSubObservers.delete(subObserver);
    }
    if (this.conversationState === 'generating') {
      this.conversationState = 'idle';
      console.log("ArtBreeze: Hiding artwork");
      this.hideArtwork();
    }
  }

  showArtwork(forceNew = false) {
    console.log(`ArtBreeze: showArtwork called, enabled: ${this.settings.enabled}, forceNew: ${forceNew}`);
    if (!this.settings.enabled) {
      console.log('ArtBreeze: Plugin disabled, not showing artwork');
      return;
    }
    
    // 预选择艺术作品
    if (forceNew || !this.currentArtwork) {
      console.log('ArtBreeze: Selecting new artwork');
      this.selectRandomArtwork();
    }
    
    if (!this.currentArtwork) {
      console.log('ArtBreeze: No artwork selected, aborting');
      return;
    }
    
    console.log(`ArtBreeze: Showing artwork: ${this.currentArtwork.title}`);
    
    // 使用全局缓存池加载图片
    this.getImage(this.currentArtwork.image).then((cachedImg) => {
      console.log('ArtBreeze: Image loaded, updating UI');
      // 图片加载完成，更新UI内容
      this.ui.image.src = cachedImg.src;
      this.ui.title.innerHTML = this.currentArtwork.link ? 
        `<a href="${this.currentArtwork.link}" target="_blank">${this.currentArtwork.title}</a>` : 
        this.currentArtwork.title;
      this.ui.artist.textContent = this.currentArtwork.artist;
      this.updateArtworkInfoVisibility();
      
      // 确保图片和文本都已设置，然后显示popup
      this.ui.loader.style.opacity = '0';
      this.ui.image.style.opacity = '1';
      
      // 一次完整显示popup
      this.isShowingArtwork = true;
      this.hideCircularIcon();
      this.ui.container.classList.add('artbreeze-show');
      console.log('ArtBreeze: Artwork display activated');
      document.addEventListener('click', this.handleOutsideClick.bind(this), { once: true });
    }).catch((error) => {
      console.warn('ArtBreeze: Failed to load artwork image:', error);
    });
  }

  hideArtwork() {
    console.log('ArtBreeze: hideArtwork called');
    this.isShowingArtwork = false;
    this.ui.container.classList.remove('artbreeze-show');
    if (this.settings.enabled) {
      console.log('ArtBreeze: Showing circular icon after hiding artwork');
      this.showCircularIcon();
    }
  }

  handleOutsideClick(event) {
    if (this.ui.container.contains(event.target) || this.ui.icon.contains(event.target)) {
      setTimeout(() => document.addEventListener('click', this.handleOutsideClick.bind(this), { once: true }), 0);
      return;
    }
    this.hideArtwork();
  }

  showCircularIcon() { 
    if (this.ui.icon) {
      this.ui.icon.style.display = 'flex';
      console.log('ArtBreeze: Circular icon shown');
    }
  }
  hideCircularIcon() { 
    if (this.ui.icon) {
      this.ui.icon.style.display = 'none'; 
      console.log('ArtBreeze: Circular icon hidden');
    }
  }

  async loadArtworksFromAPI() {
    try {
      const res = await fetch('https://www.gstatic.com/culturalinstitute/tabext/imax_2_2.json');
      const data = await res.json();
      this.artworks = this.shuffleArray(data.filter(item => item.image && item.title).map(item => ({
        title: item.title, 
        artist: item.creator || 'Unknown', 
        image: item.image, 
        link: this.composeLink(item.link || '')
      })));
      console.log(`ArtBreeze: Loaded ${this.artworks.length} artworks`);
      
      // 如果缓存中图片不足10张，开始预加载
      if (this.cachedImages.size < 10) {
        this.startSmartPreload();
      }
    } catch (e) {
      console.warn('ArtBreeze: Failed to load artworks from API, using fallback');
      this.artworks = this.getFallbackArtworks();
    }
  }
  
  // 智能预加载策略 - 只在后台逐步加载
  startSmartPreload() {
    console.log('ArtBreeze: Starting smart preload for cache');
    
    // 获取未缓存的图片URL
    const uncachedArtworks = this.artworks.filter(artwork => 
      !this.preloadedImageUrls.has(artwork.image)
    );
    
    if (uncachedArtworks.length === 0) {
      console.log('ArtBreeze: All images already cached');
      return;
    }
    
    // 每次只预加载一张图片，间隔更长时间
    let loadIndex = 0;
    const loadNext = () => {
      if (loadIndex >= uncachedArtworks.length || loadIndex >= 10) {
        console.log(`ArtBreeze: Smart preload completed, loaded ${loadIndex} images`);
        return;
      }
      
      const artwork = uncachedArtworks[loadIndex];
      this.preloadImageWithBase64(artwork.image, artwork.title)
        .then(() => {
          loadIndex++;
          // 成功后等待更长时间再加载下一张
          setTimeout(loadNext, 2000);
        })
        .catch(() => {
          loadIndex++;
          // 失败后也继续加载下一张
          setTimeout(loadNext, 1000);
        });
    };
    
    // 开始预加载
    loadNext();
  }
  
  // 使用Canvas将图片转换为Base64并缓存
  async preloadImageWithBase64(imageUrl, title) {
    if (this.preloadedImageUrls.has(imageUrl)) {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          // 创建canvas将图片转换为base64
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // 设置适当的尺寸以减少存储空间
          const maxSize = 400;
          const ratio = Math.min(maxSize / img.width, maxSize / img.height);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // 转换为base64
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          
          // 创建新的image对象用于缓存
          const cachedImg = new Image();
          cachedImg.src = base64;
          
          this.cachedImages.set(imageUrl, cachedImg);
          this.preloadedImageUrls.add(imageUrl);
          
          console.log(`ArtBreeze: Cached image: ${title}`);
          
          // 每缓存5张图片保存一次
          if (this.cachedImages.size % 5 === 0) {
            this.saveGlobalCache();
          }
          
          resolve();
        } catch (error) {
          console.warn(`ArtBreeze: Failed to convert image to base64: ${title}`, error);
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        console.warn(`ArtBreeze: Failed to load image: ${title}`, error);
        reject(error);
      };
      
      img.src = imageUrl;
    });
  }
  
  // 获取缓存的图片或加载新图片
  async getImage(imageUrl) {
    // 检查内存缓存
    if (this.cachedImages.has(imageUrl)) {
      console.log('ArtBreeze: Using cached image');
      this.cacheStats.hits++;
      return this.cachedImages.get(imageUrl);
    }
    
    console.log('ArtBreeze: Loading new image on demand');
    this.cacheStats.misses++;
    
    try {
      // 按需加载并缓存
      await this.preloadImageWithBase64(imageUrl, 'On-demand');
      return this.cachedImages.get(imageUrl);
    } catch (error) {
      this.cacheStats.failures++;
      // 如果转换失败，直接返回原图片
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageUrl;
      });
    }
  }

  // 参考artag实现的链接构建函数，修正斜杠丢失问题
  composeLink(link) {
    if (!link) return '';
    if (link.startsWith('http')) return link;
    // 保证无论link是否以/开头，拼接后都能正确生成带斜杠的URL
    // 如果link以/开头，则直接拼接；否则补上/
    return `https://artsandculture.google.com${link.startsWith('/') ? '' : '/'}${link}`;
  }

  selectRandomArtwork() {
    if (this.artworks.length === 0) return;
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * this.artworks.length);
    } while (this.artworks.length > 1 && newIndex === this.lastArtworkIndex);
    this.lastArtworkIndex = newIndex;
    this.currentArtwork = this.artworks[newIndex];
    this.updateArtworkDisplay();
  }

  updateArtworkDisplay() {
    if (!this.currentArtwork) return;
    this.ui.loader.style.opacity = '1';
    this.ui.image.style.opacity = '0';
    this.ui.image.src = "";

    const preloader = new Image();
    preloader.src = this.currentArtwork.image;

    preloader.onload = () => {
      this.ui.image.src = this.currentArtwork.image;
      this.ui.title.innerHTML = this.currentArtwork.link ? `<a href="${this.currentArtwork.link}" target="_blank">${this.currentArtwork.title}</a>` : this.currentArtwork.title;
      this.ui.artist.textContent = this.currentArtwork.artist;
      this.updateArtworkInfoVisibility();
      this.ui.loader.style.opacity = '0';
      this.ui.image.style.opacity = '1';
    };
    preloader.onerror = () => this.hideArtwork();
  }
  
  updateArtworkInfoVisibility() {
    if (this.ui.info) this.ui.info.style.display = this.settings.showArtworkInfo ? 'block' : 'none';
  }

  shuffleArray = (arr) => arr.sort(() => 0.5 - Math.random());
  getFallbackArtworks = () => [{ 
    title: "The Starry Night", 
    artist: "Vincent van Gogh", 
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1024px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg", 
    link: "https://artsandculture.google.com/asset/the-starry-night/bgEuwDxel93-Pg" 
  }];
}

new ArtBreeze();