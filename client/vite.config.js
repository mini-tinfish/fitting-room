
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'The Fitting Room',
        short_name: 'Fitting Room',
        description: 'Your closet. Your forecast. Your aesthetic.',
        theme_color: '#f6dce8',
        background_color: '#fff8fb',
        display: 'standalone',
        start_url: '/',
        

icons: [
  // Custom pixel-art cat mascot for The Fitting Room.
  {
    src: '/pwa-192x192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any'
  },
  {
    src: '/pwa-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any'
  }
]


      }
    })
  ]
})
