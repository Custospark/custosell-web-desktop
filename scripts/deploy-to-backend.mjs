#!/usr/bin/env node
/**
 * Alternative deploy — build the web frontend and drop it into the Laravel
 * backend's public folder so a single `git pull` on the server ships both.
 *
 *   staging    → Backend/public/staging   (build --mode staging, .env.staging API)
 *   production → Backend/public/production (build mode production, base .env API)
 *
 * The asset base is relative (./) so the app works whether the server serves
 * the folder at /staging, /production, or a subdomain pointing directly at it.
 *
 * Usage:
 *   npm run deploy:web:staging
 *   npm run deploy:web:production
 */
import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(__dirname, '..');
const BACKEND_PUBLIC = resolve(FRONTEND_ROOT, '..', 'Backend', 'public');
const DIST = resolve(FRONTEND_ROOT, 'dist', 'web');

const target = process.argv[2];

if (target !== 'staging' && target !== 'production') {
  console.error('Usage: node scripts/deploy-to-backend.mjs <staging|production>');
  process.exit(1);
}

console.log(`\n🚀 Deploying web build → Backend/public/${target}\n`);

// 1. Clean stale dist so old hashed chunks never linger.
execSync('npx rimraf dist/web', { cwd: FRONTEND_ROOT, stdio: 'inherit' });

// 2. Build. Relative asset base keeps it path-agnostic; staging uses .env.staging.
const mode = target === 'staging' ? '--mode staging' : '';
execSync(`tsc -b && cross-env VITE_ASSET_BASE=./ vite build ${mode}`, {
  cwd: FRONTEND_ROOT,
  stdio: 'inherit',
});

if (!existsSync(DIST)) {
  console.error('Build did not produce dist/web — aborting copy.');
  process.exit(1);
}

// 3. Replace the backend target folder with the fresh build.
const dest = resolve(BACKEND_PUBLIC, target);
if (existsSync(dest)) {
  rmSync(dest, { recursive: true, force: true });
}
mkdirSync(dest, { recursive: true });
cpSync(DIST, dest, { recursive: true });

console.log(`\n✅ Web build copied to Backend/public/${target}`);
console.log(`   Commit + push the backend, then on the server:\n`);
console.log(`   git pull origin main`);
console.log(`   # app served at /${target} (or your subdomain → this folder)\n`);
