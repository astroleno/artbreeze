(function (root, factory) { const api = factory(); if (typeof module === 'object' && module.exports) module.exports = api; else root.GalleryReading = api; })(globalThis, function () {
  'use strict';
  const empty = () => ({ version: 2, current: null, recent: [], favorites: [], positions: {} });
  const text = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';
  function item(v) {
    if (!v || typeof v !== 'object') return null;
    const out = Object.fromEntries(['id', 'type', 'title', 'artist', 'source', 'content', 'image', 'url', 'license', 'notice'].map(k => [k, text(v[k], k === 'content' ? 20000 : k === 'image' || k === 'url' ? 2048 : 400)]));
    if (!out.id || !out.title) return null;
    for (const k of ['url', 'image']) { try { if (out[k] && !['https:', 'http:'].includes(new URL(out[k]).protocol)) out[k] = ''; } catch { out[k] = ''; } }
    return out;
  }
  function normalize(value = {}) {
    const result = empty();
    for (const key of ['recent', 'favorites']) result[key] = [...new Map((Array.isArray(value[key]) ? value[key] : []).map(item).filter(Boolean).map(v => [v.id, v])).values()].slice(0, key === 'favorites' ? 100 : 50);
    if (value.current?.item) result.current = { item: item(value.current.item), sceneID: text(value.current.sceneID, 30), locked: value.current.locked === true };
    if (!result.current?.item) result.current = null;
    const known = new Set([...result.recent, ...result.favorites, result.current?.item].filter(Boolean).map(v => v.id));
    for (const id of known) if (Number.isFinite(value.positions?.[id])) result.positions[id] = Math.max(0, Math.min(1000000, value.positions[id]));
    return result;
  }
  function reduce(value, command) {
    const state = normalize(value);
    if (command.operation === 'clear') return empty();
    if (command.operation === 'record') {
      const content = item(command.item); if (!content) throw new Error('Invalid content');
      state.current = { item: content, sceneID: text(command.sceneID, 30), locked: command.locked === true };
      state.recent = [content, ...state.recent.filter(v => v.id !== content.id)].slice(0, 50);
    } else if (command.operation === 'favorite') {
      const content = item(command.item); if (!content) throw new Error('Invalid content');
      state.favorites = state.favorites.some(v => v.id === content.id) ? state.favorites.filter(v => v.id !== content.id) : [content, ...state.favorites].slice(0, 100);
    } else if (command.operation === 'progress') {
      if (state.recent.some(v => v.id === command.id) && Number.isFinite(command.offset)) state.positions[command.id] = Math.max(0, Math.min(1000000, command.offset));
    }
    return normalize(state);
  }
  return { empty, item, normalize, reduce };
});
