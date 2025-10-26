// vite.config.electron.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { cspPlugin } from "./vite-plugin-csp";

export default defineConfig(({ mode }) => {
  // โหลดเฉพาะตัวแปรที่ขึ้นต้น VITE_
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    base: './',
    server: {
      host: "0.0.0.0",
      port: 5173
    },
    plugins: [
      react(),
      // CSP ฝั่ง Electron ใช้ webPreferences ดูแลแล้ว ปิดปลั๊กอินฝั่ง HTML ไป
      cspPlugin({ enabled: false })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      }
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.0.0"),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
      'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify(env.VITE_SUPABASE_PROJECT_ID || ''),
      'import.meta.env.VITE_WEBHOOK_URL': JSON.stringify(env.VITE_WEBHOOK_URL || '')
    },
    build: {
      outDir: 'dist-electron',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000,
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html')
        },
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs'],
            'query-vendor': ['@tanstack/react-query'],
            'supabase-vendor': ['@supabase/supabase-js'],
            'chart-vendor': ['recharts'],
            'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
            'icons-vendor': ['lucide-react']
          }
        }
      },
      // ลบ console/debugger เฉพาะเรนเดอเรอร์
      esbuild: { drop: ['console', 'debugger'] }
    },
    publicDir: 'public'
  };
});
