const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const G=require('../gallery/experience.js'),Reading=require('../gallery/reading-state.js');
const context=vm.createContext({GalleryExperience:G,GalleryReading:Reading});
vm.runInContext(fs.readFileSync(require.resolve('../gallery/companion.js'),'utf8'),context);
const prototype=context.GalleryCompanion.prototype;
test('closing while next content loads cancels the later reopening',async()=>{
 let resolve,opened=0;
 const app=Object.create(prototype);app.settings={enabled:true};
 app.session={revision:0,close(){this.revision++;},async open(){opened++;}};
 app.prepareCycle=()=>new Promise(r=>{resolve=r;});
 const request=app.next();app.session.close();resolve();await request;
 assert.equal(opened,0);
});
test('a dismissed request cannot replace the retained content',async()=>{
 let resolve;
 const app=Object.create(prototype),old={id:'old',type:'gathas',title:'Old',content:'Retained text'};
 Object.assign(app,{kind:'reading',loadRevision:0,current:old,session:{revision:1},settings:G.preferences({},'reading'),ui:{frame:{scrollTop:0}},requestContent:()=>new Promise(r=>{resolve=r;})});
 const request=app.prepareCycle(true);app.session.revision++;resolve({id:'new',type:'gathas',title:'New',content:'Late text'});await request;
 assert.equal(app.current,old);
});
test('a rejected next request stays suppressed after manual dismissal',async()=>{
 let reject,opened=0;
 const app=Object.create(prototype);app.settings={enabled:true};
 app.session={revision:0,close(){this.revision++;},async open(){opened++;}};
 app.prepareCycle=()=>new Promise((_,r)=>{reject=r;});
 const request=app.next();app.session.close();reject(Error('offline'));
 await assert.doesNotReject(request);assert.equal(opened,0);
});
