import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'callouts/*.wav'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,wav}'],
      },
      manifest: {
        name: 'Shofar Trainer',
        short_name: 'Shofar',
        description: 'Halachic shofar practice coach with audio timing analysis',
        theme_color: '#14110e',
        background_color: '#14110e',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
  },
});
