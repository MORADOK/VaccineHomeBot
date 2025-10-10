import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { addElectronCSP } from "./vite-plugin-csp";

// Vite config specifically for Electron builds
export default defineConfig({
  // Use relative paths for Electron
  base: './',
  
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  plugins: [
    react(),
    addElectronCSP(), // Add Electron-friendly CSP
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist-electron',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          'query-vendor': ['@tanstack/react-query'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'chart-vendor': ['recharts'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'icons-vendor': ['lucide-react'],
        },
      },
    },
  },
  publicDir: 'public',
});