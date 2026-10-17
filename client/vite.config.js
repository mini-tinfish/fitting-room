
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
  // TODO: Replace this placeholder with custom Procreate pixel-art icons.
  // Export final PNG icons at 192x192 and 512x512.
  {
    src: '/icons.svg',
    sizes: 'any',
    type: 'image/svg+xml',
    purpose: 'any'
  }
]

      }
    })
  ]
})
