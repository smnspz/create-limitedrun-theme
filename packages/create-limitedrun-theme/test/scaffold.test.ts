import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const BIN = path.join(fileURLToPath(new URL('.', import.meta.url)), '../dist/bin.js');

describe('create-limitedrun-theme', () => {
  it('scaffolds a theme with wired package.json (--yes --no-install --no-git)', () => {
    if (!existsSync(BIN)) {
      throw new Error('build the package first: npm run build -w create-limitedrun-theme');
    }
    const parent = mkdtempSync(path.join(tmpdir(), 'lr-scaffold-'));
    const dir = path.join(parent, 'my-theme');
    execFileSync('node', [BIN, dir, '--yes', '--no-install', '--no-git'], { stdio: 'ignore' });

    expect(existsSync(path.join(dir, 'layouts/default.html'))).toBe(true);
    expect(existsSync(path.join(dir, 'templates/index.html'))).toBe(true);
    expect(existsSync(path.join(dir, '.gitignore'))).toBe(true);
    expect(existsSync(path.join(dir, '_gitignore'))).toBe(false);
    expect(existsSync(path.join(dir, 'store.json'))).toBe(true);

    const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('my-theme');
    expect(pkg.scripts.dev).toBe('limitedrun dev');
    expect(pkg.devDependencies['@limitedrun/cli']).toMatch(/^\^/);
  });
});
