(async function(){
 const app=document.title.includes('WaitWiki')?waitWiki:artBreeze;window.previewApp=app;await app.ready;app.detectPlatform=()=>true;
 const status=document.getElementById('preview-status');status.textContent='已就绪：真实界面代码，本地内容与 Chrome API 替身。';
 const wrap=fn=>()=>Promise.resolve(fn()).catch(e=>{status.textContent=e.message});
 document.getElementById('trigger').addEventListener('click',wrap(()=>{app.session.lastStart=-Infinity;return app.showPopup()}));
 document.getElementById('toggle-scene').addEventListener('click',wrap(()=>chrome.storage.sync.set({galleryEnabled:!app.settings.galleryEnabled})));
 document.getElementById('toggle-night').addEventListener('click',wrap(()=>chrome.storage.sync.set({appearance:app.settings.appearance==='dark'?'light':'dark'})));
 document.getElementById('next-content').addEventListener('click',wrap(()=>app.next()));
 document.getElementById('verify').addEventListener('click',wrap(async()=>{
  const results=[],check=(ok,label)=>{results.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw Error(label)};
  try{
   for(const scene of GalleryExperience.scenes){const image=new Image();image.src=chrome.runtime.getURL(scene.image);await image.decode();}
   check(true,GalleryExperience.scenes.length+' 张背景全部解码');await app.open();check(app.session.visible,'内容显示');
   const id=app.current.id,scene=app.sceneID;await chrome.storage.sync.set({appearance:'dark'});check(app.current.id===id&&app.sceneID===scene,'昼夜不换内容或场景');
   app.session.close();await app.open();check(app.current.id===id,'重开保持内容');check(fixtureErrors.length===0,'无未处理异常');
   status.textContent='开发夹具检查通过；不等同于真实扩展安装验证。';
  }finally{document.getElementById('verification-results').textContent=results.join('\n');}
 }));
})();
