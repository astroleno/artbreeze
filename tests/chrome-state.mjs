/* Native settings/library, independent tabs, worker restart and browser-restart recovery. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Chrome } from './chrome-client.mjs';
const [profile,artRoot,wikiRoot,output,mode='capture']=process.argv.slice(2),c=await Chrome.connect(profile),checks=[],contexts=new Map();
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const assert=(v,label)=>{checks.push({pass:!!v,label});console.log((v?'PASS ':'FAIL ')+label);if(!v)throw Error(label);};
async function until(fn,label){for(let i=0;i<100;i++){if(await fn())return;await delay(100);}throw Error('Timed out: '+label);}
c.listeners.push(e=>{if(e.method==='Runtime.executionContextCreated'){const a=contexts.get(e.sessionId)||[];a.push(e.params.context);contexts.set(e.sessionId,a);}});
const products=await Promise.all([['art',artRoot,'artBreeze'],['reading',wikiRoot,'waitWiki']].map(async([kind,root,app])=>({kind,root,app,id:[...createHash('sha256').update(await fs.realpath(root)).digest().subarray(0,16)].map(v=>String.fromCharCode(97+(v>>4),97+(v&15))).join('')})));
async function host(number){
 const p=await c.page();
 c.listeners.push(e=>{if(e.sessionId===p.session&&e.method==='Fetch.requestPaused')c.call('Fetch.fulfillRequest',{requestId:e.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html'}],body:Buffer.from('<!doctype html><title>Independent extension session '+number+'</title><textarea id="prompt-textarea"></textarea>').toString('base64')},p.session).catch(()=>{});});
 await c.call('Fetch.enable',{patterns:[{urlPattern:'https://chatgpt.com/__gallery_state__*',resourceType:'Document'}]},p.session);
 p.url='https://chatgpt.com/__gallery_state__'+number;await c.call('Page.navigate',{url:p.url},p.session);return p;
}
async function world(p,product){
 let context;
 await until(async()=>{for(const item of (contexts.get(p.session)||[]).filter(x=>x.origin==='chrome-extension://'+product.id).reverse())try{if(await c.eval('typeof '+product.app+'!=="undefined"&&!!'+product.app+'.session',p.session,item.id)){context=item;return true;}}catch{}return false;},product.kind+' isolated context');
 const run=expr=>c.eval(expr,p.session,context.id);await run(product.app+'.ready');return run;
}
const expectedPath=path.join(output,'restart-expected.json');
try{
 const expected=mode==='verify'?JSON.parse(await fs.readFile(expectedPath,'utf8')):{};
 for(const product of products){product.options=await c.page('chrome-extension://'+product.id+'/options.html');await until(()=>c.eval('!!document.querySelector("#panelWidth")',product.options.session),'options');}
 if(mode==='capture'){
  const first=await host(1),second=await host(2);
  for(const product of products){
   const {kind,app,options}=product,run=await world(first,product),run2=await world(second,product);
   await c.call('Target.activateTarget',{targetId:first.targetId});
   await c.eval('document.querySelector("#panelWidth").value=700;document.querySelector("#panelWidth").dispatchEvent(new Event("change",{bubbles:true}))',options.session);
   await c.eval('chrome.storage.sync.set({enabled:true,autoHideEnabled:false,contentTypes:["gathas"],galleryEnabled:true})',options.session);
   await until(()=>run(app+'.settings.panelWidth===700&&'+app+'.settings.galleryEnabled'),'live settings');
   assert(await run2(app+'.settings.panelWidth===700'),kind+': native settings controls update both tabs');
   await run(app+'.open()');
   if(!await run(app+'.state.favorites.some(x=>x.id==='+app+'.current.id)'))await run(app+'.favorite()');
   await until(()=>c.eval('document.querySelectorAll("#favorites .library-row").length>0',options.session),'favorite list');
   const chosen=await c.eval('(async()=>{const r=await chrome.runtime.sendMessage({action:"reading",operation:"load"});return r.value.favorites[0].id})()',options.session);
   await c.eval('document.querySelector("#favorites .library-row button").click()',options.session);
   await until(()=>run('!!'+app+'.pendingSelection'),'favorite selection');
   await run(app+'.session.close(false);'+app+'.open()');assert(await run(app+'.current.id==='+JSON.stringify(chosen)),kind+': next-read library choice opens the selected item');
   const favoriteCount=await c.eval('document.querySelectorAll("#favorites .library-row").length',options.session);
   await c.eval('[...document.querySelectorAll("#favorites button")].find(b=>b.textContent==="取消收藏").click()',options.session);
   await until(()=>c.eval('document.querySelectorAll("#favorites .library-row").length==='+Number(favoriteCount-1),options.session),'remove favorite');assert(true,kind+': library removes a favorite');
   await c.eval('document.querySelector("#clear-data").click()',options.session);
   assert(await c.eval('(async()=>{const r=await chrome.runtime.sendMessage({action:"reading",operation:"load"});return r.value.recent.length>0})()',options.session),kind+': first clear click does not delete data');
   await c.eval('document.querySelector("#clear-data").click()',options.session);
   await until(()=>c.eval('document.querySelector("#library-status").textContent.includes("已清除")',options.session),'clear completed');
   assert(await c.eval('(async()=>{const r=await chrome.runtime.sendMessage({action:"reading",operation:"load"}),s=await chrome.storage.sync.get(null);return r.value.favorites.length===0&&r.value.recent.length===0&&s.panelWidth===700})()',options.session),kind+': confirmed clear removes local data and preserves settings');
   await run(app+'.open()');await run(app+'.favorite()');
   const before=await run(app+'.current.id');
   await c.call('Target.activateTarget',{targetId:second.targetId});
   await run2(app+'.open()');await run2(app+'.next()');
   for(let i=0;i<3&&await run2(app+'.current.id')===before;i++)await run2(app+'.next()');
   assert(await run(app+'.current.id==='+JSON.stringify(before)),kind+': another tab cannot replace retained content');
   await c.call('Page.navigate',{url:first.url},first.session);const restored=await world(first,product);
   assert(await restored(app+'.current.id==='+JSON.stringify(before)),kind+': native tab reload restores its own snapshot');
   const current=await c.eval('chrome.runtime.sendMessage({action:"reading",operation:"load"})',options.session);
   expected[kind]={id:current.value.current.item.id,sceneID:current.value.current.sceneID,favorites:current.value.favorites.map(x=>x.id),width:700};
   await c.call('ServiceWorker.enable',{},options.session);await c.call('ServiceWorker.stopAllWorkers',{},options.session);
   const after=await c.eval('chrome.runtime.sendMessage({action:"reading",operation:"load"})',options.session);
   assert(after.ok&&after.value.current.item.id===expected[kind].id,kind+': stopped service worker wakes and restores persisted content');
  }
  await fs.writeFile(expectedPath,JSON.stringify(expected,null,2));
 }else{
  const p=await host('restart');
  for(const product of products){const {kind,app,options}=product,run=await world(p,product);const local=await c.eval('chrome.runtime.sendMessage({action:"reading",operation:"load"})',options.session);
   assert(local.value.favorites.map(x=>x.id).join(',')===expected[kind].favorites.join(','),kind+': favorites survive full browser restart');
   assert(await run(app+'.settings.panelWidth==='+expected[kind].width),kind+': preferences survive full browser restart');
   assert(await run(app+'.current.id==='+JSON.stringify(expected[kind].id)+'&&'+app+'.sceneID==='+JSON.stringify(expected[kind].sceneID)),kind+': new tab restores last product content and scene after restart');
  }
 }
 await fs.writeFile(path.join(output,'state-'+mode+'-checks.json'),JSON.stringify({checks},null,2));
}catch(error){await fs.writeFile(path.join(output,'state-'+mode+'-checks.json'),JSON.stringify({checks,error:error.stack},null,2));throw error;}finally{c.close();}
