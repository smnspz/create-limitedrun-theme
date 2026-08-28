import path from 'node:path';

// Asset transform seam. Today every `.css`/`.js` file passes through
// unchanged — the platform ingests raw CSS/JS and runs stylesheets through
// Liquid itself. To add SCSS, TypeScript, or minification later, push another
// AssetTransform onto `transforms`; the dev server and build both consult
// this registry, so no other code changes.

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
  /** Produce the emitted asset from the source bytes. */
  transform(source: Buffer, file: string, ctx: AssetContext): Promise<TransformedAsset>;
}

/** Pass-through transform for raw CSS and JS. */
const identity: AssetTransform = {
  match: (file) => /\.(css|js)$/i.test(file),
  transform: async (source, file) => ({ name: path.basename(file), content: source }),
};

/** Ordered registry; the first matching transform wins. */
export const transforms: AssetTransform[] = [identity];

/**
 * Run an asset file through the first matching transform in the registry.
 *
 * @param source - the source file bytes
 * @param file - the source file name (or path relative to the theme root)
 * @param ctx - transform context (theme root and containing directory)
 * @returns the emitted name and bytes; falls back to a verbatim copy when no
 *   transform matches
 */
export async function applyTransforms(
  source: Buffer,
  file: string,
  ctx: AssetContext,
): Promise<TransformedAsset> {
  // Use the first transform that claims the file
  for (const t of transforms) {
    if (t.match(file)) return t.transform(source, file, ctx);
  }

  // Fall back to a verbatim copy
  return { name: path.basename(file), content: source };
}
