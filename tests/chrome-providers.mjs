/* Real service-worker fetches. Run in the task-only profile after UI validation. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { Chrome } from './chrome-client.mjs';
const [profile,wikiRoot,output]=process.argv.slice(2),c=await Chrome.connect(profile),results=[],requests=[];
try {
 const {id}=await c.call('Extensions.loadUnpacked',{path:path.resolve(wikiRoot)});
 const p=await c.page('chrome-extension://'+id+'/options.html');
 await c.eval('chrome.runtime.sendMessage({action:"reading",operation:"load"})',p.session);
 const target=(await c.call('Target.getTargets')).targetInfos.find(t=>t.type==='service_worker'&&t.url==='chrome-extension://'+id+'/background.js');
 if(!target)throw Error('Native service worker not available');
 const worker=await c.attach(target.targetId);await c.call('Network.enable',{},worker);
 c.listeners.push(e=>{if(e.sessionId===worker&&e.method==='Network.requestWillBeSent')requests.push({url:e.params.request.url,method:e.params.request.method,referrer:e.params.request.headers.Referer||'',hasPostData:!!e.params.request.hasPostData});});
 await c.eval('chrome.storage.sync.set({contentTypes:GalleryExperience.TYPES,language:"zh"})',p.session);
 for(const type of ['wikipedia','quotes','facts','advice','catfacts','trivia','cocktails','datafacts','gathas']) {
  const response=await c.eval('chrome.runtime.sendMessage({action:"content",operation:"knowledge",type:'+JSON.stringify(type)+'})',p.session);
  const v=response.value;
  results.push({type,pass:response.ok&&v?.type===type&&v.content?.length>0,source:v?.source,notice:v?.notice||'',characters:v?.content?.length||0});
  console.log(JSON.stringify(results.at(-1)));
 }
 const rejected=await c.eval('chrome.runtime.sendMessage({action:"content",operation:"fetch",url:"https://example.org/"})',p.session);
 const dataBoundary=requests.every(r=>r.method==='GET'&&!r.referrer&&!r.hasPostData&&!/chatgpt\.com|conversation|prompt=/.test(r.url));
 const report={date:'2026-10-27',browser:await c.call('Browser.getVersion'),results,arbitraryFetchRejected:rejected.ok===false,dataBoundary,requests};
 await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'provider-checks.json'),JSON.stringify(report,null,2));
 if(results.some(r=>!r.pass)||!dataBoundary||rejected.ok!==false)throw Error('Provider validation failed');
} finally {c.close();}
