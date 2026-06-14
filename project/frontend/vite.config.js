import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    watch: {
      ignored: [
        '**/android/**',
        '**/dist/**',
        '**/node_modules/**',
        '**/.git/**',
        '**/.vscode/**',
      ]
    },
    hmr: {
      overlay: true,
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'leaflet',
      'react-leaflet',
      'lucide-react',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'canvas-confetti'
    ]
  }
})
