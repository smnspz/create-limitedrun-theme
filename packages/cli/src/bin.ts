#!/usr/bin/env node
// CLI entrypoint. Dispatches `limitedrun dev` and `limitedrun build`.
// Command implementations land in later phases.
const command = process.argv[2];

if (command !== 'dev' && command !== 'build') {
  process.stderr.write('Usage: limitedrun <dev|build> [--path DIR] [--port N] [--strict]\n');
  process.exit(command ? 1 : 0);
}

process.stderr.write(`limitedrun ${command}: not implemented yet\n`);
process.exit(1);
