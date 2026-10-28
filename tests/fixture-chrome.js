/* Explicit developer-only substitute for Chrome APIs and public content. Never packaged. */
(function () {
  const kind = document.title.includes('WaitWiki') ? 'reading' : 'art';
  const base = new URL('../', location.href), changes = [];
  const query = new URLSearchParams(location.search);
  let backgroundMessage;
  window.importScripts = () => {}; // Dependencies are loaded before the production background.
  let sync = { enabled: true, galleryEnabled: query.get('gallery') !== 'false', appearance: query.get('appearance') || 'light', sceneSelection: query.get('scene') || (kind === 'reading' ? 'bg-027' : 'auto'), autoHideEnabled: false };
  const local = {}, session = {};
  const area = (store, name) => ({
    async get(keys) { return structuredClone(keys === null ? { ...store } : Object.fromEntries((Array.isArray(keys) ? keys : [keys]).filter(k => store[k] !== undefined).map(k => [k,store[k]]))); },
    async set(values) {
      const events = {};
      for (const [k,v] of Object.entries(values)) {
        if (JSON.stringify(store[k]) === JSON.stringify(v)) continue;
        events[k] = { oldValue: structuredClone(store[k]), newValue: structuredClone(v) }; store[k] = structuredClone(v);
        if (name === 'local' && k === 'reading_state_v2') window.fixtureBackgroundWrites++;
      }
      if (Object.keys(events).length) for (const fn of changes) fn(events,name);
    },
    async remove(keys) {
      const events = {};
      for (const k of Array.isArray(keys) ? keys : [keys]) { if (k in store) { events[k] = { oldValue: store[k] }; delete store[k]; } }
      if (Object.keys(events).length) for (const fn of changes) fn(events,name);
    },
    async clear() { await this.remove(Object.keys(store)); }
  });
  const works = ['landscape','portrait','square'].map((name,i) => ({ id:'fixture-'+i, type:'art', title: ['山间的光（测试画作）','静物（测试画作）','水面（测试画作）'][i], artist:'本地排版夹具', image:new URL('tests/fixtures/'+name+'.svg',base).href, url:'https://example.org/', source:'测试夹具' }));
  window.fixtureErrors = []; window.fixtureBackgroundWrites = 0;
  window.addEventListener('error',e=>fixtureErrors.push(e.message)); window.addEventListener('unhandledrejection',e=>fixtureErrors.push(String(e.reason)));
  window.chrome = {
    storage: { sync:area(sync,'sync'), local:area(local,'local'), session:area(session,'session'), onChanged:{ addListener:fn=>changes.push(fn) } },
    runtime:{
      id:'local-fixture',getURL:p=>new URL(p,base).href,getManifest:()=>({name:kind==='art'?'ArtBreeze':'WaitWiki',version:kind==='art'?'1.2.2':'1.4.2'}),openOptionsPage:()=>window.open(new URL('tests/options.html',base)),
      onInstalled:{addListener(){}},onMessage:{addListener:fn=>{backgroundMessage=fn;window.fixtureBackendReady=true;}},
      async sendMessage(request) {
        try {
          if(request.action==='reading') {
            if (!backgroundMessage) throw Error('Production background fixture is not loaded');
            const sender = { id:'local-fixture', url:'chrome-extension://local-fixture/options.html' };
            if (location.pathname.endsWith('/preview.html')) Object.assign(sender, {url:'https://chatgpt.com/__fixture__/',tab:{id:4242}});
            return new Promise(resolve=>backgroundMessage(request,sender,resolve));
          }
          if(request.operation==='catalogue')return {ok:true,value:works};
          if(request.operation==='image') {const text=await(await fetch(works.find(w=>w.id===request.id).image)).text();return {ok:true,value:'data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(text)))};}
          if(request.operation==='knowledge')return {ok:true,value:{id:'reading-fixture',type:'wikipedia',title:'留白与阅读（测试内容）',content:'这是用于开发检查的本地排版样本。\n\n'.repeat(25),source:'本地夹具',url:'https://example.org/'}};
          if(request.action==='openOptions')window.open(new URL('tests/options.html',base));
          return {ok:true,value:true};
        }catch(e){return {ok:false,error:e.message};}
      }
    },
    tabs:{onRemoved:{addListener(){}}}
  };
})();
