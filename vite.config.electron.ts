import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { cspPlugin } from "./vite-plugin-csp";

// Vite config specifically for Electron builds
export default defineConfig(({ mode }) => {
  // Load env file based on mode (development, production, etc.)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Use relative paths for Electron
    base: './',

    server: {
      host: "0.0.0.0",
      port: 5173,
    },
    plugins: [
      react(),
      // CSP is managed by Electron's webPreferences, not meta tags
      // So we disable it for Electron builds
      cspPlugin({ enabled: false }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    // Define environment variables that will be embedded in the built code
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.0.0"),
      // Explicitly pass environment variables to client code
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_PUBLISHABLE_KEY),
      'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify(env.VITE_SUPABASE_PROJECT_ID),
      'import.meta.env.VITE_WEBHOOK_URL': JSON.stringify(env.VITE_WEBHOOK_URL),
    },

    build: {
      outDir: 'dist-electron',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000,
      minify: 'esbuild',
      sourcemap: false,
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
      // @ts-ignore
      esbuild: {
        drop: ['console', 'debugger'],
      },
    },
    publicDir: 'public',
  };
});