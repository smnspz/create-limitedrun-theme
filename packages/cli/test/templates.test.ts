import { cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ThemeRenderer } from '../src/renderer/engine.js';
import { resolveRoute } from '../src/renderer/routes.js';
import { loadStore } from '../src/store/load.js';

const TEMPLATES_ROOT = path.join(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../create-limitedrun-theme/templates',
);

const TEMPLATE_IDS = ['skeleton', 'telescope', 'hyde', 'binoculars', 'winter', 'winter-peak'];

const ROUTES = [
  '/',
  '/store',
  '/products/entangoed',
  '/artists/eliane',
  '/news',
  '/contact',
  '/gallery',
  '/history',
  '/events/eliane-old-first',
  '/maintenance',
];

/** Assemble a template + the shared store mock into a temp theme dir, like the scaffolder. */
function materialize(id: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), `lr-tpl-${id}-`));
  cpSync(path.join(TEMPLATES_ROOT, id), dir, { recursive: true });
  cpSync(path.join(TEMPLATES_ROOT, '_shared'), dir, { recursive: true });
  return dir;
}

describe('bundled starter templates', () => {
  for (const id of TEMPLATE_IDS) {
    it(`${id}: renders every route and its stylesheet`, async () => {
      const dir = materialize(id);
      const renderer = new ThemeRenderer(dir, { strict: false });
      const store = loadStore(dir);

      for (const p of ROUTES) {
        const [pathname, qs] = p.split('?');
        const match = resolveRoute(pathname as string, store, new URLSearchParams(qs));
        const html = match.bare
          ? await renderer.renderBare(match.template, match.assigns)
          : await renderer.renderPage(match.template, match.assigns);
        expect(html, `${id} ${p}`).toBeTruthy();
      }

      const css = await renderer.renderStylesheet('default.css');
      expect(css, `${id} default.css`).not.toContain('{%');
    });
  }
});
