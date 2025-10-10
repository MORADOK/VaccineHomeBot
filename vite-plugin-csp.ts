import { Plugin } from 'vite';

export function cspPlugin(): Plugin {
  return {
    name: 'csp-plugin',
    transformIndexHtml(html, context) {
      // More permissive CSP for development, stricter for production
      const isDev = context.server !== undefined;
      
      const cspContent = isDev 
        ? "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; style-src * 'unsafe-inline' data: blob:; img-src * data: blob:; font-src * data:; connect-src * data: blob: ws: wss:; worker-src * blob: data:; object-src 'none';"
        : "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.line.me ws://localhost:* http://localhost:*; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; font-src 'self' data: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';";
      
      if (html.includes('Content-Security-Policy')) {
        // Replace existing CSP
        return html.replace(
          /<meta http-equiv="Content-Security-Policy"[^>]*>/,
          `<meta http-equiv="Content-Security-Policy" content="${cspContent}" />`
        );
      } else {
        // Add CSP after charset
        return html.replace(
          /<meta charset="UTF-8" \/>/,
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${cspContent}" />`
        );
      }
    }
  };
}