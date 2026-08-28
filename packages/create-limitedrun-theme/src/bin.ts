#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import * as p from '@clack/prompts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_ROOT = path.join(HERE, '..', 'templates');

/** Starter themes bundled with the scaffolder (directories under templates/). */
const TEMPLATES = [
  { id: 'skeleton', label: 'Skeleton', hint: 'Minimal starting point, no snippets' },
  { id: 'telescope', label: 'Telescope', hint: 'Responsive, background image, color pickers' },
  { id: 'hyde', label: 'Hyde', hint: 'Featured image, highly customizable' },
  { id: 'binoculars', label: 'Binoculars', hint: 'Responsive, background image' },
  { id: 'winter', label: 'Winter', hint: 'Responsive, background image' },
  { id: 'winter-peak', label: 'Winter Peak', hint: 'Winter with a bolder header' },
] as const;

/** This package's version, used to pin the theme's @limitedrun/cli dependency. */
async function ownVersion(): Promise<string> {
  const pkg = JSON.parse(await readFile(path.join(HERE, '..', 'package.json'), 'utf8'));
  return pkg.version as string;
}

function themePackageJson(name: string, cliVersion: string): string {
  return `${JSON.stringify(
    {
      name,
      version: '0.1.0',
      private: true,
      description: 'A Limited Run theme',
      scripts: {
        dev: 'limitedrun dev',
        build: 'limitedrun build',
      },
      devDependencies: {
        '@limitedrun/cli': `^${cliVersion}`,
      },
    },
    null,
    2,
  )}\n`;
}

const THEME_README = (name: string) => `# ${name}

A [Limited Run](https://limitedrun.com/) theme.

## Develop

\`\`\`sh
npm run dev      # preview at http://localhost:4567, live-reloads on save
npm run build    # produce dist/${name}.zip
\`\`\`

Edit \`store.json\` to change the mock data the preview renders against.
\`store.json\` is a local mock only — it is never uploaded to Limited Run.

## Deploy

\`npm run build\`, then upload \`dist/${name}.zip\` in the Limited Run admin
under Storefront → Themes.
`;

async function confirm(message: string): Promise<boolean> {
  const answer = await p.confirm({ message });
  if (p.isCancel(answer)) {
    p.cancel('Cancelled.');
    process.exit(1);
  }
  return answer;
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      template: { type: 'string', short: 't' },
      install: { type: 'boolean' },
      'no-install': { type: 'boolean' },
      git: { type: 'boolean' },
      'no-git': { type: 'boolean' },
      yes: { type: 'boolean', short: 'y' },
    },
  });

  p.intro('create-limitedrun-theme');

  // Resolve the target directory.
  let dir = positionals[0];
  if (!dir) {
    const answer = await p.text({
      message: 'Where should the theme live?',
      placeholder: 'my-theme',
      defaultValue: 'my-theme',
    });
    if (p.isCancel(answer)) return p.cancel('Cancelled.');
    dir = answer || 'my-theme';
  }
  const target = path.resolve(dir);
  const name = path.basename(target);

  if (existsSync(target)) {
    p.cancel(`${dir} already exists — choose another directory.`);
    process.exit(1);
  }

  // Resolve the starter template.
  let templateId = values.template;
  if (templateId && !TEMPLATES.some((t) => t.id === templateId)) {
    p.cancel(`Unknown template '${templateId}'. Options: ${TEMPLATES.map((t) => t.id).join(', ')}`);
    process.exit(1);
  }
  if (!templateId) {
    if (values.yes) {
      templateId = 'skeleton';
    } else {
      const picked = await p.select({
        message: 'Which starter theme?',
        options: TEMPLATES.map((t) => ({ value: t.id, label: t.label, hint: t.hint })),
        initialValue: 'skeleton',
      });
      if (p.isCancel(picked)) return p.cancel('Cancelled.');
      templateId = picked as string;
    }
  }

  // Decide install / git, honouring flags and --yes.
  const doInstall = values['no-install']
    ? false
    : values.install || values.yes
      ? true
      : await confirm('Install dependencies with npm?');
  const doGit = values['no-git']
    ? false
    : values.git || values.yes
      ? true
      : await confirm('Initialize a git repository?');

  const s = p.spinner();
  s.start(`Creating theme from "${templateId}"`);

  // Theme files, then the shared store.json mock + .gitignore overlaid on top.
  await cp(path.join(TEMPLATES_ROOT, templateId), target, { recursive: true });
  await cp(path.join(TEMPLATES_ROOT, '_shared'), target, { recursive: true });
  await rename(path.join(target, '_gitignore'), path.join(target, '.gitignore'));
  await writeFile(path.join(target, 'package.json'), themePackageJson(name, await ownVersion()));
  await writeFile(path.join(target, 'README.md'), THEME_README(name));

  s.stop('Theme created');

  if (doGit) {
    try {
      execSync('git init -q && git add -A', { cwd: target, stdio: 'ignore' });
    } catch {
      p.log.warn('git init failed — skipping.');
    }
  }

  if (doInstall) {
    s.start('Installing dependencies');
    try {
      execSync('npm install', { cwd: target, stdio: 'ignore' });
      s.stop('Dependencies installed');
    } catch {
      s.stop('npm install failed — run it yourself.');
    }
  }

  p.outro(
    [
      `Done. Next:`,
      ``,
      `  cd ${dir}`,
      ...(doInstall ? [] : ['  npm install']),
      `  npm run dev`,
    ].join('\n'),
  );
}

main().catch((err) => {
  p.log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
