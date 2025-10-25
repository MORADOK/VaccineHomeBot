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
    "script-src": ["'self'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://*.supabase.in",
      "wss://*.supabase.in",
      "https://api.line.me"
    ],
    // Note: frame-ancestors removed - only works in HTTP headers, not meta tags
    "form-action": ["'self'"],
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const isDev = command === "serve";
  const isTauri = mode === "tauri";              // tauri build runs: vite build --mode tauri
  const isGitHubPages = mode === "github-pages"; // GitHub Pages build
  const isProdWeb = mode === "production";       // Web server deployment (Vercel/Netlify/Railway)

  return {
    // base path per target
    // - Tauri: "./" (relative paths for local files)
    // - GitHub Pages: "/VaccineHomeBot/" (subdirectory deployment)
    // - Web Server (default production): "/" (root deployment)
    base: isTauri ? "./" : (isGitHubPages ? "/VaccineHomeBot/" : "/"),

    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: true,
    },

    preview: {
      port: 4173,
      strictPort: true,
    },

    plugins: [
      react(),
      // ใช้ CSP meta เฉพาะงานเว็บ (dev/prod). สำหรับ Tauri ไปคุมใน tauri.conf.json
      cspPlugin({
        enabled: !isTauri,
        policy: buildCspPolicy(isDev),
      }),
      ghPages404Plugin(),
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    css: {
      devSourcemap: isDev,
    },

    build: {
      outDir: "dist",
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000,
      target: ["es2021", "chrome105", "safari13"], // เหมาะกับ Tauri/WebView2
      minify: (isProdWeb || isGitHubPages || isTauri) ? "esbuild" : false,
      sourcemap: isDev ? "inline" : false,
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
      // @ts-ignore
      esbuild: {
        drop: (isProdWeb || isGitHubPages || isTauri) ? ["console", "debugger"] : [],
      },
    },

    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.0.0"),
    },

    publicDir: "public",
  };
});
