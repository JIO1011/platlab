import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// En desarrollo y en la vista previa, /v1 va a la API local: mismo origen, sin CORS (02 §10).
const api = { '/v1': { target: process.env['PLATLAB_API_URL'] ?? 'http://127.0.0.1:3000', changeOrigin: true } };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true, proxy: api },
  preview: { port: 4173, strictPort: true, proxy: api },
});
