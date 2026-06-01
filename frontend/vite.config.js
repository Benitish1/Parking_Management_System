// vite.config.js — configuration for Vite, the dev server and build tool that
// bundles this React app. Vite reads this file on startup.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // The React plugin enables JSX transformation and fast hot-reload during development.
  plugins: [react()],
  server: {
    port: 5173, // local dev server runs at http://localhost:5173
    host: true, // listen on all network interfaces so other devices (or containers) can reach it
  },
});
