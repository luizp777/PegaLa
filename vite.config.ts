import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
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
      },
    }),
  ],
});
