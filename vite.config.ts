import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import type { Plugin } from 'vite'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))
const appVersion = pkg.version

function stripCrossorigin(): Plugin {
  return {
    name: 'strip-crossorigin',
    transformIndexHtml(html) {
      return html.replace(/crossorigin\s*/g, '');
    },
  };
}

/**
 * Stamp a unique cache version into the built service worker on every build.
 * sw.js uses cache-first for JS/CSS, so a hardcoded version keeps stale chunks
 * in the browser forever — mixing old and new builds breaks chunk imports
 * ("does not provide an export named 't'"). A fresh version per build makes the
 * SW activate handler delete the old static cache on the next load.
 */
function stampServiceWorkerVersion(): Plugin {
  return {
    name: 'stamp-sw-version',
    apply: 'build',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist', 'web', 'sw.js');
      try {
        const sw = readFileSync(swPath, 'utf-8');
        const version = `${appVersion}-${Date.now()}`;
        const next = sw.replace(/CACHE_VERSION\s*=\s*'[^']*'/, `CACHE_VERSION = 'v${version}'`);
        if (next !== sw) {
          writeFileSync(swPath, next);
        }
      } catch {
        // sw.js is optional (Electron builds); skip when absent.
      }
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    stripCrossorigin(),
    stampServiceWorkerVersion(),
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
