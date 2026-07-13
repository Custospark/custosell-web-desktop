import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'
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

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    stripCrossorigin(),
  ],
  // Dev/web deep links (`/@slug`) need absolute base. Electron packaged builds use relative `./`.
  base: command === 'serve' ? '/' : './',
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
