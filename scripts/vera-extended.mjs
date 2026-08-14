/**
 * Vera Extended - Fast checks + typecheck when type-surface files changed.
 * Usage: node scripts/vera-extended.mjs
 */
import { execSync } from 'child_process';

function getChangedFiles() {
  const commands = [
    'git diff --name-only --diff-filter=ACMRTUXB HEAD',
    'git diff --cached --name-only --diff-filter=ACMRTUXB',
  ];
  const files = new Set();
  for (const cmd of commands) {
    try {
      const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      for (const line of out.split('\n')) {
        const trimmed = line.trim();
        if (trimmed) files.add(trimmed);
      }
    } catch {}
  }
  return [...files];
}

// Run fast first
try {
  execSync('node scripts/vera-fast.mjs', { stdio: 'inherit', encoding: 'utf8' });
} catch {
  process.exit(1);
}

const files = getChangedFiles();
const hasTypeSurface = files.some(f =>
  f.endsWith('Types.ts') || f.includes('/api/') || f.includes('/store/') || f.includes('/types/')
);

if (hasTypeSurface) {
  console.log('🧪 Vera extended: type-surface changes detected - running tsc --noEmit');
  try {
    execSync('npx tsc --noEmit', { stdio: 'inherit', encoding: 'utf8' });
    console.log('✅ Vera extended: typecheck passed');
  } catch {
    console.log('❌ Vera extended: typecheck failed');
    process.exit(1);
  }
} else {
  console.log('🧪 Vera extended: no type-surface changes - skipped tsc');
}

console.log('🧪 Vera extended: done');
