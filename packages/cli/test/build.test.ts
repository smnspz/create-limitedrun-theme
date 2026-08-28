import { mkdtempSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { build } from '../src/commands/build.js';

const THEME = path.join(fileURLToPath(new URL('.', import.meta.url)), '../fixtures/skeleton-theme');

describe('build', () => {
  it('produces an export-shaped zip and excludes the mock data', async () => {
    const out = mkdtempSync(path.join(tmpdir(), 'lr-build-'));
    const result = await build(THEME, out);

    expect(result.zipPath).toBe(path.join(out, 'skeleton-theme.zip'));
    const entries = Object.keys(unzipSync(new Uint8Array(await readFile(result.zipPath))));

    expect(entries).toContain('configs/default.json');
    expect(entries).toContain('layouts/default.html');
    expect(entries.some((e) => e.startsWith('templates/'))).toBe(true);
    expect(entries).toContain('stylesheets/default.css');
    expect(entries).toContain('javascripts/default.js');

    expect(entries).not.toContain('store.json');
    expect(entries).not.toContain('store.schema.json');
    expect(entries.some((e) => e.includes('node_modules'))).toBe(false);
  });

  it('rejects a theme with invalid store.json', async () => {
    const out = mkdtempSync(path.join(tmpdir(), 'lr-build-'));
    await expect(build(tmpdir(), out)).rejects.toThrow();
  });
});
