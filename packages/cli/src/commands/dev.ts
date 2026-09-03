import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { serve } from '@hono/node-server';
import chokidar from 'chokidar';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { applyTransforms } from '../assets/transform.js';
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

/**
 * Render a minimal HTML page describing a render failure, with the live-reload
 * client attached so the page refreshes once the theme is fixed.
 *
 * @param err - the error thrown while rendering
 * @returns a full HTML document
 */
function renderErrorPage(err: unknown): string {
  // Escape the message and drop it into a minimal page with live reload attached
  const message = err instanceof Error ? err.message : String(err);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Theme error</title></head>
<body style="font:14px/1.5 ui-monospace,monospace;padding:2rem;color:#b00">
<h1>Theme render error</h1><pre style="white-space:pre-wrap">${message.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] as string)}</pre>
${LIVERELOAD_SNIPPET}</body></html>`;
}

/**
 * Locate the source file behind a requested asset and, when it needs
 * compiling (`.scss` → `.css`, `.ts` → `.js`), run it through the transform
 * registry. Used by the dev server so a preview serves exactly what
 * `limitedrun build` would emit.
 *
 * @param themePath - absolute path to the theme root
 * @param dir - asset directory (`stylesheets` or `javascripts`)
 * @param file - the requested output file name, e.g. `theme.css`
 * @param sourceExt - the preprocessor extension to look for, e.g. `.scss`
 * @returns the compiled text, or `null` when no such source exists
 */
async function compileAssetSource(
  themePath: string,
  dir: string,
  file: string,
  sourceExt: string,
): Promise<string | null> {
  // Fall back to the source sibling only when no literal file is present
  if (existsSync(path.join(themePath, dir, file))) return null;
  const source = file.replace(/\.[^.]+$/, sourceExt);
  const abs = path.join(themePath, dir, source);
  if (!existsSync(abs)) return null;

  // Compile through the shared transform registry
  const out = await applyTransforms(await readFile(abs), path.join(dir, source), {
    themePath,
    dir,
  });
  return out ? out.content.toString('utf8') : null;
}

/**
 * Build the Hono app that serves a live preview of the theme: template routes,
 * Liquid-processed stylesheets, verbatim JavaScript, and an SSE endpoint that
 * pushes browser reloads.
 *
 * @param options - theme path and strictness
 * @param subscribers - shared set of reload callbacks; each open SSE connection
 *   adds its notifier here and removes it on disconnect, so the file watcher can
 *   broadcast a reload to every connected browser
 * @returns the configured Hono app (not yet listening)
 */
export function createDevApp(options: DevServerOptions, subscribers: Set<() => void>): Hono {
  const { themePath, strict } = options;
  const app = new Hono();

  // Stream reload events over SSE, one subscriber per open connection
  app.get('/__livereload', (c) =>
    streamSSE(c, async (stream) => {
      let open = true;
      const notify = () => stream.writeSSE({ data: 'reload' });

      // Register on connect, unregister on disconnect
      subscribers.add(notify);
      stream.onAbort(() => {
        open = false;
        subscribers.delete(notify);
      });

      // Hold the connection open
      while (open) await stream.sleep(30_000);
    }),
  );

  // Serve stylesheets: compile a .scss sibling, else Liquid-process the .css
  // (theme settings drive CSS values)
  app.get('/stylesheets/:file', async (c) => {
    const file = c.req.param('file');
    try {
      const compiled = await compileAssetSource(themePath, THEME_DIRS.stylesheets, file, '.scss');
      if (compiled) return c.body(compiled, 200, { 'content-type': MIME['.css'] as string });

      const renderer = new ThemeRenderer(themePath, { strict });
      const css = await renderer.renderStylesheet(file);
      return c.body(css, 200, { 'content-type': MIME['.css'] as string });
    } catch (err) {
      return c.text(err instanceof Error ? err.message : String(err), 500);
    }
  });

  // Serve JavaScript: transpile a .ts sibling, else serve the .js verbatim
  app.get('/javascripts/:file', async (c) => {
    const file = c.req.param('file');
    try {
      const compiled = await compileAssetSource(themePath, THEME_DIRS.javascripts, file, '.ts');
      const body = compiled ?? (await readFile(path.join(themePath, THEME_DIRS.javascripts, file)));
      return c.body(body, 200, {
        'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
      });
    } catch {
      return c.text('Not found', 404);
    }
  });

  // Route everything else to a template
  app.get('/*', async (c) => {
    const renderer = new ThemeRenderer(themePath, { strict });
    try {
      // Resolve the path against the route table and render it
      const store = loadStore(themePath);
      const url = new URL(c.req.url);
      const match = resolveRoute(url.pathname, store, url.searchParams);
      const html = match.bare
        ? await renderer.renderBare(match.template, match.assigns)
        : await renderer.renderPage(match.template, match.assigns);

      // Inject the live-reload client and respond
      const withReload = html.includes('</body>')
        ? html.replace('</body>', `${LIVERELOAD_SNIPPET}</body>`)
        : html + LIVERELOAD_SNIPPET;
      return c.body(withReload, (match.status ?? 200) as 200, {
        'content-type': 'text/html; charset=utf-8',
      });
    } catch (err) {
      // Show the error in the browser instead of a blank 500
      return c.body(renderErrorPage(err), 500, { 'content-type': 'text/html; charset=utf-8' });
    }
  });

  return app;
}

/**
 * Start the dev server: HTTP preview plus a chokidar watcher on the theme
 * directory that broadcasts a reload to every connected browser on any change.
 *
 * @param options - theme path, strictness, and the port to listen on
 * @returns an async function that stops the watcher and the HTTP server
 */
export async function runDev(
  options: DevServerOptions & { port: number },
): Promise<() => Promise<void>> {
  // Build the app and the shared reload-subscriber set
  const subscribers = new Set<() => void>();
  const app = createDevApp(options, subscribers);

  // Watch the theme and broadcast a reload on any change
  const watcher = chokidar.watch(options.themePath, {
    ignoreInitial: true,
    ignored: (p) => /node_modules|[/\\]dist[/\\]|\.git[/\\]/.test(p),
  });
  watcher.on('all', () => {
    for (const notify of subscribers) notify();
  });

  // Start listening; on EADDRINUSE, rotate to the next port
  const server = await listenWithRotation(app.fetch, options.port);

  // Return a function that stops the watcher and the server
  return async () => {
    await watcher.close();
    server.close();
  };
}

/**
 * Start the Hono server, rotating to the next port if the requested one is in use.
 *
 * @param fetch - Hono app fetch handler.
 * @param startPort - Preferred port to try first.
 * @param maxAttempts - How many consecutive ports to try before giving up.
 * @returns The listening server instance bound to the first free port.
 * @throws {Error} If no free port is found within `maxAttempts`.
 */
async function listenWithRotation(
  fetch: Hono['fetch'],
  startPort: number,
  maxAttempts = 20,
): Promise<ReturnType<typeof serve>> {
  // Try each port in the range until one binds successfully
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;

    try {
      // Bind a listening server to the current port
      const server = await new Promise<ReturnType<typeof serve>>((resolve, reject) => {
        const s = serve({ fetch, port }, () => resolve(s));
        s.once('error', reject);
      });

      // Announce the listening URL
      process.stdout.write(`\n  limitedrun dev  →  http://localhost:${port}\n\n`);

      // Return the running server
      return server;
    } catch (err) {
      // Rethrow anything that isn't a port-in-use error
      if ((err as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw err;

      // else

      // Log the rotation to the next port
      process.stdout.write(`  port ${port} in use, trying ${port + 1}…\n`);
    }
  }

  // Fail after exhausting the range
  throw new Error(`no free port in range ${startPort}-${startPort + maxAttempts - 1}`);
}
