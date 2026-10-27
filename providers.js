/* Fixed public-content operations; never accepts an arbitrary fetch URL. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./gallery/experience.js') : root.GalleryExperience);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ContentProviders = api;
})(globalThis, function (G) {
  'use strict';
  const SITES = ['chatgpt.com', 'chat.openai.com', 'claude.ai', 'bard.google.com', 'gemini.google.com', 'www.bing.com', 'copilot.microsoft.com', 'copilot.com', 'chat.deepseek.com', 'grok.x.ai', 'grok.com', 'x.ai', 'yuanbao.tencent.com', 'kimi.ai', 'www.kimi.ai', 'kimi.moonshot.cn', 'www.kimi.com', 'www.doubao.com', 'doubao.com'];
  const matches = [...SITES.map(h => 'https://' + h + '/*'), 'https://x.com/i/grok*', 'https://x.com/grok*'];
  function supported(url) { try { const u = new URL(url); return u.protocol === 'https:' && (SITES.includes(u.hostname) || u.hostname === 'x.com' && /^\/(?:i\/)?grok(?:\/|$)/.test(u.pathname)); } catch { return false; } }
  function allowedSender(sender, id) {
    if (sender.id !== id) return false;
    try {
      const u = new URL(sender.url);
      if (u.protocol === 'chrome-extension:') return u.hostname === id && ['/popup.html', '/options.html'].includes(u.pathname);
      return !!sender.tab && supported(sender.url);
    } catch { return false; }
  }
  async function get(url, format = 'json', fetcher = fetch, limit = 2000000) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetcher(url, { credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', signal: controller.signal, cache: 'no-cache',
        ...(new URL(url).hostname.endsWith('.wikipedia.org') ? { headers: { 'Api-User-Agent': 'WaitWiki/1.4.0 (https://github.com/astroleno/WaitWiki)' } } : {}) });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      if (Number(response.headers?.get('content-length')) > limit) throw new Error('Content too large');
      let bytes;
      if (response.body?.getReader) {
        const reader = response.body.getReader(), chunks = []; let length = 0;
        for (;;) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength; if (length > limit) { await reader.cancel(); throw new Error('Content too large'); } chunks.push(value); }
        bytes = new Uint8Array(length); let at = 0; for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.byteLength; }
      } else { bytes = new Uint8Array(await response.arrayBuffer()); if (bytes.length > limit) throw new Error('Content too large'); }
      if (format === 'image') {
        const type = (response.headers?.get('content-type') || '').split(';')[0];
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new Error('Unsupported image');
        let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        return 'data:' + type + ';base64,' + btoa(binary);
      }
      const text = new TextDecoder().decode(bytes);
      return format === 'text' ? text : JSON.parse(text);
    } finally { clearTimeout(timeout); }
  }
  function csv(text) {
    const rows = []; let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = !quoted;
      else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
      else if (c === '\n' && !quoted) { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
    const headers = rows.shift() || [];
    return rows.filter(r => r.length >= 4).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] || '']))).filter(r => r.content?.length >= 5);
  }
  function card(v) {
    const c = { ...v, id: G.hash((v.type || '') + ':' + (v.image || (v.title || '') + ':' + (v.content || '') + (v.url ? ':' + v.url : ''))) };
    return c;
  }
  const FALLBACK_ART = card({
    type: 'art', title: 'The Starry Night', artist: 'Vincent van Gogh', source: 'Wikimedia Commons / Google Art Project',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1024px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
    url: 'https://artsandculture.google.com/asset/the-starry-night/bgEuwDxel93-Pg',
    notice: '内容列表暂不可用，展示备用作品。', license: '请在来源页面核对作品及数字图片的权利说明。'
  });
  const ART_ORIGINS = ['lh3.ggpht.com', 'lh3.googleusercontent.com', 'upload.wikimedia.org'];
  class Providers {
    constructor({ fetcher = fetch, storage, resourceURL, kind = 'art' } = {}) { Object.assign(this, { fetcher, storage, resourceURL, kind }); this.failed = new Map(); }
    async catalogue() {
      if (this.artworks) return this.artworks;
      const saved = await this.storage.get('art_catalogue_v2');
      if (saved.art_catalogue_v2?.time > Date.now() - 86400000 && Array.isArray(saved.art_catalogue_v2.items)) return this.artworks = saved.art_catalogue_v2.items;
      try {
        const rows = await get('https://www.gstatic.com/culturalinstitute/tabext/imax_2_2.json', 'json', this.fetcher);
        if (!Array.isArray(rows)) throw new Error('Invalid catalogue');
        this.artworks = rows.filter(r => {
          try { const u = new URL(r.image); return u.protocol === 'https:' && ART_ORIGINS.includes(u.hostname) && r.title; } catch { return false; }
        }).slice(0, 1000).map(r => card({ type: 'art', title: String(r.title).slice(0, 300), artist: String(r.creator || 'Unknown').slice(0, 300), source: String(r.attribution || 'Google Arts & Culture').slice(0, 400), image: r.image,
          url: r.link?.startsWith('https://artsandculture.google.com/') ? r.link : 'https://artsandculture.google.com/' + String(r.link || '').replace(/^\//, ''),
          license: '作品及数字图片的版权与使用条件见来源页面。' }));
        if (!this.artworks.length) throw new Error('Empty catalogue');
        await this.storage.set({ art_catalogue_v2: { time: Date.now(), items: this.artworks } }).catch(() => {});
      } catch { this.artworks = saved.art_catalogue_v2?.items?.length ? saved.art_catalogue_v2.items : [FALLBACK_ART]; }
      return this.artworks;
    }
    async image(id, pixels = 1200) {
      const rows = await this.catalogue(), art = rows.find(r => r.id === id) || (id === FALLBACK_ART.id ? FALLBACK_ART : null);
      if (!art) throw new Error('Unknown artwork');
      const saved = await this.storage.get(['art_images_v2', 'artbreeze_global_cache_v1']), cache = Array.isArray(saved.art_images_v2) ? saved.art_images_v2 : [];
      const size = Math.min(1600, Math.max(800, Math.ceil((Number(pixels) || 1200) / 200) * 200));
      const cacheID = id + ':' + size;
      const hit = cache.find(r => r.id === cacheID); if (hit) return hit.data;
      const u = new URL(art.image); if (u.protocol !== 'https:' || !ART_ORIGINS.includes(u.hostname)) throw new Error('Image origin denied');
      if (u.hostname === 'lh3.ggpht.com' || u.hostname === 'lh3.googleusercontent.com') u.pathname = u.pathname.replace(/=(?:s|w)\d+.*$/, '') + '=s' + size;
      let data;
      try { data = await get(u.href, 'image', this.fetcher, 8000000); }
      catch (error) {
        const fallback = cache.find(r => r.id.startsWith(id + ':'))?.data || saved.artbreeze_global_cache_v1?.[art.image];
        if (typeof fallback === 'string' && fallback.length < 3500000 && /^data:image\/(?:jpeg|png|webp);base64,/.test(fallback)) return fallback;
        throw error;
      }
      if (data.length < 3500000) {
        const next = [{ id: cacheID, data }, ...cache.filter(r => r.id !== cacheID)]; let bytes = 0;
        await this.storage.set({ art_images_v2: next.filter(r => { bytes += r.data.length; return bytes < 6000000; }).slice(0, 8) }).catch(() => {});
      }
      return data;
    }
    async local(type) {
      if (!this.localData) this.localData = await get(this.resourceURL('local-content.json'), 'json', this.fetcher);
      if (type === 'datafacts' || type === 'gathas') {
        this.csvData ||= {};
        if (!this.csvData[type]) this.csvData[type] = csv(await get(this.resourceURL(type + '.csv'), 'text', this.fetcher)).map(r => ({ ...r, type }));
        if (this.csvData[type].length) return this.csvData[type];
      }
      return this.localData[type] || [];
    }
    localCard(row, type) {
      return card(type === 'datafacts' && row.source?.includes('Gapminder') ? { ...row, type, source: 'Based on free material from GAPMINDER.ORG, CC-BY', url: 'https://www.gapminder.org/free-material/', license: 'CC BY 4.0；中文概述与整理并非原始逐条数据，具体数据年份见正文。' } : { ...row, type });
    }
    async alternate(item, type, exclude) {
      if (item.id !== exclude) return item;
      const choices = (await this.local(type)).map(row => this.localCard(row, type)).filter(row => row.id !== exclude);
      if (!choices.length) return item;
      const chosen = this.pick(choices);
      return ['datafacts', 'gathas'].includes(type) ? chosen : { ...chosen, notice: item.notice || '当前为本地备用内容。' };
    }
    async knowledge(type, language = 'zh', exclude) {
      if (!G.TYPES.includes(type) || !['zh', 'en', 'ja', 'fr', 'de', 'es'].includes(language)) throw new Error('Invalid content request');
      if (['datafacts', 'gathas'].includes(type)) return this.alternate(await this.loadKnowledge(type, language), type, exclude);
      this.jobs ||= new Map(); this.recentKnowledge ||= new Map();
      const key = type === 'wikipedia' ? type + ':' + language : type, cached = this.recentKnowledge.get(key);
      if (cached?.time > Date.now() - 7000 && !cached.item.notice) return this.alternate(cached.item, type, exclude);
      if (this.jobs.has(key)) return this.alternate(await this.jobs.get(key), type, exclude);
      const job = this.loadKnowledge(type, language).then(item => { this.recentKnowledge.set(key, { time: Date.now(), item }); return item; }).finally(() => this.jobs.delete(key));
      this.jobs.set(key, job); return this.alternate(await job, type, exclude);
    }
    async loadKnowledge(type, language = 'zh') {
      if (!G.TYPES.includes(type) || !['zh', 'en', 'ja', 'fr', 'de', 'es'].includes(language)) throw new Error('Invalid content request');
      if (['datafacts', 'gathas'].includes(type)) {
        const row = this.pick(await this.local(type));
        return this.localCard(row, type);
      }
      if ((this.failed.get(type) || 0) < Date.now()) {
        try { return card(await this.remote(type, language)); } catch { this.failed.set(type, Date.now() + 60000); }
      }
      const rows = await this.local(type); const result = rows.length ? this.pick(rows) : { type, title: '暂时离线', content: '这个来源暂不可用，请稍后重试，或在设置中切换其他内容类型。', source: 'WaitWiki' };
      return card({ ...result, type, notice: '来源暂不可用，当前为本地备用内容。' });
    }
    pick(rows) { if (!rows.length) throw new Error('No local content'); return rows[Math.floor(Math.random() * rows.length)]; }
    async remote(type, language) {
      const read = url => get(url, 'json', this.fetcher);
      let d;
      if (type === 'wikipedia') { d = await read('https://' + language + '.wikipedia.org/api/rest_v1/page/random/summary'); if (!d.extract) throw new Error('Empty article'); return { type, title: d.title, content: d.extract, source: 'Wikipedia', url: d.content_urls?.desktop?.page, license: 'Wikipedia 文字遵循其页面所列许可；作者与完整许可见来源。' }; }
      if (type === 'quotes') {
        try { d = (await read('https://zenquotes.io/api/random'))[0]; if (!d?.q) throw new Error('Empty quote'); return { type, title: d.a || '名言', content: d.q, source: 'ZenQuotes', url: 'https://zenquotes.io/' }; }
        catch { d = await read('https://api.quotable.io/random'); if (!d.content) throw new Error('Empty quote'); return { type, title: d.author || '名言', content: d.content, source: 'Quotable', url: 'https://quotable.io/' }; }
      }
      if (type === 'facts') { const content = await get('https://numbersapi.com/random/trivia', 'text', this.fetcher); return { type, title: '数字趣闻', content, source: 'Numbers API', url: 'http://numbersapi.com/' }; }
      if (type === 'advice') { d = await read('https://api.adviceslip.com/advice'); if (!d.slip?.advice) throw new Error('Empty advice'); return { type, title: '生活小贴士', content: d.slip.advice, source: 'Advice Slip', url: 'https://adviceslip.com/' }; }
      if (type === 'catfacts') { d = await read('https://catfact.ninja/fact'); if (!d.fact) throw new Error('Empty fact'); return { type, title: '猫咪趣闻', content: d.fact, source: 'Cat Facts', url: 'https://catfact.ninja/' }; }
      if (type === 'trivia') { d = (await read('https://the-trivia-api.com/v2/questions?limit=1'))[0]; if (!d?.question?.text) throw new Error('Empty question'); return { type, title: d.category || '知识问答', content: d.question.text + '\n\n答案：' + d.correctAnswer, source: 'The Trivia API', url: 'https://the-trivia-api.com/' }; }
      if (type === 'cocktails') { d = (await read('https://www.thecocktaildb.com/api/json/v1/1/random.php')).drinks?.[0]; if (!d) throw new Error('Empty drink'); const ingredients = []; for (let i = 1; i <= 15; i++) if (d['strIngredient' + i]) ingredients.push((d['strMeasure' + i] || '') + ' ' + d['strIngredient' + i]); return { type, title: d.strDrink, content: '配料：' + ingredients.join('、') + '\n\n制作方法：' + (d.strInstructions || ''), source: 'TheCocktailDB', url: 'https://www.thecocktaildb.com/drink/' + encodeURIComponent(d.idDrink) }; }
      throw new Error('Unknown provider');
    }
  }
  return { SITES, matches, supported, allowedSender, get, csv, card, FALLBACK_ART, Providers };
});
