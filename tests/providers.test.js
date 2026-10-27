const {test}=require('node:test'),assert=require('node:assert/strict'),P=require('../providers.js');
test('senders are exact trusted sites or local product pages',()=>{
 const id='abc';assert.equal(P.allowedSender({id,url:'chrome-extension://abc/options.html'},id),true);
 assert.equal(P.allowedSender({id,tab:{id:3},url:'chrome-extension://abc/options.html'},id),true);
 assert.equal(P.allowedSender({id,tab:{id:3},url:'chrome-extension://abc/other.html'},id),false);
 assert.equal(P.allowedSender({id,tab:{id:1},url:'https://chatgpt.com/c/test'},id),true);
 for(const url of ['https://chatgpt.com.evil.test/','http://claude.ai/','https://x.com/home','https://cloud.volcengine.com/'])assert.equal(P.supported(url),false);
 assert.equal(P.allowedSender({id:'evil',tab:{},url:'https://chatgpt.com/'},id),false);
});
test('requests omit credentials and reject redirects, errors, oversized data and non-images',async()=>{
 let opts;await P.get('https://example.org/', 'json',async(_,o)=>{opts=o;return new Response('{}')});assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');assert.equal(opts.referrerPolicy,'no-referrer');
 await assert.rejects(P.get('https://example.org/','json',async()=>new Response('x',{status:500})));
 await assert.rejects(P.get('https://example.org/','text',async()=>new Response('12345'),3));
 await assert.rejects(P.get('https://example.org/','image',async()=>new Response('<script/>',{headers:{'content-type':'text/html'}})));
});
test('CSV parser preserves quoted commas, multiline fields and original source',()=>{
 const rows=P.csv('id,title,content,source\n1,标题,"内容，含逗号,和引用""字符""",来源\n2,标题,"内容第一行\n内容第二行",来源\n');
 assert.equal(rows.length,2);assert.match(rows[0].content,/,和引用"字符"/);assert.match(rows[1].content,/\n/);
});
test('arbitrary image IDs are rejected without a network request',async()=>{
 const p=new P.Providers({storage:{get:async()=>({})},fetcher:async()=>{throw Error('unexpected network')}});
 p.artworks=[];await assert.rejects(p.image('https://evil.test/'),/Unknown artwork/);
});
test('provider failure retains each content type and labels fallback',async()=>{
 const local={facts:[{title:'本地事实',content:'本地备用数据',type:'facts',source:'原有数据'}]};
 const p=new P.Providers({storage:{},resourceURL:p=>'chrome-extension://abc/'+p,fetcher:async(url)=>url.includes('local-content')?new Response(JSON.stringify(local)):new Response('',{status:503})});
 const result=await p.knowledge('facts','zh');assert.equal(result.type,'facts');assert.match(result.notice,/本地备用/);
 await assert.rejects(p.knowledge('secret','zh'));
});
test('remote requests coalesce across tabs and quote language choices share the rate cache',async()=>{
 let calls=0;
 const p=new P.Providers({storage:{},fetcher:async()=>{calls++;await new Promise(r=>setTimeout(r,15));return new Response(JSON.stringify([{q:'A sufficiently long quote.',a:'Author'}]));}});
 const rows=await Promise.all(['zh','en','fr'].map(language=>p.knowledge('quotes',language)));
 assert.equal(calls,1);assert.equal(new Set(rows.map(row=>row.id)).size,1);
 await p.knowledge('quotes','de');assert.equal(calls,1);
});
test('full-resolution image is attempted before using an offline legacy thumbnail',async()=>{
 const image='https://lh3.ggpht.com/known-art',thumbnail='data:image/jpeg;base64,YWJj';let request;
 const p=new P.Providers({storage:{get:async()=>({artbreeze_global_cache_v1:{[image]:thumbnail}})},fetcher:async url=>{request=url;throw Error('offline');}});
 p.artworks=[{id:'known',image}];assert.equal(await p.image('known',1200),thumbnail);assert.equal(request,image+'=s1200');
});
test('different texts from a shared source URL keep separate favorite and progress IDs',()=>{
 const a={type:'quotes',title:'Author',content:'First quotation',url:'https://zenquotes.io/'};
 assert.notEqual(P.card(a).id,P.card({...a,content:'Second quotation'}).id);
 assert.equal(P.card(a).id,P.card({...a}).id);
});
test('next content avoids the current quote without exceeding the remote rate cache',async()=>{
 let remote=0;const local={quotes:[{title:'Local author',content:'A local quotation',source:'Original local selection'}]};
 const p=new P.Providers({resourceURL:s=>'chrome-extension://test/'+s,fetcher:async url=>{if(url.startsWith('chrome-extension:'))return new Response(JSON.stringify(local));remote++;return new Response(JSON.stringify([{q:'An online quotation',a:'Remote author'}]));}});
 const first=await p.knowledge('quotes','zh');const next=await p.knowledge('quotes','zh',first.id);
 assert.notEqual(next.id,first.id);assert.equal(remote,1);assert.match(next.notice,/本地备用/);
});
