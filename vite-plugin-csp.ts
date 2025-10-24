import { Plugin } from 'vite';

interface CspPluginOptions {
  enabled?: boolean;
  policy?: Record<string, string[]>;
}

function buildCspString(policy: Record<string, string[]>): string {
  return Object.entries(policy)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ') + ';';
}

export function cspPlugin(options: CspPluginOptions = {}): Plugin {
  const { enabled = true, policy } = options;

  return {
    name: 'csp-plugin',
    transformIndexHtml(html, context) {
      if (!enabled) return html;

      const isDev = context.server !== undefined;
      
      let cspContent: string;
      if (policy) {
        cspContent = buildCspString(policy);
      } else {
        cspContent = isDev
          ? "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; style-src * 'unsafe-inline' data: blob:; img-src * data: blob:; font-src * data:; connect-src * data: blob: ws: wss:; worker-src * blob: data:; object-src 'none';"
          : "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.line.me ws://localhost:* http://localhost:*; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; font-src 'self' data: https:; base-uri 'self'; form-action 'self'; object-src 'none';";
      }
      
      if (html.includes('Content-Security-Policy')) {
        return html.replace(
          /<meta http-equiv="Content-Security-Policy"[^>]*>/,
          `<meta http-equiv="Content-Security-Policy" content="${cspContent}" />`
        );
      } else {
        return html.replace(
          /<meta charset="UTF-8" \/>/,
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${cspContent}" />`
        );
      }
    }
  };
}