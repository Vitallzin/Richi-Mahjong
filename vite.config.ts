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
        // Fora do precache (baixados só por quem usa, e guardados na primeira vez): os sons (só na
        // partida) e o Firebase (só para quem entra na conta). A primeira visita no celular baixa
        // ~1,6 MB a menos.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        globIgnores: ['**/assets/firebase-*.js'],
        runtimeCaching: [
          {
            urlPattern: /\.woff2$/,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 400 } },
          },
          {
            urlPattern: /\/sounds\/.+\.mp3$/,
            handler: 'CacheFirst',
            // Se o navegador pedir um trecho (Range), responde a partir do arquivo inteiro guardado.
            options: {
              cacheName: 'sounds',
              expiration: { maxEntries: 40 },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
          {
            // Nome com hash: o conteúdo de uma URL nunca muda.
            urlPattern: /\/assets\/firebase-[\w-]+\.js$/,
            handler: 'CacheFirst',
            options: { cacheName: 'firebase', expiration: { maxEntries: 4 } },
          },
        ],
        navigateFallback: '/index.html',
        // /__/auth/* e /__/firebase/* são do Firebase (login): nunca responder com o app.
        navigateFallbackDenylist: [/^\/__\//],
      },
    }),
  ],
});
