#!/usr/bin/env node
/**
 * Normalize long dashes (em-dash U+2014 '—' and en-dash U+2013 '–') to a plain
 * hyphen '-' across the Backend and Frontend text files.
 *
 * Long dashes in copy/comments read as machine/AI-generated; a plain hyphen is
 * the "computer-typed" look. This rewrites every tracked text file in both
 * repos (skipping binaries, vendored deps, build output, and lockfiles).
 *
 * Usage:
 *   node scripts/normalize-dashes.mjs
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..'); // C:\Dev\Custosell
const REPOS = ['Backend', 'Frontend'];

// Extensions that are safe to treat as text.
const BINARY_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.woff', '.woff2',
  '.ttf', '.eot', '.mp3', '.mp4', '.pdf', '.zip', '.gz', '.wasm',
]);
const SKIP_PATHS = ['/node_modules/', '/vendor/', '/dist/', '/.git/'];

function isTextFile(relPath) {
  if (SKIP_PATHS.some((p) => relPath.includes(p))) return false;
  const ext = relPath.toLowerCase().slice(relPath.lastIndexOf('.'));
  return !BINARY_EXT.has(ext);
}

function trackedFiles(repo) {
  const out = execSync(`git -C ${repo} ls-files`, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  return out.split('\n').filter(Boolean);
}

let totalChanged = 0;
let totalReplacements = 0;

for (const repo of REPOS) {
  let changed = 0;
  let replaced = 0;
  for (const rel of trackedFiles(repo)) {
    if (!isTextFile(rel)) continue;
    const abs = join(ROOT, repo, rel);
    let content;
    try {
      content = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    if (!/[\u2014\u2013]/.test(content)) continue;
    const next = content.replace(/[\u2014\u2013]/g, '-');
    if (next === content) continue;
    writeFileSync(abs, next);
    changed++;
    replaced += (content.match(/[\u2014\u2013]/g) || []).length;
  }
  console.log(`${repo}: ${changed} file(s) changed, ${replaced} dash(es) → '-'`);
  totalChanged += changed;
  totalReplacements += replaced;
}

console.log(`\nDone. ${totalChanged} file(s), ${totalReplacements} dash(es) normalized.`);
