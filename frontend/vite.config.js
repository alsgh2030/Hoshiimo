import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: ['terminal.local'],
    proxy: { '/api': { target: 'http://127.0.0.1:8081', changeOrigin: true } },
  },
});
