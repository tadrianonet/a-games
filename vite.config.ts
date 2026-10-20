import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({
 base: './',
 plugins: [react(), VitePWA({
  registerType: 'prompt', includeAssets: ['*.svg', '*.png'],
  workbox: { globPatterns: ['**/*.{js,css,html,png,svg}'], maximumFileSizeToCacheInBytes: 4000000 },
  manifest: { name: 'Agnes e o Reino das Estrelas', short_name: 'Agnes', description: 'Uma aventura mágica de plataformas feita para Agnes.', lang: 'pt-BR', start_url: './', scope: './', display: 'standalone', orientation: 'landscape', background_color: '#141637', theme_color: '#141637', icons: [{src:'icon-192.png',sizes:'192x192',type:'image/png'},{src:'icon-512.png',sizes:'512x512',type:'image/png'},{src:'icon-maskable.png',sizes:'512x512',type:'image/png',purpose:'maskable'}] }
 })], build: { rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } }, chunkSizeWarningLimit: 1600 }
})
