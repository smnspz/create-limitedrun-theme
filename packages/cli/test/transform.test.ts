import { cpSync, mkdtempSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { applyTransforms } from '../src/assets/transform.js';
import { build } from '../src/commands/build.js';
import { createDevApp } from '../src/commands/dev.js';

const FIXTURE = path.join(
  fileURLToPath(new URL('.', import.meta.url)),
  '../fixtures/skeleton-theme',
);

const ctx = { themePath: '/theme', dir: 'stylesheets' };

describe('applyTransforms', () => {
  it('compiles .scss to plain .css', async () => {
    const out = await applyTransforms(
      Buffer.from('$c: red;\na { b { color: $c; } }'),
      'stylesheets/theme.scss',
      ctx,
    );
    expect(out?.name).toBe('theme.css');
    expect(out?.content.toString()).toContain('a b {');
  });

  it('skips Sass partials', async () => {
    const out = await applyTransforms(Buffer.from('$c: red;'), 'stylesheets/_vars.scss', ctx);
    expect(out).toBeNull();
  });

  it('transpiles .ts to type-free .js', async () => {
    const out = await applyTransforms(
      Buffer.from('const n: number = 1;\nexport const double = (x: number): number => x * 2;'),
      'javascripts/app.ts',
      { ...ctx, dir: 'javascripts' },
    );
    expect(out?.name).toBe('app.js');
    expect(out?.content.toString()).not.toContain(': number');
    expect(out?.content.toString()).toContain('x * 2');
  });

  it('skips .d.ts declaration files', async () => {
    const out = await applyTransforms(
      Buffer.from('export declare const x: number;'),
      'javascripts/types.d.ts',
      { ...ctx, dir: 'javascripts' },
    );
    expect(out).toBeNull();
  });

  it('passes raw .css and .js through unchanged', async () => {
    const out = await applyTransforms(Buffer.from('a{color:red}'), 'stylesheets/x.css', ctx);
    expect(out?.name).toBe('x.css');
    expect(out?.content.toString()).toBe('a{color:red}');
  });
});

/** Copy the skeleton fixture to a temp dir and drop in .scss/.ts sources. */
function themeWithPreprocessors(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'lr-pre-'));
  cpSync(FIXTURE, dir, { recursive: true });
  writeFileSync(path.join(dir, 'stylesheets/_vars.scss'), '$brand: #0a0;\n');
  writeFileSync(
    path.join(dir, 'stylesheets/theme.scss'),
    "@use 'vars';\n.brand { color: vars.$brand; }\n",
  );
  writeFileSync(
    path.join(dir, 'javascripts/app.ts'),
    'const greet = (who: string): string => `hi ${who}`;\nconsole.log(greet("world"));\n',
  );
  return dir;
}

describe('preprocessors end to end', () => {
  it('build emits compiled .css/.js and never ships the sources', async () => {
    const theme = themeWithPreprocessors();
    const out = mkdtempSync(path.join(tmpdir(), 'lr-pre-out-'));
    const result = await build(theme, out);
    const entries = Object.keys(unzipSync(new Uint8Array(await readFile(result.zipPath))));

    expect(entries).toContain('stylesheets/theme.css');
    expect(entries).toContain('javascripts/app.js');
    expect(entries.some((e) => e.endsWith('.scss') || e.endsWith('.ts'))).toBe(false);
  });

  it('dev server compiles .scss and .ts siblings on request', async () => {
    const app = createDevApp({ themePath: themeWithPreprocessors() }, new Set());

    const css = await app.request('/stylesheets/theme.css');
    expect(css.status).toBe(200);
    expect(await css.text()).toContain('color: #0a0;');

    const js = await app.request('/javascripts/app.js');
    expect(js.status).toBe(200);
    const body = await js.text();
    expect(body).not.toContain(': string');
    expect(body).toContain('`hi ${who}`');
  });
});
