const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),P=require('../providers.js'),m=require('../manifest.json');
test('MV3, local code, minimal API permissions and bounded sites',()=>{
 assert.equal(m.manifest_version,3);assert.deepEqual(m.permissions,['storage']);assert.deepEqual(m.content_scripts[0].matches,P.matches);
 assert.ok(!JSON.stringify(m).includes('<all_urls>'));assert.ok(!JSON.stringify(m).includes('*.volcengine'));
 assert.equal(m.options_ui.page,'options.html');
 for(const name of [...m.content_scripts[0].js,...m.content_scripts[0].css,m.background.service_worker,m.action.default_popup,m.options_ui.page])assert.ok(fs.existsSync(path.resolve(__dirname,'..',name)),name);
 for(const group of m.web_accessible_resources)for(const origin of group.matches)assert.match(origin,/^https:\/\/[^/]+\/\*$/);
 const scripts=[...m.content_scripts[0].js,'background.js','popup.js','options.js','gallery/settings.js'];
 for(const name of scripts){const s=fs.readFileSync(path.resolve(__dirname,'..',name),'utf8');assert.ok(!/\beval\s*\(|new Function\s*\(|import\s*\(\s*['"]https?:/.test(s),name);}
 assert.ok(m.content_security_policy.extension_pages.includes("script-src 'self'"));
});
