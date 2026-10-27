/* Verifies a real old->new MV3 update at the same unpacked path/extension ID. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Chrome } from './chrome-client.mjs';
const [profile, base, output] = process.argv.slice(2);
const c=await Chrome.connect(profile), checks=[], migrations=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const assert=(ok,label)=>{checks.push({pass:!!ok,label});if(!ok)throw Error(label);console.log('PASS '+label)};
try{
 for(const id of ['fjcoghacmbgajfmlgcoedaeppeddcede','lpcfoemnmhjbdmkkbancafgkbpghiflf'])try{await c.call('Extensions.uninstall',{id});}catch{}
 for(const [repo,slug,oldVersion,newVersion] of [['artbreeze','artbreeze','1.1.0','1.2.0'],['WaitWiki','waitwiki','1.3.0','1.4.0']]){
  const target=path.join(path.dirname(profile),'upgrade-'+slug);
  const canonicalTarget=path.join(await fs.realpath(path.dirname(profile)),'upgrade-'+slug);
  const testID=[...createHash('sha256').update(canonicalTarget).digest().subarray(0,16)].map(v=>String.fromCharCode(97+(v>>4),97+(v&15))).join('');
  for(const t of (await c.call('Target.getTargets')).targetInfos.filter(t=>t.type==='page'&&t.url.startsWith('chrome-extension://'+testID+'/')))await c.call('Target.closeTarget',{targetId:t.targetId});
  try{await c.call('Extensions.uninstall',{id:testID});}catch{}
  await fs.rm(target,{recursive:true,force:true});await fs.mkdir(target,{recursive:true});
  execFileSync('/usr/bin/ditto',['-x','-k',path.join(base,repo,'dist',slug+'-'+oldVersion+'.zip'),target]);
  const first=await c.call('Extensions.loadUnpacked',{path:target});
  const old=await c.page('chrome-extension://'+first.id+'/popup.html');await delay(1200);
  const legacy={enabled:false,galleryEnabled:false,darkMode:true,appearance:'dark',showIcon:false,showArtworkInfo:false,sceneSelection:'bg-004',gallerySize:'small',cardSize:'small',contentTypes:['gathas'],...(slug==='waitwiki'?{displayDuration:'always'}:{autoHideDelay:1000})};
  // Each rerun starts from a coherent old-version state in this isolated profile.
  // v1.1 already had an explicit appearance setting; it takes priority over darkMode.
  await c.eval('(async()=>{await chrome.storage.sync.clear();await chrome.storage.sync.set('+JSON.stringify(legacy)+');})()',old.session);
  await delay(300);
  const seeded=await c.eval('chrome.storage.sync.get(null)',old.session);
  assert(seeded.enabled===false&&seeded.appearance==='dark'&&seeded.sceneSelection==='bg-004',slug+': old settings are persisted before update');
  await c.call('Target.closeTarget',{targetId:old.targetId});
  await fs.rm(target,{recursive:true,force:true});await fs.mkdir(target,{recursive:true});
  execFileSync('/usr/bin/ditto',['-x','-k',path.join(base,repo,'dist',slug+'-'+newVersion+'.zip'),target]);
  const second=await c.call('Extensions.loadUnpacked',{path:target});assert(first.id===second.id,slug+': upgrade retains extension ID');
  const updated=await c.page('chrome-extension://'+second.id+'/options.html');await delay(800);
  const prefs=await c.eval('chrome.storage.sync.get(null)',updated.session);
  migrations.push({product:slug,from:oldVersion,to:newVersion,before:legacy,after:prefs});
  assert(prefs.settingsVersion===2&&prefs.enabled===false&&prefs.galleryEnabled===false&&prefs.appearance==='dark',slug+': native update preserves disabled and dark appearance choices');
  assert(slug==='waitwiki'?prefs.autoHideEnabled===false:prefs.autoHideEnabled===true&&prefs.autoHideDelay===2,slug+': effective legacy duration migrates correctly');
  assert(prefs.sceneSelection===(slug==='waitwiki'?'bg-027':'bg-004'),slug+': fixed scene migration');
  if(slug==='waitwiki')assert(prefs.panelWidth===280&&prefs.contentTypes.length===1&&prefs.contentTypes[0]==='gathas',slug+': legacy small reading card and types retained');
  assert(await c.eval('chrome.runtime.getManifest().version',updated.session)===newVersion,slug+': final ZIP version loaded');
  await c.eval('chrome.storage.sync.set(GalleryExperience.preferences({}))',updated.session);
 }
 await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'upgrade-checks.json'),JSON.stringify({checks,migrations},null,2));
}catch(e){console.error(e.stack);await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'upgrade-checks.json'),JSON.stringify({checks,migrations,error:e.stack},null,2));throw e;}finally{c.close();}
