const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const files = ['content.js', 'background.js', 'popup.js', ...fs.readdirSync(path.join(root, 'gallery')).filter(name => name.endsWith('.js')).map(name => `gallery/${name}`)];
for (const file of files) execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'inherit' });
execFileSync(process.execPath, ['--test', path.join(root, 'tests/gallery.test.js')], { stdio: 'inherit' });
