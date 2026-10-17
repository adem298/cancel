// Builds public/downloads/stopbill-extension.zip. The API origin is baked into the
// manifest's host permissions and into config.js, so the extension can only talk to that origin.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strToU8, zipSync } from 'fflate';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apiBase = (process.env.EXTENSION_API_BASE ?? 'https://stopbill.dev').replace(/\/+$/, '');
const origin = new URL(apiBase).origin; // throws on a malformed value

const read = (file) => new Uint8Array(readFileSync(join(root, 'extension', file)));

const manifest = JSON.parse(readFileSync(join(root, 'extension', 'manifest.json'), 'utf8'));
manifest.host_permissions = [`${origin}/*`];

const files = {
  'manifest.json': strToU8(`${JSON.stringify(manifest, null, 2)}\n`),
  'config.js': strToU8(`window.STOPBILL_CONFIG = ${JSON.stringify({ apiBase })};\n`),
  'popup.html': read('popup.html'),
  'popup.css': read('popup.css'),
  'popup.js': read('popup.js'),
  'adapters.js': read('adapters.js'),
  'content.js': read('content.js'),
};

const out = join(root, 'public', 'downloads');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'stopbill-extension.zip'), zipSync(files, { level: 9 }));
console.log(`Packaged the extension for ${origin}.`);
