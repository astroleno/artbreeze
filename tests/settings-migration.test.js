const { test }=require('node:test'),assert=require('node:assert/strict'),G=require('../gallery/experience.js');
test('new defaults and invalid values are bounded',()=>{
 const p=G.preferences({},'art');assert.equal(p.autoHideDelay,2);assert.equal(p.panelWidth,600);assert.equal(p.artworkScale,.92);
 assert.equal(G.preferences({},'reading').galleryEnabled,false);assert.equal(G.preferences({},'reading').sceneSelection,'bg-027');
 assert.equal(G.preferences({panelWidth:9999,artworkScale:-1}).panelWidth,800);
 assert.equal(G.preferences({artworkScale:-1}).artworkScale,.68);
 assert.equal(G.preferences({contentTypes:[]},'reading').contentTypes.length,9);
});
test('effective legacy preferences and disabled states survive idempotent migration',()=>{
 const old={enabled:false,galleryEnabled:false,darkMode:true,cardSize:'small',displayDuration:'20',sceneSelection:'bg-004',contentTypes:['gathas'],showIcon:false};
 const p=G.preferences(old,'reading');assert.equal(p.panelWidth,280);assert.equal(p.autoHideDelay,20);assert.equal(p.appearance,'dark');assert.equal(p.sceneSelection,'bg-027');assert.equal(p.showIcon,false);assert.equal(p.enabled,false);
 assert.deepEqual(G.preferences(p,'reading'),p);
 assert.equal(G.preferences({displayDuration:'always'},'reading').autoHideEnabled,false);
 assert.equal(G.preferences({autoHideDelay:1000},'art').autoHideDelay,2);
 assert.equal(G.preferences({settingsVersion:2,autoHideDelay:35},'art').autoHideDelay,35);
 assert.equal(G.preferences({galleryEnabled:true,gallerySize:'medium',cardSize:'small'},'reading').panelWidth,520);
});
