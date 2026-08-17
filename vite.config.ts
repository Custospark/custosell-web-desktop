import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import type { Plugin } from 'vite'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))
const appVersion = pkg.version

function gitShortHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: __dirname, encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
}

function stripCrossorigin(): Plugin {
  return {
    name: 'strip-crossorigin',
    transformIndexHtml(html) {
      return html.replace(/crossorigin\s*/g, '');
    },
  };
}

/**
 * Version the service worker cache per build. sw.js is served from the static
 * `public/` dir, so without this its bytes are identical on every deploy - the
 * browser never reinstalls the worker and keeps serving stale cached
 * index.html/old asset names (classic text/html MIME failures after a deploy).
 * We stamp CACHE_VERSION with the app version + git hash at build time, so each
 * build's sw.js differs, forcing an install + activate that purges old caches.
 */
function versionServiceWorker(): Plugin {
  const stamp = `v${appVersion}-${gitShortHash()}`;
  return {
    name: 'version-service-worker',
    apply: 'build',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist/web/sw.js');
      if (!existsSync(swPath)) return;
      const source = readFileSync(swPath, 'utf8');
      const patched = source.replace("CACHE_VERSION = 'v1'", `CACHE_VERSION = '${stamp}'`);
      if (patched !== source) {
        writeFileSync(swPath, patched, 'utf8');
      }
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    stripCrossorigin(),
    versionServiceWorker(),
  ],
  // Dev needs absolute base (`/`). Electron packaged builds use relative (`./`).
  // For web deployments on sub‑routes, set VITE_ASSET_BASE=/ in CI.
  base: command === 'serve' ? '/' : (process.env.VITE_ASSET_BASE || './'),
  build: {
    outDir: 'dist/web',
    sourcemap: false,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-router-dom',
      '@tanstack/react-query', 'axios', 'lucide-react',
      'date-fns', 'framer-motion', 'recharts', 'clsx',
    ],
  },
}))
