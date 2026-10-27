const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),m=require('../manifest.json'),reading=m.name.includes('WaitWiki');
test('release archive has a reproducible allowlist, complete declared assets and exact scene count',()=>{
 const script=path.join(root,'scripts/package.py');execFileSync('python3',[script]);
 const file=path.join(root,'dist',(reading?'waitwiki':'artbreeze')+'-'+m.version+'.zip');
 const before=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');execFileSync('python3',[script]);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),before);
 const result=JSON.parse(execFileSync('python3',['-c',
  'import json,zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);print(json.dumps({"bad":z.testzip(),"files":z.namelist(),"manifest":json.loads(z.read("manifest.json"))}))',file],{encoding:'utf8'}));
 assert.equal(result.bad,null);assert.equal(result.manifest.version,m.version);
 const names=result.files;assert.equal(names.filter(n=>n.startsWith('gallery/images/')&&n.endsWith('.webp')).length,reading?1:24);
 assert.ok(names.includes('options.html')&&names.includes('privacy.html')&&names.includes('providers.js'));
 assert.ok(!names.some(n=>['tests/','docs/','scripts/','data/','chrome_store/','.git/'].some(prefix=>n.startsWith(prefix))));
 for(const name of [...m.content_scripts[0].js,...m.content_scripts[0].css,m.background.service_worker,m.action.default_popup,m.options_ui.page])assert.ok(names.includes(name),name);
 assert.equal(names.includes('local-content.json'),reading);
});
