import path from 'node:path'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['clothepickr-icon.svg'],
    manifest: {
      name: 'ClothePickr',
      short_name: 'ClothePickr',
      description: 'Mobile-ready wardrobe manager with offline support.',
      theme_color: '#047857',
      background_color: '#f8fafc',
      display: 'standalone',
      start_url: '/',
      scope: '/',
      icons: [
        {
          src: '/clothepickr-icon.svg',
          sizes: '192x192',
          type: 'image/svg+xml',
          purpose: 'any',
        },
        {
          src: '/clothepickr-icon.svg',
          sizes: '512x512',
          type: 'image/svg+xml',
          purpose: 'any',
        },
      ],
    },
  }), cloudflare()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts', 'src/features/**/*.tsx'],
    },
  },
})