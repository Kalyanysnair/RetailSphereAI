import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (_err, _req, res) => {
            // Gracefully handle backend connection failures without polluting terminal with ECONNREFUSED
            if (res && !('headersSent' in res && res.headersSent) && typeof (res as any).writeHead === 'function') {
              (res as any).writeHead(503, {
                'Content-Type': 'application/json',
              });
              (res as any).end(JSON.stringify({ 
                error: 'Backend service unavailable. Please ensure FastAPI server is running on http://127.0.0.1:8000.' 
              }));
            }
          });
        },
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (_err, _req, res) => {
            if (res && !('headersSent' in res && res.headersSent) && typeof (res as any).writeHead === 'function') {
              (res as any).writeHead(503);
              (res as any).end();
            }
          });
        },
      },
    },
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-maps': ['leaflet'],
        },
      },
    },
  },
});

