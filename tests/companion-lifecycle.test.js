const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const G=require('../gallery/experience.js'),Reading=require('../gallery/reading-state.js'),{Session}=require('../gallery/session.js');
const context=vm.createContext({GalleryExperience:{...G,paletteFromImage:()=> 'neutral'},GalleryReading:Reading,document:{activeElement:null},devicePixelRatio:1,requestAnimationFrame:fn=>fn()});
vm.runInContext(fs.readFileSync(require.resolve('../gallery/companion.js'),'utf8'),context);
const prototype=context.GalleryCompanion.prototype;
const item=id=>({id,type:'gathas',title:id,content:'Retained text'});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fixture(kind='reading') {
 const app=Object.create(prototype),details={open:true,contains:()=>false},attributes={};
 Object.assign(app,{kind,loadRevision:0,current:item('old'),settings:G.preferences({autoHideEnabled:false},kind),state:Reading.empty(),ui:{frame:{scrollTop:123,style:{},setAttribute:(k,v)=>attributes[k]=v},container:{hidden:false,dataset:{},contains:()=>false,querySelector:()=>details},icon:{hidden:true},status:{textContent:''},updateStatus:{textContent:''}},updateTools(){},renders:0});
 app.render=async()=>{app.renders++;};
 app.session=new Session({settings:app.settings,onShow:()=>app.render(),onHide:()=>app.hideUI(),onCycle:()=>app.prepareCycle()});app.session.visible=true;
 return {app,attributes};
}
test('next preserves visible content and scroll; dismissal cancels commit',async()=>{
 const {app,attributes}=fixture(),job=deferred();app.requestContent=()=>job.promise;
 const request=app.next();assert.equal(app.ui.container.hidden,false);assert.equal(app.session.busy,true);assert.equal(attributes['aria-busy'],'true');
 assert.equal(app.current.id,'old');assert.equal(app.ui.frame.scrollTop,123);
 app.session.close();job.resolve(item('late'));await request;
 assert.equal(app.current.id,'old');assert.equal(app.ui.container.hidden,true);assert.equal(app.session.busy,false);assert.equal(app.renders,0);assert.equal(app.ui.updateStatus.textContent,'');
});
test('only newest request commits and owns loading feedback',async()=>{
 const {app}=fixture(),first=deferred(),second=deferred();let calls=0;app.requestContent=()=>++calls===1?first.promise:second.promise;
 const a=app.next(),b=app.next();second.resolve(item('newest'));await b;first.resolve(item('stale'));await a;
 assert.equal(app.current.id,'newest');assert.equal(app.renders,1);assert.equal(app.session.busy,false);assert.equal(app.ui.updateStatus.textContent,'');
});
test('rejected next request stays suppressed after dismissal',async()=>{
 const {app}=fixture(),job=deferred();app.requestContent=()=>job.promise;
 const request=app.next();app.session.close();job.reject(Error('offline'));await assert.doesNotReject(request);
 assert.equal(app.current.id,'old');assert.equal(app.ui.updateStatus.textContent,'');assert.equal(app.ui.container.hidden,true);
});
test('failed replacement retains content and provides recoverable feedback',async()=>{
 const {app}=fixture();app.requestContent=async()=>{throw Error('offline');};await app.next();
 assert.equal(app.current.id,'old');assert.equal(app.ui.frame.scrollTop,123);assert.equal(app.ui.container.hidden,false);assert.equal(app.session.busy,false);
 assert.match(app.ui.updateStatus.textContent,/已保留当前内容/);assert.equal(app.renders,0);
});
test('art image failure cannot commit metadata or reset scroll',async()=>{
 const {app}=fixture('art');app.requestContent=async()=>item('new');app.loadArtwork=async()=>{throw Error('decode failed');};await app.next();
 assert.equal(app.current.id,'old');assert.equal(app.ui.frame.scrollTop,123);assert.match(app.ui.updateStatus.textContent,/已保留当前内容/);assert.equal(app.renders,0);
});
test('closing during image preparation cancels late image and metadata',async()=>{
 const {app}=fixture('art'),image=deferred(),started=deferred();app.requestContent=async()=>item('new');app.loadArtwork=()=>{started.resolve();return image.promise;};
 const request=app.next();await started.promise;app.session.close();image.resolve({id:'new'});await request;
 assert.equal(app.current.id,'old');assert.equal(app.preparedArtwork,undefined);assert.equal(app.renders,0);
});
test('art replacement commits only when its candidate image is ready',async()=>{
 const {app}=fixture('art'),image=deferred(),started=deferred();app.requestContent=async()=>item('new');app.loadArtwork=()=>{started.resolve();return image.promise;};
 const request=app.next();await started.promise;assert.equal(app.current.id,'old');assert.equal(app.ui.frame.scrollTop,123);
 image.resolve({id:'new'});await request;assert.equal(app.current.id,'new');assert.equal(app.preparedArtwork.id,'new');assert.equal(app.ui.frame.scrollTop,0);assert.equal(app.renders,1);
});

