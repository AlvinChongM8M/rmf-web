import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    proxy: {
      '/tus-service': {
        target: 'http://localhost:10021',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/tus-service/, ''),
      },
      '/task-orchestrator-service': {
        target: 'http://localhost:10022',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/task-orchestrator-service/, ''),
      },
    },
  },
});
