/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local'),
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/types/**',
        'src/vite-env.d.ts',
        'src/main.tsx',
        'src/components/icons/**',
        'src/components/CustomProductIcons.tsx',
        'src/lib/catalogPtBr.ts',
        'src/**/__tests__/**',
      ],
      thresholds: {
        lines: 50,
        statements: 48,
        functions: 46,
        branches: 44,
        'src/db/**': {
          lines: 60,
          statements: 58,
          functions: 65,
          branches: 48,
        },
        'src/lib/**': {
          lines: 64,
          statements: 62,
          functions: 62,
          branches: 58,
        },
        'src/hooks/**': {
          lines: 75,
          statements: 72,
          functions: 75,
          branches: 60,
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[/\\]node_modules[/\\](react|react-dom|scheduler)[/\\]/.test(id)) {
            return 'vendor-react';
          }
          if (id.includes('@supabase/')) {
            return 'vendor-supabase';
          }
          if (id.includes('dexie')) {
            return 'vendor-db';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-ui';
          }
          return undefined;
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'favicon.svg',
        'theme-init.js',
        'icons/icon-192.svg',
        'icons/icon-512.svg',
        'icons/maskable-icon.svg',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/maskable-icon-512.png',
        'icons/apple-touch-icon.png',
      ],
      manifest: {
        name: 'PegaLá — Lista Rápida de Compras',
        short_name: 'PegaLá',
        description: 'Lista ultra-rápida para mercado e farmácia, offline-first e compartilhável em tempo real.',
        theme_color: '#10b981',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons/maskable-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Lista de Mercado',
            short_name: 'Mercado',
            description: 'Abrir diretamente sua lista de mercado',
            url: '/?list=mercado',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Lista de Farmácia',
            short_name: 'Farmácia',
            description: 'Abrir diretamente sua lista de farmácia',
            url: '/?list=farmacia',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
});