function coldFixture(kind) {
 const value=fixture(kind),app=value.app;
 const field=()=>({textContent:'',hidden:false,removeAttribute(){}});
 app.current=null;app.ready=Promise.resolve();app.session.visible=false;app.ui.container.hidden=true;app.ui.icon.hidden=false;
 Object.assign(app.ui,{title:field(),artist:field(),metadata:field(),notice:field(),content:field(),source:field(),image:{decode:async()=>{}}});
 app.gallery={apply(){},updateContent(){}};app.persist=async()=>{};
 app.render=()=>prototype.render.call(app);
 app.loadArtwork=async content=>({id:content.id,data:'data:image/png;base64,AA==',image:{naturalWidth:100,naturalHeight:100}});
 return value;
}
for (const kind of ['reading','art']) {
 test(kind+' cold open immediately shows feedback and stays busy until ready',async()=>{
  const {app,attributes}=coldFixture(kind),content=deferred(),started=deferred(),image=deferred(),imageStarted=deferred();
  app.requestContent=()=>{started.resolve();return content.promise;};
  if(kind==='art')app.loadArtwork=()=>{imageStarted.resolve();return image.promise;};
  const opening=app.open();await started.promise;
  assert.equal(app.ui.container.hidden,false);assert.equal(app.ui.icon.hidden,true);
  assert.match(app.ui.status.textContent,/正在准备/);assert.equal(app.session.busy,true);assert.equal(attributes['aria-busy'],'true');
  content.resolve(item('first'));
  if(kind==='art'){await imageStarted.promise;assert.equal(app.session.busy,true);image.resolve({id:'first',data:'data:image/png;base64,AA==',image:{naturalWidth:100,naturalHeight:100}});}
  await opening;
  assert.equal(app.current.id,'first');assert.equal(app.session.busy,false);assert.equal(attributes['aria-busy'],'false');
  assert.equal(app.ui.status.textContent,'');assert.equal(app.ui.frame.style.visibility,'');
 });
 test(kind+' cold failure releases busy state and leaves a retry path',async()=>{
  const {app}=coldFixture(kind);app.requestContent=async()=>{throw Error('内容暂不可用，请重试。');};
  await app.open().catch(error=>app.error(error));
  assert.equal(app.session.busy,false);assert.equal(app.ui.container.hidden,false);assert.match(app.ui.status.textContent,/请重试/);
  app.requestContent=async()=>item('recovered');await app.next();
  assert.equal(app.current.id,'recovered');assert.equal(app.ui.status.textContent,'');assert.equal(app.session.busy,false);
 });
 test(kind+' cold completion or failure after close never reopens the surface',async()=>{
  for(const reject of [false,true]){
   const {app}=coldFixture(kind),job=deferred(),started=deferred();app.requestContent=()=>{started.resolve();return job.promise;};
   const opening=app.open().catch(error=>app.error(error));await started.promise;app.session.close();
   if(reject)job.reject(Error('late failure'));else job.resolve(item('late'));
   await opening;
   assert.equal(app.current,null);assert.equal(app.session.visible,false);assert.equal(app.ui.container.hidden,true);
   assert.equal(app.ui.status.textContent,'');assert.equal(app.session.busy,false);
  }
 });
 test(kind+' automatic first display preserves host focus',async()=>{
  const {app}=coldFixture(kind),composer={id:'host-composer'};context.document.activeElement=composer;
  app.requestContent=async()=>item('automatic');await app.session.begin();
  assert.equal(context.document.activeElement,composer);assert.equal(app.current.id,'automatic');
  context.document.activeElement=null;
 });
}
