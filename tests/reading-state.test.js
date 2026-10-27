const {test}=require('node:test'),assert=require('node:assert/strict'),R=require('../gallery/reading-state.js');
const item={id:'a',type:'wikipedia',title:'A',content:'text',url:'https://example.org/'};
test('recent, scroll positions and favorites are independent',()=>{
 let s=R.reduce({}, {operation:'record',item,sceneID:'bg-005',locked:true});s=R.reduce(s,{operation:'progress',id:'a',offset:123});s=R.reduce(s,{operation:'favorite',item});
 s=R.reduce(s,{operation:'record',item:{...item,id:'b',title:'B'}});assert.equal(s.positions.a,123);assert.equal(s.favorites[0].id,'a');assert.equal(s.current.item.id,'b');assert.equal(s.current.locked,false);
 assert.equal(R.reduce(s,{operation:'favorite',item}).favorites.length,0);assert.deepEqual(R.reduce(s,{operation:'clear'}),R.empty());
});
test('storage only accepts content fields and bounded collections',()=>{
 const bad={...item,url:'javascript:alert(1)',image:'data:text/html,bad',prompt:'private',conversationURL:'secret'};
 const cleaned=R.item(bad);assert.equal(cleaned.url,'');assert.equal(cleaned.image,'');assert.equal(cleaned.prompt,undefined);assert.equal(cleaned.conversationURL,undefined);
 let s=R.empty();for(let i=0;i<200;i++)s=R.reduce(s,{operation:'record',item:{...item,id:String(i)}});assert.equal(s.recent.length,50);
 assert.equal(R.reduce(s,{operation:'progress',id:'not-known',offset:20}).positions['not-known'],undefined);
});
