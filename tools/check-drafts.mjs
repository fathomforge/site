#!/usr/bin/env node
/**
 * Keep the filename and the front matter honest about each other.
 *
 * Drafts live in `*.draft.md`, which .gitignore keeps out of the public repo.
 * Publishing means renaming to `*.md` AND setting `draft: false`. Those are two
 * steps, so they can drift — and both directions of drift are bad:
 *
 *   - `*.draft.md` with `draft: false`  → an unfinished post goes live
 *   - `*.md` with `draft: true`         → a finished post is committed but invisible
 *
 * This refuses to build in either case, so the mistake is loud instead of silent.
 */
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'writing',
);

const problems = [];
for (const file of (await readdir(dir)).filter((f) => f.endsWith('.md'))) {
  const src = await readFile(path.join(dir, file), 'utf8');
  const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const declaredDraft = /^draft:\s*true\s*$/m.test(fm);
  const namedDraft = file.endsWith('.draft.md');

  if (namedDraft && !declaredDraft) {
    problems.push(`${file}: named as a draft but front matter is not \`draft: true\` — ` +
      'it would publish while staying out of the repo');
  }
  if (!namedDraft && declaredDraft) {
    problems.push(`${file}: \`draft: true\` but not named \`*.draft.md\` — ` +
      'it is committed to the public repo and will not appear on the site');
  }
}

if (problems.length) {
  console.error('\nDraft state is inconsistent:\n');
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error('\nTo publish: rename `*.draft.md` → `*.md`, set `draft: false`, run `npm run og`.\n');
  process.exit(1);
}
console.log(`drafts: consistent (${(await readdir(dir)).filter((f) => f.endsWith('.md')).length} posts)`);
