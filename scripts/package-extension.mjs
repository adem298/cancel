// Builds public/downloads/stopbill-extension.zip from the extension/ folder.
// The extension has no build step and no API origin: it only stores data in the browser.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strToU8, zipSync } from 'fflate';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'extension');

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

const files = {};
for (const file of listFiles(source).sort()) {
  const name = relative(source, file).split('\\').join('/');
  files[name] = name.endsWith('.json') || name.endsWith('.js') || name.endsWith('.html') || name.endsWith('.css')
    ? strToU8(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))
    : new Uint8Array(readFileSync(file));
}

// Fail the build if the manifest asks for more than the extension needs.
const manifest = JSON.parse(readFileSync(join(source, 'manifest.json'), 'utf8'));
const allowedHosts = ['https://gmail.googleapis.com/*'];
if (JSON.stringify(manifest.host_permissions) !== JSON.stringify(allowedHosts) || manifest.content_scripts) {
  throw new Error('manifest.json may only reach the Gmail API and must not add content scripts. See README.');
}

const out = join(root, 'public', 'downloads');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'stopbill-extension.zip'), zipSync(files, { level: 9 }));
console.log(`Packaged ${Object.keys(files).length} extension files.`);
