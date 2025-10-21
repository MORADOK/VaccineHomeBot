import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { cspPlugin } from "./vite-plugin-csp";

/** Copy dist/index.html -> dist/404.html after build (GitHub Pages SPA deep-link fix) */
function ghPages404Plugin() {
  return {
    name: "gh-pages-404",
    closeBundle() {
      const src = path.resolve(__dirname, "dist/index.html");
      const dst = path.resolve(__dirname, "dist/404.html");
      if (fs.existsSync(src)) fs.copyFileSync(src, dst);
    },
  };
}

/** CSP policy helper (loosen a bit in dev to support Vite/React refresh) */
function buildCspPolicy(isDev: boolean) {
  return {
    "default-src": ["'self'"],
    // Vite dev uses eval for HMR; enable only in dev
    "script-src": ["'self'", ...(isDev ? ["'unsafe-eval'"] : [])],
    // Radix UI / shadcn บางจุดใช้ inline styles
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    // Supabase REST/WebSocket
    "connect-src": [
      "'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://*.supabase.in",
      "wss://*.supabase.in",
    ],
    // กันถูกฝังใน iframe (ถ้าต้องการให้ฝังเปลี่ยนเป็น 'self')
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    // เพิ่มได้หากต้องการ: "upgrade-insecure-requests": []
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const isProd = mode === "production";
  const isDev = command === "serve";

  return {
    // GitHub Pages base path (ให้ตรงกับชื่อ repo)
    base: isProd ? "/VaccineHomeBot/" : "/",

    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
    },

    preview: {
      port: 4173,
      strictPort: true,
    },

    plugins: [
      react(),
      cspPlugin(),
      ghPages404Plugin(),
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    build: {
      outDir: "dist",
      // คงไว้ตามเดิมเพื่อลดปัญหาไฟล์ล็อกบน Windows; ถ้าต้องการล้างทุกครั้งให้เปลี่ยนเป็น true
      emptyOutDir: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
        },
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "ui-vendor": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-select",
              "@radix-ui/react-tabs",
            ],
            "query-vendor": ["@tanstack/react-query"],
            "supabase-vendor": ["@supabase/supabase-js"],
            "chart-vendor": ["recharts"],
            "form-vendor": ["react-hook-form", "@hookform/resolvers", "zod"],
            "icons-vendor": ["lucide-react"],
          },
        },
      },
      // ลดขนาด production build (ตัด console/debugger ออก)
      // terser ไม่จำเป็น เพราะ Vite ใช้ esbuild
      minify: isProd ? "esbuild" : false,
      // @ts-ignore
      esbuild: {
        drop: isProd ? ["console", "debugger"] : [],
      },
    },

    publicDir: "public",
  };
});
