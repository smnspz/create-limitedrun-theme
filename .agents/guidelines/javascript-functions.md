# JavaScript / TypeScript function guidelines

How functions should be written and documented in this repo (`packages/cli`,
`packages/create-limitedrun-theme`, and any future package).

## Every function gets a JSDoc block

Every **named, module-level** function or method — `function` declarations,
`const fn = () =>` at module scope, class methods (including `private`), and
named object methods that hold real logic — carries a JSDoc block directly
above it.

**Functions defined inside another function** (local closures, helpers scoped to
one function body) do **not** get a JSDoc block. A single short inline comment
above them describing what they do is enough:

```ts
export async function build(themePath: string): Promise<BuildResult> {
  // Write one file into the staging dir and record it for the zip.
  const write = async (rel: string, content: Buffer) => {
    // …
  };
}
```

Not required at all for: anonymous callbacks passed inline (`.map`, `.filter`,
route handlers, framework hooks), and test-file `describe`/`it` bodies.

## Shape of the block

```ts
/**
 * One-sentence summary of what the function does, in the imperative mood
 * ("Resolve a request path…", not "Resolves…" or "This function resolves…").
 *
 * Optional extra paragraph(s) for context, edge cases, or why it exists.
 *
 * @param name - what it is; note defaults, units, and accepted shapes
 * @param other - …
 * @returns what comes back; omit the tag only for `void`
 * @throws {ErrorType} when this happens
 * @yields for generators, what the generator produces
 */
```

Rules:

- **Blank line** between the summary and the first `@tag` (and between summary
  and any extra paragraph).
- `@param` for **every** parameter, in signature order, `- ` separated:
  `@param themePath - absolute path to the theme root`.
- `@returns` whenever the function returns a value. Describe the value, not the
  type (the type is in the signature). Skip it for `void`.
- `@throws {Type}` for every error the caller can reasonably expect and should
  handle. Skip generic programmer-error throws.
- `@yields` for generator functions.
- Reference other symbols with `{@link name}` when it helps.
- Backtick code, paths, and identifiers.

## Keep comments in sync

When you change a function's signature, behaviour, or error contract, update its
JSDoc in the same edit. A stale `@param` name or an outdated "@returns" is worse
than none.

## Inline comments

Comment function bodies so that **scanning the comments alone tells the reader
what the function does**, step by step. But comment in **blocks**, not per line.

- A function body is a sequence of small **blocks**. Put **one short comment**
  above each block describing what that block does. Blocks are separated by a
  **blank line**, and the comment sits directly on top of its block (blank line
  above the comment, none between the comment and its code).
- A block is usually 1–5 related lines. When each line is individually obvious
  (a run of `const x = …` setup lines, a guard, a simple loop), one lead comment
  for the whole block is enough — do **not** comment each line.
- Only drop to **line-by-line** comments inside a block when the logic is
  genuinely intricate (a parser, a money/security path, a non-obvious algorithm).
- **Start every comment with a verb**: `// Validate the theme before emitting`,
  `// Prepare a clean staging directory`, `// Return the build result`.
- Keep comments **very short** — a few words, no trailing period.

No numbered lists, no divider bars, no top-of-file banner.

### Example — block comments, blank lines between blocks

```ts
// Validate the theme before emitting anything
try {
  JSON.parse(await readFile(configPath, 'utf8'));
} catch (err) {
  throw new Error(`configs/default.json is missing or invalid: ${err.message}`);
}
loadStore(themePath);

// Prepare a clean staging directory
const name = path.basename(themePath);
const dist = outDir ?? path.join(themePath, 'dist');
const stageDir = path.join(dist, name);
await rm(stageDir, { recursive: true, force: true });
await mkdir(stageDir, { recursive: true });

// Return the build result
return { outDir: stageDir, zipPath, fileCount: Object.keys(files).length };
```

### Bad — one comment per line, no separation

```ts
// Set the theme name from the folder name
const name = path.basename(themePath);
// Set the output directory
const dist = outDir ?? path.join(themePath, 'dist');
// Set the staging directory
const stageDir = path.join(dist, name);
```

## Example

```ts
/**
 * Read and validate `store.json` at the theme root.
 *
 * @param themePath - absolute path to the theme root
 * @returns the parsed store mock data
 * @throws {StoreValidationError} on missing file, invalid JSON, or schema failure
 */
export function loadStore(themePath: string): Record<string, unknown> {
  // …
}
```
