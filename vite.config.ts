import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

function stripCrossorigin(): Plugin {
  return {
    name: 'strip-crossorigin',
    transformIndexHtml(html) {
      return html.replace(/crossorigin\s*/g, '');
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    stripCrossorigin(),
  ],
  base: './',
  build: {
    outDir: 'dist/web',
    sourcemap: false,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-router-dom',
      '@tanstack/react-query', 'axios', 'lucide-react',
      'date-fns', 'framer-motion', 'recharts', 'clsx',
    ],
  },
})
