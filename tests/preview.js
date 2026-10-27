(async function () {
  const reading = document.title.includes('WaitWiki');
  const app = reading ? waitWiki : artBreeze;
  window.previewApp = app;
  await app.ready;
  // Only the platform gate is substituted: Enter still goes through the shipped input listener.
  app.detectPlatform = () => 'chatgpt';
  const status = document.getElementById('preview-status');
  status.textContent = '已就绪 · 场景来自本地，支持 Enter、收起、设置与键盘操作。';
  const hide = () => reading ? app.hideCard() : app.hideArtwork();
  const show = () => reading ? app.showCard(true) : app.showArtwork(true);
  document.getElementById('trigger').addEventListener('click', () => app.showPopup());
  document.getElementById('toggle-scene').addEventListener('click', () => chrome.storage.sync.set({ galleryEnabled: !app.settings.galleryEnabled }));
  document.getElementById('toggle-night').addEventListener('click', () => chrome.storage.sync.set({ appearance: app.ui.container.dataset.galleryTheme === 'dark' ? 'light' : 'dark' }));
  document.getElementById('next-content').addEventListener('click', () => { hide(); show(); });

  document.getElementById('verify').addEventListener('click', async () => {
    const results = [];
    const check = (condition, text) => { results.push(`${condition ? 'PASS' : 'FAIL'} ${text}`); if (!condition) throw new Error(text); };
    const waitFor = async predicate => {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (predicate()) return;
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      throw new Error('UI state timed out');
    };
    const original = { ...app.settings };
    try {
      for (const scene of GalleryExperience.scenes) {
        const image = new Image(); image.src = chrome.runtime.getURL(scene.image); await image.decode();
      }
      check(true, '24 张本地 WebP 全部可解码');
      await chrome.storage.sync.set({ galleryEnabled: true, appearance: 'light' });
      hide(); show();
      await waitFor(() => reading ? app.isShowingCard : app.isShowingArtwork);
      check(true, '原有内容显示路径可用');
      for (const scene of GalleryExperience.scenes) {
        await chrome.storage.sync.set({ sceneSelection: scene.id });
        await waitFor(() => app.ui.container.dataset.galleryState === 'ready');
        check(app.ui.container.dataset.galleryScene === scene.id, `${scene.id} 可固定展示`);
      }
      const sceneBefore = app.ui.container.dataset.galleryScene;
      const srcBefore = reading ? app.ui.content.textContent : app.ui.image.src;
      await chrome.storage.sync.set({ appearance: 'dark' });
      check(app.ui.container.dataset.galleryTheme === 'dark', '夜间模式生效');
      check(app.ui.container.dataset.galleryScene === sceneBefore, '切换昼夜不换景');
      check(srcBefore === (reading ? app.ui.content.textContent : app.ui.image.src), '光线变化不修改内容');
      if (!reading) {
        const image = app.ui.image.getBoundingClientRect();
        const room = app.ui.container.getBoundingClientRect();
        check(Math.abs(image.left + image.width / 2 - room.left - room.width / 2) < 1.1, '画作水平居中');
        check(getComputedStyle(app.ui.image).filter === 'none', '原画不受夜间滤镜影响');
        check(Math.abs(image.width / image.height - app.ui.image.naturalWidth / app.ui.image.naturalHeight) < .03, '原画比例完整');
      } else {
        const paper = getComputedStyle(app.ui.frame);
        check(paper.overflowY === 'auto', '长正文使用可滚动阅读面');
      }
      app.gallery.backdrop.dispatchEvent(new Event('error'));
      check(app.ui.container.dataset.galleryState === 'fallback', '背景失败保留素色可用界面');
      app.gallery.loadedScene = null;
      app.gallery.updateContent(app.gallery.content);
      await waitFor(() => app.ui.container.dataset.galleryState === 'ready');
      app.gallery.closeButton.click();
      check(!(reading ? app.isShowingCard : app.isShowingArtwork), '收起按钮关闭内容');
      await chrome.storage.sync.set({ galleryEnabled: false });
      show();
      await waitFor(() => reading ? app.isShowingCard : app.isShowingArtwork);
      check(app.ui.container.dataset.galleryEnabled === 'false', '纯色模式可用');
      check(app.ui.container.getBoundingClientRect().width <= Math.min(442, window.innerWidth - 30), '纯色界面保留原有尺寸且不溢出');
      check(window.fixtureErrors.length === 0, `没有未处理异常（${window.fixtureErrors.length}）`);
      status.textContent = `${results.length} 项界面检查通过`;
    } catch (error) {
      results.push(`FAIL ${error.message}`);
      status.textContent = '检查失败，请查看下方记录。';
    } finally {
      hide();
      await chrome.storage.sync.set(original);
      document.getElementById('verification-results').textContent = results.join('\n');
    }
  });
})();
