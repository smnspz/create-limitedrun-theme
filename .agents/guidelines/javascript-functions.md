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

Follow the global style: short explanatory inline comments, no numbered lists,
no divider bars, no top-of-file banner. Group variable initialisations under an
`// Initializations` comment. Comment obtaining lines (`// Get the service`),
assignments, and `return` statements with what they produce.

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
