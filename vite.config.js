// vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/maps-api': {
        target: 'https://places.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/maps-api/, ''),
        secure: false,
      },
      '/maps-geocode': {
        target: 'https://maps.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/maps-geocode/, ''),
        secure: false,
      },
      '/routes-api': {
        target: 'https://routes.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/routes-api/, ''),
        secure: false,
      },
    },
  },
})