import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { zipSync } from 'fflate';
import { applyTransforms } from '../assets/transform.js';
import { THEME_DIRS } from '../renderer/assigns.js';
import { loadStore } from '../store/load.js';

/** Directories copied verbatim into the export (Liquid + markup, no processing). */
const COPY_DIRS = [
  THEME_DIRS.configs,
  THEME_DIRS.layouts,
  THEME_DIRS.templates,
  THEME_DIRS.snippets,
];
/** Directories whose files are run through the asset transform registry. */
const ASSET_DIRS = [THEME_DIRS.stylesheets, THEME_DIRS.javascripts];

/** Outcome of a build. */
export interface BuildResult {
  /** Directory the unpacked export was written to. */
  outDir: string;
  /** Path to the uploadable zip archive. */
  zipPath: string;
  /** Number of files in the archive. */
  fileCount: number;
}

/**
 * List every file under `<root>/<dir>`, recursively.
 *
 * @param root - theme root the paths are made relative to
 * @param dir - subdirectory to scan; a missing directory yields an empty list
 * @returns file paths relative to `root`, using the platform separator
 */
async function collectDir(root: string, dir: string): Promise<string[]> {
  const abs = path.join(root, dir);
  if (!existsSync(abs)) return [];
  const entries = await readdir(abs, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => path.relative(root, path.join(e.parentPath, e.name)));
}

/**
 * Validate a theme and produce a Limited Run–shaped export.
 *
 * Checks `configs/default.json` parses and `store.json` is valid, copies the
 * platform directories, runs `stylesheets/` and `javascripts/` through the
 * asset transform registry, and zips the result for manual upload. The mock
 * `store.json` / `store.schema.json` and any Node project files are excluded.
 *
 * @param themePath - absolute path to the theme root
 * @param outDir - directory for build output (default `<themePath>/dist`)
 * @returns paths and file count of the produced export
 */
export async function build(themePath: string, outDir?: string): Promise<BuildResult> {
  // Validate before emitting anything.
  const configPath = path.join(themePath, THEME_DIRS.configs, 'default.json');
  try {
    JSON.parse(await readFile(configPath, 'utf8'));
  } catch (err) {
    throw new Error(`configs/default.json is missing or invalid: ${(err as Error).message}`);
  }
  loadStore(themePath);

  const name = path.basename(themePath);
  const dist = outDir ?? path.join(themePath, 'dist');
  const stageDir = path.join(dist, name);
  await rm(stageDir, { recursive: true, force: true });
  await mkdir(stageDir, { recursive: true });

  const files: Record<string, Uint8Array> = {};

  // Write one file into the staging directory and record it for the zip.
  const write = async (rel: string, content: Buffer) => {
    const dest = path.join(stageDir, rel);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, content);
    files[rel.split(path.sep).join('/')] = content;
  };

  for (const dir of COPY_DIRS) {
    for (const rel of await collectDir(themePath, dir)) {
      await write(rel, await readFile(path.join(themePath, rel)));
    }
  }

  for (const dir of ASSET_DIRS) {
    for (const rel of await collectDir(themePath, dir)) {
      const source = await readFile(path.join(themePath, rel));
      const out = await applyTransforms(source, rel, { themePath, dir });
      await write(path.join(dir, out.name), out.content);
    }
  }

  // Keep the export README if the theme ships one.
  const readme = path.join(themePath, 'README.md');
  if (existsSync(readme)) await write('README.md', await readFile(readme));

  const zipPath = path.join(dist, `${name}.zip`);
  await writeFile(zipPath, Buffer.from(zipSync(files, { level: 6 })));

  return { outDir: stageDir, zipPath, fileCount: Object.keys(files).length };
}
