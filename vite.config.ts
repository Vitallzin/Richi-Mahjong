import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Porta fixa: localhost:3000 é o domínio autorizado no Firebase Auth e na restrição da chave.
const PORT = 3000;

export default defineConfig({
  server: { port: PORT, strictPort: true },
  preview: { port: PORT, strictPort: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registro do service worker sem bloquear a primeira pintura.
      injectRegister: 'script-defer',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Riichi Mahjong',
        short_name: 'Mahjong',
        description: 'Riichi Mahjong em português, com guia opcional para iniciantes.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#16112a',
        theme_color: '#2a2145',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Só as fatias de fonte usadas vão para o build (npm run fonts): todas cabem no precache,
        // e o jogo funciona offline desde a primeira visita.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,webm,mp3,wav,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\.woff2$/,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 400 } },
          },
        ],
        navigateFallback: '/index.html',
        // /__/auth/* e /__/firebase/* são do Firebase (login): nunca responder com o app.
        navigateFallbackDenylist: [/^\/__\//],
      },
    }),
  ],
});
