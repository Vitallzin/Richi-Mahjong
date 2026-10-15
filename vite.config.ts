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
        // Fontes japonesas vêm em ~100 subconjuntos por peso: precacheia só o latino; o resto é
        // guardado sob demanda (CacheFirst) quando o navegador pede.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,webm,mp3,wav,ttf}', '**/*latin*.woff2'],
        runtimeCaching: [
          {
            urlPattern: /\.woff2$/,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 400 } },
          },
        ],
        navigateFallback: '/index.html',
      },
    }),
  ],
});
