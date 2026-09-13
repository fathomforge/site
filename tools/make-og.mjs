#!/usr/bin/env node
/**
 * Generate Open Graph share images (1200x630) into public/og/.
 *
 * Rasterises tools/og-template.html with headless Chrome, which is already on
 * this machine — deliberately avoiding a satori/resvg toolchain, since the
 * Fontsource packages ship woff2 only and satori needs TTF.
 *
 * Run after adding or retitling a post:  npm run og
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const template = path.join(root, 'tools', 'og-template.html');
const outDir = path.join(root, 'public', 'og');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** Minimal front-matter reader — avoids pulling in a YAML dependency. */
function frontMatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

async function shot(name, { title, desc = '', kicker = '' }) {
  const qs = new URLSearchParams({ title, desc, kicker }).toString();
  const out = path.join(outDir, `${name}.png`);
  await run(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-color-profile=srgb',
    '--virtual-time-budget=4000',
    `--screenshot=${out}`,
    '--window-size=1200,630',
    `file://${template}?${qs}`,
  ]);
  console.log(`  ✓ og/${name}.png   ${title.slice(0, 58)}`);
}

const pages = [
  ['default',     { title: 'Security engineering for autonomous systems',
                    desc: 'Writing and open-source guardrails for agents that act on their own.' }],
  ['writing',     { kicker: 'Writing', title: 'Notes from production',
                    desc: "Incidents and design arguments from running agents that spend real money." }],
  ['open-source', { kicker: 'Open source', title: 'Tools, given away',
                    desc: 'Free, MIT-licensed guardrails. No telemetry, no account, no lock-in.' }],
  ['about',       { kicker: 'About', title: 'fathomforge is one person.',
                    desc: 'Carlos M. — a security engineer working on the safety and cost of autonomous systems.' }],
  ['contact',     { kicker: 'Contact', title: 'Get in touch',
                    desc: 'Email, read by a human. No form, no tracking, no autoresponder.' }],
];

await mkdir(outDir, { recursive: true });
console.log('Generating OG images…');

for (const [name, opts] of pages) await shot(name, opts);

const postsDir = path.join(root, 'src', 'content', 'writing');
for (const file of (await readdir(postsDir)).filter((f) => f.endsWith('.md'))) {
  const fm = frontMatter(await readFile(path.join(postsDir, file), 'utf8'));
  if (!fm.title) continue;
  // Draft share images are publicly fetchable once deployed, and each one renders
  // the unpublished title and description as text. Generate them at publish time.
  if (fm.draft !== 'false') {
    console.log(`  – skipped og/post-${file.replace(/\.md$/, '')}.png (draft)`);
    continue;
  }
  await shot(`post-${file.replace(/\.md$/, '')}`, {
    kicker: 'Writing',
    title: fm.title,
    desc: fm.description ?? '',
  });
}

console.log('Done.');
