import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ThemeRenderer } from '../src/renderer/engine.js';
import { resolveRoute } from '../src/renderer/routes.js';
import { loadStore } from '../src/store/load.js';

const THEME = path.join(fileURLToPath(new URL('.', import.meta.url)), '../fixtures/skeleton-theme');

describe('ThemeRenderer against the skeleton fixture', () => {
  const renderer = new ThemeRenderer(THEME);
  const store = loadStore(THEME);

  async function renderPath(pathname: string) {
    const match = resolveRoute(pathname, store, new URLSearchParams());
    return match.bare
      ? renderer.renderBare(match.template, match.assigns)
      : renderer.renderPage(match.template, match.assigns);
  }

  it('renders the home page with the store name as title', async () => {
    const html = await renderPath('/');
    expect(html).toContain('<title>');
    expect(html).toContain('Pinna Records');
  });

  it('renders the product grid on the home page', async () => {
    const html = await renderPath('/');
    const products = html.match(/<div class="product">/g) ?? [];
    expect(products.length).toBe(2);
    expect(html).toContain('Eliane Lust - Entangoed');
  });

  it('renders every wired route without throwing', async () => {
    for (const p of [
      '/',
      '/news',
      '/news/posts/patterns-of-plants',
      '/store',
      '/categories/all',
      '/products/entangoed',
      '/artists',
      '/artists/eliane',
      '/artists/eliane/products',
      '/contact',
      '/search?q=eliane',
      '/events',
      '/events/eliane-old-first',
      '/gallery',
      '/history',
      '/maintenance',
      '/orders/1001',
    ]) {
      const [pathname, qs] = p.split('?');
      const match = resolveRoute(pathname as string, store, new URLSearchParams(qs));
      const html = match.bare
        ? await renderer.renderBare(match.template, match.assigns)
        : await renderer.renderPage(match.template, match.assigns);
      expect(html, `route ${p}`).toBeTruthy();
    }
  });

  it('renders an unknown path as 404', async () => {
    const match = resolveRoute('/nope', store);
    expect(match.status).toBe(404);
    expect(match.template).toBe('404.html');
  });

  it('processes stylesheets through Liquid', async () => {
    const css = await renderer.renderStylesheet('default.css');
    expect(css).toContain(
      '#container #main #content .roster-item #product-grid, #container #main #content .roster-item #history',
    );
    expect(css).not.toContain('{% assign');
  });
});

describe('store.json validation', () => {
  it('rejects invalid data with a readable error', () => {
    expect(() => loadStore('/does/not/exist')).toThrow(/store\.json not found/);
  });
});
