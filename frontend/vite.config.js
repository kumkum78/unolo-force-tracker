import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    // Production build optimization
    target: 'es2015',
    minify: 'esbuild', // esbuild is faster than terser
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'axios-vendor': ['axios']
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Warn if chunks exceed 1MB
    reportCompressedSize: true,
    sourcemap: false // Disable sourcemaps for smaller build
  }
})
