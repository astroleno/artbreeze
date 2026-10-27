/* Read-only public-page coverage; never submits an AI prompt or uses a signed-in profile. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { Chrome } from './chrome-client.mjs';
const [profile,root,output]=process.argv.slice(2),c=await Chrome.connect(profile),results=[];
const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
const urls=[...new Set(manifest.content_scripts.flatMap(s=>s.matches).map(p=>p.replace('*','')))];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const contexts=new Map();
c.listeners.push(e=>{if(e.method==='Runtime.executionContextCreated'&&e.params.context.origin.startsWith('chrome-extension://')){const list=contexts.get(e.sessionId)||[];list.push(e.params.context);contexts.set(e.sessionId,list);}});
try {
 for(const url of urls) {
  const p=await c.page();let status=null;
  const listener=e=>{if(e.sessionId===p.session&&e.method==='Network.responseReceived'&&e.params.type==='Document')status=e.params.response.status;};
  c.listeners.push(listener);await c.call('Network.enable',{},p.session);
  c.call('Page.navigate',{url},p.session).catch(()=>{});
  await delay(3500);
  let state;
  const inspect='({origin:location.origin,path:location.pathname,title:document.title,entries:document.querySelectorAll(".companion-entry").length,composer:!!document.querySelector("#prompt-textarea,textarea,.ProseMirror,rich-textarea,[contenteditable=true][role=textbox],.tiptap")})';
  try {
   state=await c.eval(inspect,p.session);
   if(state.composer&&!state.entries)for(let i=0;i<8;i++){await delay(1000);state=await c.eval(inspect,p.session);if(state.entries)break;}
   state.apps=[];
   for(const context of contexts.get(p.session)||[])try{const app=await c.eval('typeof artBreeze!=="undefined"?({kind:"art",ready:!!artBreeze.session,connected:!!artBreeze.ui.container?.isConnected}):typeof waitWiki!=="undefined"?({kind:"reading",ready:!!waitWiki.session,connected:!!waitWiki.ui.container?.isConnected}):null',p.session,context.id);if(app)state.apps.push(app);}catch{}
  }catch(e){state={error:e.message};}
  if(state.path)state.path=state.path.replace(/(\/(?:chat|c)\/)[^/]+/g,'$1[redacted]');
  results.push({requested:url,status,...state,coverage:'Public-page load only; no authenticated send was tested.'});console.log(JSON.stringify(results.at(-1)));
  c.listeners.splice(c.listeners.indexOf(listener),1);await c.call('Target.closeTarget',{targetId:p.targetId});
 }
 await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'site-checks.json'),JSON.stringify({date:'2026-10-27',results},null,2));
} finally {c.close();}
