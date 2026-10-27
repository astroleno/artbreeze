import fs from 'node:fs/promises';
import path from 'node:path';
import { Chrome } from './chrome-client.mjs';
const [profile, artRoot, wikiRoot, output] = process.argv.slice(2);
await fs.mkdir(output, { recursive: true });
const chrome = await Chrome.connect(profile), checks = [], errors = [], contexts = new Map();
const check = (value, label, detail) => { checks.push({ pass: !!value, label, detail }); console.log((value ? 'PASS ' : 'FAIL ') + label); if (!value) throw new Error(label); };
const delay = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, label) { for (let i = 0; i < 100; i++) { if (await fn()) return; await delay(100); } throw new Error('Timed out: ' + label); }
chrome.listeners.push(e => {
  if (e.method === 'Runtime.exceptionThrown') errors.push(e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text);
  if (e.method === 'Runtime.executionContextCreated') { const entries = contexts.get(e.sessionId) || []; entries.push(e.params.context); contexts.set(e.sessionId, entries); }
});
const products = [];
try {
  for (const [root, kind] of [[artRoot, 'art'], [wikiRoot, 'reading']]) {
    const { id } = await chrome.call('Extensions.loadUnpacked', { path: path.resolve(root) });
    const p = await chrome.page('chrome-extension://' + id + '/options.html');
    await chrome.call('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false }, p.session);
    await until(() => chrome.eval('!!document.querySelector("#panelWidth")', p.session), 'settings mount');
    await chrome.eval('chrome.runtime.sendMessage({action:"reading",operation:"clear"})', p.session);
    const value = await chrome.eval('chrome.runtime.sendMessage({action:"reading",operation:"load"})', p.session);
    check(value.ok && value.value.version === 2, kind + ': real runtime messages and local storage');
    check(await chrome.eval('!!document.querySelector("#artworkScale")', p.session) === (kind === 'art'), kind + ': product-specific controls');
    check(await chrome.eval('document.querySelectorAll("#sceneSelection option").length', p.session) === (kind === 'art' ? 25 : 0), kind + ': 24 scenes or fixed reading background');
    await chrome.eval('chrome.storage.sync.set({autoHideEnabled:false,galleryEnabled:true,contentTypes:["gathas"],appearance:"light"})', p.session);
    products.push({ kind, id, options: p });
  }
  const host = await chrome.page();
  chrome.listeners.push(e => {
    if (e.sessionId === host.session && e.method === 'Fetch.requestPaused') {
      chrome.call('Fetch.fulfillRequest', {
        requestId: e.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html' }],
        body: Buffer.from('<!doctype html><meta charset="utf-8"><title>Chrome 扩展集成验证</title><style>body{font:16px system-ui;background:#ecece8;padding:40px;color:#555}textarea{display:block;width:240px;height:80px;margin-top:24px}</style><h1>本地受控发送页面</h1><p>真实 Chrome 扩展接口；页面响应仅用于验证，不发送 AI 消息。</p><form onsubmit="event.preventDefault()"><textarea id="prompt-textarea" aria-label="空的测试输入框"></textarea><button type="submit" data-testid="send-button">测试发送</button></form>').toString('base64')
      }, host.session).catch(e => errors.push(e.message));
    }
  });
  await chrome.call('Fetch.enable', { patterns: [{ urlPattern: 'https://chatgpt.com/__gallery_validation__*', resourceType: 'Document', requestStage: 'Request' }] }, host.session);
  await chrome.call('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false }, host.session);
  await chrome.call('Page.navigate', { url: 'https://chatgpt.com/__gallery_validation__' }, host.session);
  await chrome.call('Emulation.setFocusEmulationEnabled', { enabled: true }, host.session);
  await until(async () => (contexts.get(host.session) || []).filter(c => c.origin.startsWith('chrome-extension://')).length >= 2, 'content script isolated worlds');
  for (const product of products) {
    product.context = contexts.get(host.session).find(c => c.origin === 'chrome-extension://' + product.id).id;
    product.eval = expr => chrome.eval(expr, host.session, product.context);
    const name = product.kind === 'art' ? 'artBreeze' : 'waitWiki';
    product.app = name;
    await product.eval(name + '.ready');
    check(await product.eval('!!' + name + '.session'), product.kind + ': production content script initialized');
  }
  for (const product of products) {
    const { kind, app, eval: run } = product;
    const other = products.find(p => p !== product);
    await other.eval('chrome.storage.sync.set({enabled:false})');
    await run(app + '.session.begin()');
    check(await run(app + '.session.visible'), kind + ': new waiting cycle opens content');
    check(await run('!' + app + '.ui.container.hidden'), kind + ': actual DOM visible');
    check(await run(app + '.current?.type === ' + JSON.stringify(kind === 'art' ? 'art' : 'gathas')), kind + ': real provider content');
    if (kind === 'art') {
      check(await run('Math.max(' + app + '.ui.image.naturalWidth,'+app+'.ui.image.naturalHeight) > 400'), 'art: display image is not the old 400px thumbnail');
      check(await run('(()=>{const a=' + app + '.ui.image.getBoundingClientRect(),r=' + app + '.ui.container.getBoundingClientRect();return Math.abs(a.left+a.width/2-r.left-r.width/2)<1.1})()'), 'art: independent horizontal center');
      check(await run('getComputedStyle(' + app + '.ui.image).filter==="none"'), 'art: original has no night filter');
    }
    await run('document.querySelector("#prompt-textarea").focus();'+app+'.session.close(false);'+app+'.ui.icon.click()');
    await until(()=>run(app+'.session.visible'),kind+': entry click opens');
    check(await run('document.activeElement===document.querySelector("#prompt-textarea")'),kind+': opening does not steal composer focus');
    await run(app+'.ui.favorite.focus();'+app+'.ui.favorite.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
    check(await run('!'+app+'.session.visible&&document.activeElement==='+app+'.ui.icon'),kind+': Escape collapses and restores entry focus');
    await run('document.querySelector("#prompt-textarea").focus();'+app+'.session.lastStart=-Infinity');
    const cycle=await run(app+'.session.cycle');
    await run('for(const flags of [{isComposing:true},{repeat:true},{shiftKey:true}])document.querySelector("#prompt-textarea").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true,...flags}))');
    check(await run(app+'.session.cycle==='+cycle),kind+': IME, repeated and newline Enter are ignored');
    check(await run('(()=>{const e=new KeyboardEvent("keydown",{key:"Enter",bubbles:true,cancelable:true});document.querySelector("#prompt-textarea").dispatchEvent(e);document.querySelector("button[data-testid=send-button]").click();return !e.defaultPrevented})()'),kind+': original Enter handling remains intact');
    await until(()=>run(app+'.session.visible&&'+app+'.ui.frame.style.visibility!=="hidden"'),kind+': merged trigger loads');
    check(await run(app+'.session.cycle==='+Number(cycle+1)),kind+': Enter, button and form notification merge into one cycle');
    const before = await run('({id:' + app + '.current.id,scene:' + app + '.sceneID})');
    const wasFavorite = await run(app + '.state.favorites.some(x=>x.id===' + app + '.current.id)');
    await run(app + '.ui.favorite.click()');
    await until(() => run(app + '.state.favorites.some(x=>x.id===' + app + '.current.id) === ' + JSON.stringify(!wasFavorite)), 'favorite save');
    check(true, kind + ': favorite persisted through native runtime');
    await run('chrome.storage.sync.set({appearance:"dark"})');
    await delay(100);
    check(await run(app + '.current.id===' + JSON.stringify(before.id) + '&&' + app + '.sceneID===' + JSON.stringify(before.scene)), kind + ': theme does not change content or scene');
    await chrome.screenshot(host.session, output + '/' + kind + '-dark.png');
    await run(app + '.session.close();' + app + '.open()');
    check(await run(app + '.current.id===' + JSON.stringify(before.id) + '&&' + app + '.sceneID===' + JSON.stringify(before.scene)), kind + ': reopening preserves content and scene');
    await run(app + '.session.lastStart=-Infinity;' + app + '.session.locked=true;' + app + '.session.begin()');
    check(await run(app + '.current.id===' + JSON.stringify(before.id)), kind + ': locked content survives a new wait');
    await run(app + '.session.locked=false;chrome.storage.sync.set({appearance:"light"})');
    if (kind === 'art') {
      for (const scene of (await run('GalleryExperience.scenes.map(s=>s.id)'))) {
        await run('chrome.storage.sync.set({sceneSelection:' + JSON.stringify(scene) + '})');
        await until(() => run(app + '.ui.container.dataset.galleryScene===' + JSON.stringify(scene) + '&&' + app + '.ui.container.dataset.galleryState==="ready"'), scene);
      }
      check(true, 'art: all 24 packaged backgrounds decode and are reachable');
      check(await run('(()=>{const c=document.createElement("canvas"),x=c.getContext("2d");c.width=c.height=1;x.drawImage('+app+'.gallery.backdrop,0,0,1,1);return x.getImageData(0,0,1,1).data[3]===255})()'), 'art: real backdrop pixels are available for caption contrast');
      await run('chrome.storage.sync.set({sceneSelection:"auto",randomContentOnNewWait:false})'); await delay(100);
      const old = await run(app + '.sceneID'); await run(app + '.session.lastStart=-Infinity;' + app + '.session.begin()');
      check(await run(app + '.sceneID!==' + JSON.stringify(old)), 'art: next cycle changes scene with random content disabled');
    } else {
      check(await run(app + '.sceneID==="bg-027"&&GalleryExperience.scenes.length===1'), 'reading: one fixed reading scene');
      check(await run('getComputedStyle('+app+'.ui.frame).backgroundColor==="rgba(0, 0, 0, 0)"&&getComputedStyle('+app+'.ui.frame).boxShadow==="none"'), 'reading: text sits directly on the gallery without a white card');
      await run(app + '.current={...'+ app +'.current,content:("滚动恢复验证\\n\\n").repeat(100),id:"scroll-test"};' + app + '.session.close(false);' + app + '.open()');
      await delay(100);
      await run(app + '.ui.frame.scrollTop=180'); await delay(400);
      await run(app + '.session.close();' + app + '.open()'); await delay(150);
      check(await run('Math.abs(' + app + '.ui.frame.scrollTop-180)<2'), 'reading: scroll position restores after reopening');
      await run(app + '.current=null;' + app + '.session.close(false);' + app + '.open()');
    }
    await run('document.querySelector("#prompt-textarea").focus()');
    const rect=await run('(()=>{const r='+app+'.ui.container.getBoundingClientRect();return {x:r.x+20,y:r.y+60}})()');
    await chrome.call('Input.dispatchMouseEvent',{type:'mouseMoved',...rect},host.session);
    await run('chrome.storage.sync.set({autoHideEnabled:true,autoHideDelay:1,settingsVersion:2})');
    await delay(1200);
    check(await run(app + '.session.visible'), kind + ': active reading pauses auto-hide');
    await chrome.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:20,y:20},host.session);
    await run('document.querySelector("#prompt-textarea").focus()');
    await delay(1200);
    check(await run('!' + app + '.session.visible'), kind + ': leaving starts the configured auto-hide');
    await run('chrome.storage.sync.set({autoHideEnabled:false,appearance:"light"})'); await run(app + '.open()');
    await delay(250);
    await chrome.screenshot(host.session, output + '/' + kind + '-light.png');
    await chrome.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 700, deviceScaleFactor: 1, mobile: false }, host.session);
    await delay(150);
    check(await run(app + '.ui.container.getBoundingClientRect().right<=innerWidth&&'+app+'.ui.container.getBoundingClientRect().left>=0'), kind + ': small viewport fits');
    await chrome.screenshot(host.session, output + '/' + kind + '-small.png');
    await chrome.call('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false }, host.session);
    const tab=await chrome.eval('(async()=>Object.keys(await chrome.storage.session.get(null)).find(k=>k.startsWith("reading_tab_"))?.slice(12))()',product.options.session);
    await chrome.eval('chrome.tabs.setZoom('+Number(tab)+',2)',product.options.session);await delay(200);
    check(await run(app+'.ui.container.getBoundingClientRect().right<=innerWidth&&'+app+'.ui.container.getBoundingClientRect().left>=0'),kind+': native 200% tab zoom fits');
    await chrome.screenshot(host.session,output+'/'+kind+'-zoom200.png');
    await chrome.eval('chrome.tabs.setZoom('+Number(tab)+',1)',product.options.session);
    await chrome.call('Emulation.setDeviceMetricsOverride', { width: 320, height: 300, deviceScaleFactor: 1, mobile: false }, host.session);await delay(100);
    check(await run(app+'.ui.container.getBoundingClientRect().bottom<=innerHeight&&'+app+'.ui.container.getBoundingClientRect().left>=0'),kind+': narrow short viewport fits');
    await chrome.call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},host.session);
    check(await run('getComputedStyle('+app+'.ui.container).animationName==="none"'),kind+': reduced motion disables animation');
    await run(app+'.gallery.backdrop.src=chrome.runtime.getURL("gallery/images/missing.webp")');
    await until(()=>run(app+'.ui.container.dataset.galleryState==="fallback"'),kind+': failed background fallback');
    check(await run('getComputedStyle('+app+'.ui.container).backgroundColor!=="rgba(0, 0, 0, 0)"'),kind+': failed backdrop retains a solid readable surface');
    await run(app+'.gallery.loadedScene=null;'+app+'.gallery.updateContent('+app+'.current,'+app+'.palette,'+app+'.sceneID)');
    await chrome.call('Emulation.setEmulatedMedia',{features:[]},host.session);
    await chrome.call('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false }, host.session);
    await run('chrome.storage.sync.set({enabled:false})');await delay(100);
    check(await run('!'+app+'.session.visible&&'+app+'.ui.icon.hidden'),kind+': disabling hides both panel and entry');
    await run('chrome.storage.sync.set({enabled:true})');await delay(100);
    await run(app + '.session.close(false)');
    await chrome.screenshot(product.options.session, output + '/' + kind + '-settings.png');
    await other.eval('chrome.storage.sync.set({enabled:true})');
  }
  check(errors.length === 0, 'no uncaught errors', errors);
  await fs.writeFile(output + '/chrome-checks.json', JSON.stringify({ browser: await chrome.call('Browser.getVersion'), mode: 'Native MV3 extensions on a controlled HTTPS-origin host; no AI message was sent.', products: products.map(p => ({ kind: p.kind, id: p.id })), checks, errors }, null, 2));
} catch (error) {
  await fs.writeFile(output + '/chrome-checks.json', JSON.stringify({ checks, errors, failure: error.stack }, null, 2));
  throw error;
} finally { chrome.close(); }
