document.addEventListener('DOMContentLoaded', () => {
  const favorites = document.getElementById('favorites'), recent = document.getElementById('recent'), status = document.getElementById('library-status');
  async function send(operation, extra = {}) {
    const result = await chrome.runtime.sendMessage({ action: 'reading', operation, ...extra });
    if (!result?.ok) throw new Error(result?.error || '本地内容暂不可用');
    return result.value;
  }
  function list(host, items, isFavorite) {
    host.replaceChildren();
    if (!items.length) { const p = document.createElement('p'); p.className = 'settings-hint'; p.textContent = isFavorite ? '还没有收藏。在阅读界面点心形即可收藏。' : '开始一次阅读后，这里会保留最近内容。'; host.append(p); }
    for (const item of items) {
      const row = document.createElement('article'); row.className = 'library-row';
      const title = document.createElement('h3'); title.textContent = item.title;
      const description = document.createElement('p'); description.textContent = item.artist || item.source; description.className = 'settings-hint';
      const open = document.createElement('button'); open.textContent = '下次阅读'; open.addEventListener('click', async () => {
        try { await send('select', { id: item.id }); await chrome.storage.local.set({ reading_selection_v2: { id: item.id, revision: Date.now() } }); status.textContent = '已选择。回到 AI 网页，打开入口即可阅读。'; } catch (e) { status.textContent = e.message; }
      });
      row.append(title, description, open);
      const href = GalleryExperience.safeURL(item.url);
      if (href) { const link = document.createElement('a'); link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = '来源'; row.append(link); }
      if (isFavorite) { const remove = document.createElement('button'); remove.textContent = '取消收藏'; remove.addEventListener('click', () => send('favorite', { item }).then(load).catch(e => { status.textContent = e.message; })); row.append(remove); }
      host.append(row);
    }
  }
  async function load() { try { const value = await send('load'); list(favorites, value.favorites, true); list(recent, value.recent, false); } catch (e) { status.textContent = e.message; } }
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.reading_state_v2) load(); });
  const clear = document.getElementById('clear-data'); let confirming = false;
  clear.addEventListener('click', async () => {
    if (!confirming) { confirming = true; clear.textContent = '确认清除本扩展的本地数据'; status.textContent = '将删除收藏、最近阅读和缓存，保留外观等同步偏好。'; return; }
    try { await send('clear'); clear.textContent = '清除本地数据'; confirming = false; status.textContent = '本地数据已清除。'; await load(); } catch (e) { status.textContent = e.message; }
  });
  load();
});
