import path from 'node:path';
import * as sass from 'sass';
import ts from 'typescript';

// Asset transform seam. Raw `.css`/`.js` files pass through unchanged — the
// platform ingests them verbatim and runs stylesheets through Liquid itself.
// `.scss` and `.ts` files are compiled to plain `.css`/`.js` here so the export
// (and the dev preview) only ever contains what the platform understands. To
// add minification or another language later, push an `AssetTransform` onto
// `transforms`; the dev server and build both consult this registry.

/** Context passed to a transform. */
export interface AssetContext {
  /** Absolute path to the theme root. */
  themePath: string;
  /** Directory the asset lives in, relative to the theme root (e.g. `stylesheets`). */
  dir: string;
}

/** The output of a transform: the emitted file name and its bytes. */
export interface TransformedAsset {
  name: string;
  content: Buffer;
}

/** A pluggable asset processor. */
export interface AssetTransform {
  /** Return true if this transform handles the given source file name. */
  match(file: string): boolean;
  /**
   * Produce the emitted asset from the source bytes, or `null` when the file is
   * a source-only input (a Sass partial, a `.d.ts`) that must not be emitted.
   */
  transform(source: Buffer, file: string, ctx: AssetContext): Promise<TransformedAsset | null>;
}

/** Pass-through transform for raw CSS and JS. */
const identity: AssetTransform = {
  match: (file) => /\.(css|js)$/i.test(file),
  transform: async (source, file) => ({ name: path.basename(file), content: source }),
};

/**
 * Compile a `.scss` file to plain CSS with the pure-JS dart-sass. Sass is not
 * Liquid-aware, so `.scss` sources are treated as pure Sass — put any
 * `{{ config[...] }}` values in a plain `.css` file (still Liquid-processed) and
 * read them through CSS custom properties. Files whose name starts with `_` are
 * partials and are not emitted.
 */
const scss: AssetTransform = {
  match: (file) => /\.scss$/i.test(file),
  transform: async (source, file, ctx) => {
    // Skip Sass partials — they are pulled in by @use/@import, never emitted
    const base = path.basename(file);
    if (base.startsWith('_')) return null;

    // Compile, resolving @use/@import against the file's own directory
    const loadPath = path.join(ctx.themePath, path.dirname(file));
    const result = sass.compileString(source.toString('utf8'), {
      syntax: 'scss',
      loadPaths: [loadPath],
    });
    return { name: base.replace(/\.scss$/i, '.css'), content: Buffer.from(result.css) };
  },
};

/**
 * Transpile a `.ts` file to browser JavaScript by stripping types with the
 * TypeScript compiler. This is type-erasure only — no bundling and no module
 * resolution, so one `.ts` file yields one `.js` file. Declaration files
 * (`.d.ts`) are not emitted.
 */
const typescript: AssetTransform = {
  match: (file) => /\.ts$/i.test(file),
  transform: async (source, file) => {
    // Declaration files carry no runtime code
    const base = path.basename(file);
    if (base.endsWith('.d.ts')) return null;

    // Erase types, keeping ES2020 syntax and native ES modules
    const out = ts.transpileModule(source.toString('utf8'), {
      fileName: base,
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
      },
    });
    return { name: base.replace(/\.ts$/i, '.js'), content: Buffer.from(out.outputText) };
  },
};

/** Ordered registry; the first matching transform wins. */
export const transforms: AssetTransform[] = [identity, scss, typescript];

/**
 * Run an asset file through the first matching transform in the registry.
 *
 * @param source - the source file bytes
 * @param file - the source file name (or path relative to the theme root)
 * @param ctx - transform context (theme root and containing directory)
 * @returns the emitted name and bytes; `null` when the matched transform marks
 *   the file as source-only (a Sass partial, a `.d.ts`); a verbatim copy when no
 *   transform matches
 */
export async function applyTransforms(
  source: Buffer,
  file: string,
  ctx: AssetContext,
): Promise<TransformedAsset | null> {
  // Use the first transform that claims the file
  for (const t of transforms) {
    if (t.match(file)) return t.transform(source, file, ctx);
  }

  // Fall back to a verbatim copy
  return { name: path.basename(file), content: source };
}
