import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createDevApp } from '../src/commands/dev.js';

const THEME = path.join(fileURLToPath(new URL('.', import.meta.url)), '../fixtures/skeleton-theme');

// Ports the original gem's three feature specs to the HTTP layer.
describe('dev server preview (skeleton theme)', () => {
  const app = createDevApp({ themePath: THEME }, new Set());

  it('renders a CSS file through Liquid', async () => {
    const res = await app.request('/stylesheets/default.css');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/css');
    const body = await res.text();
    expect(body).toContain(
      '#container #main #content .roster-item #product-grid, #container #main #content .roster-item #history',
    );
  });

  it('renders the home page with the correct title', async () => {
    const res = await app.request('/');
    const body = await res.text();
    expect(body).toMatch(/<title>[\s\S]*Pinna Records[\s\S]*<\/title>/);
  });

  it('renders products on the home page', async () => {
    const res = await app.request('/');
    const body = await res.text();
    expect((body.match(/<div class="product">/g) ?? []).length).toBe(2);
    expect(body).toContain('Eliane Lust - Entangoed');
  });

  it('injects the live-reload client', async () => {
    const res = await app.request('/');
    expect(await res.text()).toContain("EventSource('/__livereload')");
  });

  it('serves 404 for an unknown path', async () => {
    const res = await app.request('/no-such-page');
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('Page Not Found');
  });
});
