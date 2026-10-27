/* Production UI and public content on a real, anonymous Kimi page; no AI message. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { Chrome } from './chrome-client.mjs';
const [profile,output]=process.argv.slice(2),c=await Chrome.connect(profile),contexts=[],results=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let i=0;i<150;i++){if(await fn())return;await delay(100);}throw Error('Timed out: '+label);}
try{
 const p=await c.page();c.listeners.push(e=>{if(e.sessionId===p.session&&e.method==='Runtime.executionContextCreated'&&e.params.context.origin.startsWith('chrome-extension://'))contexts.push(e.params.context);});
 await c.call('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false},p.session);
 await c.call('Page.navigate',{url:'https://www.kimi.com/'},p.session);
 await until(()=>c.eval('document.querySelectorAll(".companion-entry").length===2',p.session),'real-page extension entries');
 for(const [app,kind] of [['artBreeze','art'],['waitWiki','reading']]){
  let context;
  for(const item of contexts)try{if(await c.eval('typeof '+app+'!=="undefined"',p.session,item.id))context=item;}catch{}
  if(!context)throw Error('Missing isolated world: '+kind);
  const run=expr=>c.eval(expr,p.session,context.id);
  for(const item of contexts)if(item.id!==context.id)try{await c.eval('chrome.storage.sync.set({enabled:false})',p.session,item.id);}catch{}
  await run(app+'.ready');await run('chrome.storage.sync.set({enabled:true,autoHideEnabled:false,panelWidth:600,galleryEnabled:true,appearance:"light",contentTypes:["gathas"]})');await delay(150);
  await run(app+'.ui.icon.click()');await until(()=>run(app+'.session.visible&&'+app+'.ui.frame.style.visibility!=="hidden"&&'+app+'.ui.container.dataset.galleryState==="ready"'),kind+' actual content');await delay(250);
  await c.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:100,y:780},p.session);await delay(400);
  const file=kind+'-store-1280x800.png';await c.screenshot(p.session,path.join(output,file));
  const rect=await run('(()=>{const r='+app+'.ui.container.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()');
  const detail=await c.call('Page.captureScreenshot',{format:'png',clip:rect,captureBeyondViewport:false},p.session);
  await fs.writeFile(path.join(output,kind+'-detail.png'),Buffer.from(detail.data,'base64'));
  results.push({kind,pass:await run(app+'.ui.container.isConnected&&!'+app+'.ui.container.hidden'),sceneID:await run(app+'.sceneID'),file,site:'https://www.kimi.com/',trigger:'Entry button only; no AI message was sent.'});
  await run(app+'.session.close(false)');
 }
 for(const item of contexts)try{await c.eval('chrome.storage.sync.set({enabled:true})',p.session,item.id);}catch{}
 await fs.writeFile(path.join(output,'live-screenshot-checks.json'),JSON.stringify({results},null,2));
 console.log(JSON.stringify(results));
}finally{c.close();}
