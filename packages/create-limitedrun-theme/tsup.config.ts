import { defineConfig } from 'tsup';

// Single CLI binary; bin.ts carries its own shebang line.
export default defineConfig({
  entry: ['src/bin.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
});
