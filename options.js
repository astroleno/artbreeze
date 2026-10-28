document.addEventListener('DOMContentLoaded', () => {
  const favorites = document.getElementById('favorites'), recent = document.getElementById('recent'), status = document.getElementById('library-status');
  const art = GalleryCatalogue.product === 'artbreeze';
  let selectionID = null, libraryRevision = 0, selectionRevision = 0;
  function updateSelection(id) {
    selectionID = id;
    for (const row of document.querySelectorAll('.library-row')) {
      const selected = row.dataset.itemId === id, button = row.querySelector('.library-select');
      row.dataset.selected = String(selected); button.setAttribute('aria-pressed', String(selected));
      button.textContent = selected ? '上次选择 · 再选一次' : art ? '下次看这幅' : '下次读这条';
    }
  }
  async function send(operation, extra = {}) {
    const result = await chrome.runtime.sendMessage({ action: 'reading', operation, ...extra });
    if (!result?.ok) throw new Error(result?.error || '本地内容暂不可用');
    return result.value;
  }
  function captureFocus() {
    const active = document.activeElement, host = [favorites, recent].find(list => list.contains(active));
    const row = host && active.closest('.library-row');
    if (!row) return null;
    return { active, host, id: row.dataset.itemId, index: [...host.children].indexOf(row), action: active.dataset.libraryAction };
  }
  function restoreFocus(saved) {
    // Capture happens after the read, so an intervening user focus move is respected.
    if (!saved || saved.active.isConnected || document.activeElement !== document.body) return;
    const rows = [...saved.host.querySelectorAll('.library-row')];
    const row = rows.find(row => row.dataset.itemId === saved.id) || rows[Math.min(saved.index, rows.length - 1)];
    const control = row && ([...row.querySelectorAll('[data-library-action]')].find(control => control.dataset.libraryAction === saved.action) || row.querySelector('.library-select'));
    const target = control || saved.host.previousElementSibling;
    if (target) { if (!control) target.tabIndex = -1; target.focus({ preventScroll: true }); }
  }
  function list(host, items, isFavorite) {
    host.replaceChildren();
    if (!items.length) { const p = document.createElement('p'); p.className = 'settings-hint'; p.textContent = isFavorite ? (art ? '还没有收藏。在画廊点心形即可收藏。' : '还没有收藏。在阅读界面点心形即可收藏。') : (art ? '看过的画作会保留在这里。' : '读过的内容会保留在这里。'); host.append(p); }
    for (const item of items) {
      const row = document.createElement('article'); row.className = 'library-row'; row.dataset.itemId = item.id;
      const title = document.createElement('h3'); title.textContent = item.title;
      const description = document.createElement('p'); description.textContent = item.artist || item.source; description.className = 'settings-hint';
      const open = document.createElement('button'); open.className = 'library-select'; open.dataset.libraryAction = 'select'; open.addEventListener('click', async () => {
        try { await send('select', { id: item.id }); selectionRevision++; await chrome.storage.local.set({ reading_selection_v2: { id: item.id, revision: Date.now() } }); updateSelection(item.id); status.textContent = art ? '已选择。回到 AI 网页，打开“艺”即可看这幅画。' : '已选择。回到 AI 网页，打开“知”即可读这条内容。'; } catch (e) { status.textContent = e.message; }
      });
      row.append(title, description);
      if (!art && item.content) {
        const excerpt = document.createElement('p'); excerpt.className = 'library-excerpt';
        const text = Array.from(item.content.replace(/\s+/g, ' ').trim());
        excerpt.textContent = text.slice(0, 140).join('') + (text.length > 140 ? '…' : ''); row.append(excerpt);
      }
      row.append(open);
      const href = GalleryExperience.safeURL(item.url);
      if (href) { const link = document.createElement('a'); link.dataset.libraryAction = 'source'; link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = '来源'; row.append(link); }
      if (isFavorite) { const remove = document.createElement('button'); remove.dataset.libraryAction = 'remove'; remove.textContent = '取消收藏'; remove.addEventListener('click', () => send('favorite', { item }).then(load).catch(e => { status.textContent = e.message; })); row.append(remove); }
      host.append(row);
    }
    updateSelection(selectionID);
  }
  async function load() {
    const revision = ++libraryRevision, selectionVersion = selectionRevision;
    try {
      const [value, selection] = await Promise.all([send('load'), chrome.storage.local.get('reading_selection_v2')]);
      if (revision !== libraryRevision) return;
      if (selectionVersion === selectionRevision) selectionID = selection.reading_selection_v2?.id || null;
      const focused = captureFocus();
      list(favorites, value.favorites, true); list(recent, value.recent, false);
      restoreFocus(focused);
    } catch (e) { if (revision === libraryRevision) status.textContent = e.message; }
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.reading_state_v2) load();
    if (changes.reading_selection_v2) { selectionRevision++; updateSelection(changes.reading_selection_v2.newValue?.id || null); }
  });
  const clear = document.getElementById('clear-data'); let confirming = false;
  clear.addEventListener('click', async () => {
    if (!confirming) { confirming = true; clear.textContent = '确认清除本扩展的本地数据'; status.textContent = '将删除收藏、最近阅读和缓存，保留外观等同步偏好。'; return; }
    try { await send('clear'); clear.textContent = '清除本地数据'; confirming = false; status.textContent = '本地数据已清除。'; await load(); } catch (e) { status.textContent = e.message; }
  });
  load();
});
