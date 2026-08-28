import { defineConfig } from 'tsup';

// Build the library entry and the CLI binary as ESM. bin.ts carries its own
// shebang line, which tsup preserves.
export default defineConfig({
  entry: ['src/index.ts', 'src/bin.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  dts: { entry: 'src/index.ts' },
});
