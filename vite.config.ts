import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/transaction-query': 'http://localhost:8000',
      '/transaction-chart': 'http://localhost:8000',
      '/transaction-email': 'http://localhost:8000',
      '/agent-orchestrator': 'http://localhost:8000',
      '/rag-retrieval': 'http://localhost:8000',
      '/web-search-tool': 'http://localhost:8000',
      '/openai-chat': 'http://localhost:8000',
      '/openai-session': 'http://localhost:8000',
    },
  },
});
