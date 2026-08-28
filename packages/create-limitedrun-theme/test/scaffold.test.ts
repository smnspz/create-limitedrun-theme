import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const BIN = path.join(fileURLToPath(new URL('.', import.meta.url)), '../dist/bin.js');
const TEMPLATE_IDS = ['skeleton', 'telescope', 'hyde', 'binoculars', 'winter', 'winter-peak'];

function scaffold(name: string, args: string[] = []): string {
  if (!existsSync(BIN)) {
    throw new Error('build the package first: npm run build -w create-limitedrun-theme');
  }
  const dir = path.join(mkdtempSync(path.join(tmpdir(), 'lr-scaffold-')), name);
  execFileSync('node', [BIN, dir, '--yes', '--no-install', '--no-git', ...args], {
    stdio: 'ignore',
  });
  return dir;
}

describe('create-limitedrun-theme', () => {
  it('scaffolds the default (skeleton) theme with wired package.json', () => {
    const dir = scaffold('my-theme');

    expect(existsSync(path.join(dir, 'layouts/default.html'))).toBe(true);
    expect(existsSync(path.join(dir, 'templates/index.html'))).toBe(true);
    expect(existsSync(path.join(dir, '.gitignore'))).toBe(true);
    expect(existsSync(path.join(dir, '_gitignore'))).toBe(false);
    expect(existsSync(path.join(dir, 'store.json'))).toBe(true);
    expect(existsSync(path.join(dir, 'store.schema.json'))).toBe(true);

    const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('my-theme');
    expect(pkg.scripts.dev).toBe('limitedrun dev');
    expect(pkg.devDependencies['@limitedrun/cli']).toMatch(/^\^/);
  });

  it('rejects an unknown --template', () => {
    expect(() => scaffold('x', ['--template', 'nope'])).toThrow();
  });

  for (const id of TEMPLATE_IDS) {
    it(`scaffolds the "${id}" template with the shared store mock`, () => {
      const dir = scaffold(`theme-${id}`, ['--template', id]);
      expect(existsSync(path.join(dir, 'configs/default.json'))).toBe(true);
      expect(existsSync(path.join(dir, 'layouts/default.html'))).toBe(true);
      expect(existsSync(path.join(dir, 'store.json'))).toBe(true);
      expect(existsSync(path.join(dir, '.gitignore'))).toBe(true);
      expect(existsSync(path.join(dir, 'package.json'))).toBe(true);
    });
  }
});
