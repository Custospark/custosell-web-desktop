/**
 * Vera Fast - ESLint on changed .ts/.tsx + Vera Logic (repo rules/contracts).
 * Usage: node scripts/vera-fast.mjs
 */
import { execSync } from 'child_process';

function getChangedFiles() {
  const commands = [
    'git diff --name-only --diff-filter=ACMRTUXB HEAD',
    'git diff --cached --name-only --diff-filter=ACMRTUXB',
    // Untracked new files (otherwise Vite/import breaks miss Vera)
    'git ls-files --others --exclude-standard',
  ];
  const files = new Set();
  for (const cmd of commands) {
    try {
      const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      for (const line of out.split('\n')) {
        const trimmed = line.trim().replace(/\\/g, '/');
        if (trimmed && (trimmed.endsWith('.ts') || trimmed.endsWith('.tsx'))) {
          files.add(trimmed);
        }
      }
    } catch {
      // ignore
    }
  }
  return [...files];
}

let failed = false;

const files = getChangedFiles();

if (files.length === 0) {
  console.log('🧪 Vera fast: no changed TS/TSX files - eslint skipped.');
} else {
  console.log(`🧪 Vera fast: eslint on ${files.length} file(s)`);
  try {
    execSync(`npx eslint --no-warn-ignored ${files.join(' ')}`, {
      stdio: 'inherit',
      encoding: 'utf8',
    });
    console.log('✅ Vera fast: eslint passed');
  } catch {
    console.log('❌ Vera fast: eslint failed');
    failed = true;
  }
}

try {
  execSync('node scripts/vera-logic.mjs', {
    stdio: 'inherit',
    encoding: 'utf8',
  });
} catch {
  failed = true;
}

if (failed) {
  console.log('❌ Vera fast: failed');
  process.exit(1);
}

console.log('✅ Vera fast: passed (eslint + logic)');
process.exit(0);
