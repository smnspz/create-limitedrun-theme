#!/usr/bin/env node
import path from 'node:path';
import { parseArgs } from 'node:util';
import { build } from './commands/build.js';
import { runDev } from './commands/dev.js';

const USAGE = `limitedrun — local tooling for Limited Run themes

Usage:
  limitedrun dev [--path DIR] [--port N] [--strict]
  limitedrun build [--path DIR] [--out DIR]

Options:
  --path DIR    theme directory (default: current directory)
  --port N      dev server port (default: 4567)
  --strict      fail on undefined Liquid variables/filters
  --out DIR     build output directory (default: <path>/dist)
`;

async function main(): Promise<void> {
  const command = process.argv[2];
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: {
      path: { type: 'string' },
      port: { type: 'string' },
      strict: { type: 'boolean', default: false },
      out: { type: 'string' },
    },
    allowPositionals: false,
  });

  const themePath = path.resolve(values.path ?? process.cwd());

  if (command === 'dev') {
    await runDev({ themePath, port: Number(values.port ?? 4567), strict: values.strict });
    return;
  }

  if (command === 'build') {
    const result = await build(themePath, values.out ? path.resolve(values.out) : undefined);
    process.stdout.write(
      `\n  built ${result.fileCount} files\n  ${result.zipPath}\n\n  Upload this zip in the Limited Run admin (Storefront → Themes).\n\n`,
    );
    return;
  }

  process.stdout.write(USAGE);
  process.exit(command ? 1 : 0);
}

main().catch((err) => {
  process.stderr.write(`\n  ${err instanceof Error ? err.message : String(err)}\n\n`);
  process.exit(1);
});
