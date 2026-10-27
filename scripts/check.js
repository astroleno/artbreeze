const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const files = ['content.js', 'background.js', 'providers.js', 'popup.js', 'options.js', ...fs.readdirSync(path.join(root, 'gallery')).filter(n => n.endsWith('.js')).map(n => 'gallery/' + n)];
for (const file of files) execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'inherit' });
const tests = fs.readdirSync(path.join(root, 'tests')).filter(n => n.endsWith('.test.js')).map(n => path.join(root, 'tests', n));
execFileSync(process.execPath, ['--test', ...tests], { stdio: 'inherit' });
