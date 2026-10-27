const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const G = require('../gallery/experience.js');
const root = path.resolve(__dirname, '..'), manifest = require('../manifest.json'), reading = manifest.name.includes('WaitWiki');
test('product catalogue, generated data, resources and hashes agree', () => {
  const data = require('../gallery/scenes.json');
  assert.equal(data.product, reading ? 'waitwiki' : 'artbreeze');
  assert.equal(data.scenes.length, reading ? 1 : 24);
  assert.deepEqual(data.scenes, G.scenes);
  assert.equal(new Set(G.scenes.map(s => s.id)).size, G.scenes.length);
  assert.deepEqual(fs.readdirSync(path.join(root, 'gallery/images')).sort(), G.scenes.map(s => path.basename(s.image)).sort());
  for (const s of G.scenes) {
    const bytes = fs.readFileSync(path.join(root, s.image)); assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), s.provenance.sha256);
    assert.ok(s.mount.x >= 0 && s.mount.x + s.mount.width <= 1);
  }
  if (reading) assert.equal(G.scenes[0].id, 'bg-027');
});
test('matching, fixed scenes and no-repeat cycles', () => {
  for (const s of G.scenes) assert.equal(G.chooseScene({ selection: s.id }).id, s.id);
  const first = G.chooseScene({ palette: 'neutral' });
  if (!reading) assert.notEqual(G.nextScene({ palette: 'neutral', selection: 'auto' }, first.id, () => 0).id, first.id);
  assert.equal(G.nextScene({ kind: 'reading', selection: 'bg-027' }, 'bg-027').id, 'bg-027');
  assert.equal(G.nextScene({ selection: first.id }, first.id).id, first.id);
});
test('adaptive layouts preserve the original aspect and independent center', () => {
  for (const s of G.scenes) for (const width of [160, 240, 288, 360, 600, 800]) for (const height of [200, 360, 672]) for (const aspect of [.35, .65, 1, 1.6, 3.5]) for (const occupancy of [.68, .92, 1]) {
    const a = G.layoutArtwork(s, width, height, aspect, true, occupancy);
    assert.ok(Math.abs(a.x + a.width / 2 - width / 2) < .001, s.id);
    assert.ok(Math.abs(a.width / a.height - aspect) < .001);
    assert.ok(a.x >= 0 && a.x + a.width <= width + .001);
    assert.ok(a.y >= 0 && a.y + a.height <= height + .001, s.id + ': vertical bounds');
    assert.ok(a.caption.x >= a.x + a.width && a.caption.x + a.caption.width <= width + .001);
  }
});
test('viewport bounds and portrait height', () => {
  for (const kind of ['art', 'reading']) for (const [w,h] of [[320,568],[390,300],[1200,900],[160,180]]) {
    const d=G.dimensions(w,h,800,kind,.6);assert.ok(d.width<=w-32);assert.ok(d.height<=h-32);
  }
  assert.ok(G.dimensions(1200,900,600,'art',.6).height>G.dimensions(1200,900,600,'art',2).height);
});
test('art candidates respond to aspect while the reading scene stays fixed',()=>{
 if(reading){for(const aspect of [.35,1,3.5])assert.equal(G.nextScene({kind:'reading',selection:'bg-027',aspect}).id,'bg-027');return;}
 const select=aspect=>G.nextScene({selection:'auto',palette:'neutral',aspect},undefined,()=>0).id;
 assert.equal(select(.35),'bg-005');assert.equal(select(3.5),'bg-015');
});
test('safe source protocols',()=>{assert.equal(G.safeURL('javascript:alert(1)'),null);assert.equal(G.safeURL('data:text/html,bad'),null);assert.equal(G.safeURL('https://example.org/'),'https://example.org/');});
