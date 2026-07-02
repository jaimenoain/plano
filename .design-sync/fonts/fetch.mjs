// One-shot: self-host Inter + Space Mono (latin subsets) from the Google Fonts
// CSS in _gf.css. Downloads woff2 into this dir and writes fonts.css with local
// url() refs, which cfg.extraFonts points at. Re-run only if the font set changes.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const DIR = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(DIR, '_gf.css'), 'utf8');

const get = (url) => new Promise((res, rej) => {
  https.get(url, (r) => {
    if (r.statusCode !== 200) return rej(new Error(`${r.statusCode} ${url}`));
    const chunks = [];
    r.on('data', (c) => chunks.push(c));
    r.on('end', () => res(Buffer.concat(chunks)));
  }).on('error', rej);
});

// Split into (comment, block) pairs; keep only latin + latin-ext subsets.
const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)];
const out = [];
for (const [, subset, block] of blocks) {
  if (subset !== 'latin' && subset !== 'latin-ext') continue;
  const fam = /font-family:\s*'([^']+)'/.exec(block)[1].toLowerCase().replace(/\s+/g, '-');
  const weight = /font-weight:\s*(\d+)/.exec(block)[1];
  const style = /font-style:\s*(\w+)/.exec(block)[1];
  const url = /url\((https:[^)]+\.woff2)\)/.exec(block)[1];
  const file = `${fam}-${weight}-${style}-${subset}.woff2`;
  const buf = await get(url);
  writeFileSync(join(DIR, file), buf);
  out.push(block.replace(/url\(https:[^)]+\.woff2\)/, `url(./${file})`));
  console.error(`  ${file} (${buf.length} B)`);
}
writeFileSync(join(DIR, 'fonts.css'), out.join('\n') + '\n');
console.error(`wrote fonts.css: ${out.length} @font-face rules`);
