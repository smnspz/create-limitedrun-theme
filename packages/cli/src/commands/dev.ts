import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { serve } from '@hono/node-server';
import chokidar from 'chokidar';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { THEME_DIRS } from '../renderer/assigns.js';
import { ThemeRenderer } from '../renderer/engine.js';
import { resolveRoute } from '../renderer/routes.js';
import { loadStore } from '../store/load.js';

/** Options for the local dev server. */
export interface DevServerOptions {
  /** Absolute path to the theme root. */
  themePath: string;
  /** Fail on undefined variables/filters instead of rendering them empty. */
  strict?: boolean;
}

const MIME: Record<string, string> = {
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

// Injected into every HTML response so the browser reloads when a file changes.
const LIVERELOAD_SNIPPET = `<script>
(function(){
  var es = new EventSource('/__livereload');
  es.onmessage = function(){ location.reload(); };
  es.onerror = function(){ es.close(); setTimeout(function(){ location.reload(); }, 1000); };
})();
</script>`;

function renderErrorPage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Theme error</title></head>
<body style="font:14px/1.5 ui-monospace,monospace;padding:2rem;color:#b00">
<h1>Theme render error</h1><pre style="white-space:pre-wrap">${message.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] as string)}</pre>
${LIVERELOAD_SNIPPET}</body></html>`;
}

/**
 * Build the Hono app that serves a live preview of the theme.
 * @param options - theme path and strictness
 * @param onClient - registers an SSE reload channel; returns an unsubscribe fn
 */
export function createDevApp(options: DevServerOptions, subscribers: Set<() => void>): Hono {
  const { themePath, strict } = options;
  const app = new Hono();

  // Server-sent events channel the file watcher pushes reloads to.
  app.get('/__livereload', (c) =>
    streamSSE(c, async (stream) => {
      let open = true;
      const notify = () => stream.writeSSE({ data: 'reload' });
      subscribers.add(notify);
      stream.onAbort(() => {
        open = false;
        subscribers.delete(notify);
      });
      while (open) await stream.sleep(30_000);
    }),
  );

  // Stylesheets are rendered through Liquid (theme settings drive CSS values).
  app.get('/stylesheets/:file', async (c) => {
    const renderer = new ThemeRenderer(themePath, { strict });
    try {
      const css = await renderer.renderStylesheet(c.req.param('file'));
      return c.body(css, 200, { 'content-type': MIME['.css'] as string });
    } catch (err) {
      return c.text(err instanceof Error ? err.message : String(err), 500);
    }
  });

  // JavaScript is served verbatim.
  app.get('/javascripts/:file', async (c) => {
    const file = c.req.param('file');
    try {
      const body = await readFile(path.join(themePath, THEME_DIRS.javascripts, file));
      return c.body(body, 200, {
        'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
      });
    } catch {
      return c.text('Not found', 404);
    }
  });

  // Everything else routes to a template.
  app.get('/*', async (c) => {
    const renderer = new ThemeRenderer(themePath, { strict });
    try {
      const store = loadStore(themePath);
      const url = new URL(c.req.url);
      const match = resolveRoute(url.pathname, store, url.searchParams);
      const html = match.bare
        ? await renderer.renderBare(match.template, match.assigns)
        : await renderer.renderPage(match.template, match.assigns);
      const withReload = html.includes('</body>')
        ? html.replace('</body>', `${LIVERELOAD_SNIPPET}</body>`)
        : html + LIVERELOAD_SNIPPET;
      return c.body(withReload, (match.status ?? 200) as 200, {
        'content-type': 'text/html; charset=utf-8',
      });
    } catch (err) {
      return c.body(renderErrorPage(err), 500, { 'content-type': 'text/html; charset=utf-8' });
    }
  });

  return app;
}

/**
 * Start the dev server: HTTP preview + file watcher wired to live reload.
 * @returns a function that stops the server and watcher
 */
export async function runDev(
  options: DevServerOptions & { port: number },
): Promise<() => Promise<void>> {
  const subscribers = new Set<() => void>();
  const app = createDevApp(options, subscribers);

  // Watch the theme source and broadcast a reload on any change.
  const watcher = chokidar.watch(options.themePath, {
    ignoreInitial: true,
    ignored: (p) => /node_modules|[/\\]dist[/\\]|\.git[/\\]/.test(p),
  });
  watcher.on('all', () => {
    for (const notify of subscribers) notify();
  });

  const server = serve({ fetch: app.fetch, port: options.port });
  process.stdout.write(`\n  limitedrun dev  →  http://localhost:${options.port}\n\n`);

  return async () => {
    await watcher.close();
    server.close();
  };
}
