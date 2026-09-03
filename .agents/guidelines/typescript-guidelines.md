# TypeScript / JavaScript Projects

Conventions for creating new TypeScript projects and for writing TypeScript and JavaScript code across the repositories. TypeScript is the default for new projects; the rules below apply equally to existing JavaScript projects unless a rule is explicitly TypeScript-only.

## Project Creation

### Node version

Every new project must target the latest Node.js version available locally through [nvm](https://github.com/nvm-sh/nvm). Before scaffolding, verify nvm is installed and pick the highest locally-installed version rather than hardcoding one:

```bash
command -v nvm
nvm ls
```

Then activate that version for the project:

```bash
nvm use <latest-installed-version>
```

Do not hardcode an older Node version out of habit; only lower the baseline if there is a stated compatibility requirement. If nvm is not installed, stop and install it before scaffolding.

### Package manager: pnpm

Every new project must use [pnpm](https://pnpm.io/) as its package manager. Do not use npm or yarn for new projects. Commit `pnpm-lock.yaml`; never commit `package-lock.json` or `yarn.lock` alongside it.

### Linting and formatting: ESLint + Prettier

Every new project must use [ESLint](https://eslint.org/) for linting and [Prettier](https://prettier.io/) for formatting. Add them as dev dependencies:

```bash
pnpm add -D eslint prettier
```

Do not enforce a maximum line length — leave `printWidth` / `max-len` unset (or explicitly disabled). All other Prettier and ESLint defaults are fine unless a project has a specific reason to override them.

Run `pnpm exec eslint .` for linting and `pnpm exec prettier --write .` for formatting.

## Coding Style

### No banner separators

Never use large decorative separator comments to divide code into sections. For example, do **not** write:

```ts
// Bad
// =============================================================================
// Seam 3: live capture (manual integration; not unit-tested)
// =============================================================================
```

Do not use a heading comment either, not even a single concise line like `// --- Live capture ---`. Rely on the JSDoc of the first function or class in the group to make the boundary clear, and split the code into separate functions, classes, or modules when a grouping is significant enough to need naming.

### Inline comments

Mark each logical step of a function body with a short `//` comment placed directly above it, at the same indentation level as the code it describes. Separate each comment+code block from the next with a blank line, so the function reads as a sequence of clearly labeled steps.

Rules:

- One line only. Do not wrap a comment onto a second line; shorten it instead.
- Capitalize the first word. No trailing period.
- Keep it short and concise, typically 3 to 8 words.
- Reserve comments for grouping multi-line steps. Do not add a comment above a single, self-explanatory line.
- Reuse the same recurring phrasing patterns:
  - `// Initializations` above the first block that sets up local variables.
  - `// Check <condition>` above a validation or guard block.
  - `// Calculate <value>` / `// Compute <value>` above a computation.
  - `// Return <what>` above the final return statement.
  - `// <Verb> the <noun>` as the general pattern for an action block, e.g. `// Encode the remaining bytes`, `// Advance`, `// Sort the values`.

When a preceding block can make the function return early (an early `return` after a validation check), mark the line right after it with a lone `// else` comment, then a blank line, to make explicit that the rest of the function only runs when the early return did not happen:

```ts
/**
 * Load calibration data from a file.
 *
 * @param path - Path to the calibration file.
 * @returns The parsed calibration parameters.
 */
export function loadCalibration(path: string): Record<string, unknown> {
  if (!fs.existsSync(path)) {
    return {};
  }

  // else

  // Initializations
  const result: Record<string, unknown> = {};

  // Read and parse the file line by line
  const contents = fs.readFileSync(path, 'utf-8');
  for (const line of contents.split('\n')) {
    // ...
  }

  // Return the parsed values
  return result;
}
```

### React / JSX

Never use JSX comment syntax (`{/* ... */}`) inline within embedded markup. If a piece of JSX needs commentary, either:

- Place a normal `//` comment on the line **above** the JSX element it describes, at the same indentation level, or
- Extract the JSX into a named variable or a small subcomponent whose name carries the intent.

```tsx
// Bad
export function UserCard({ user }: { user: User }) {
  return (
    <div className="card">
      {/* Show avatar only when the user has uploaded one */}
      {user.avatarUrl && <img src={user.avatarUrl} alt="" />}
      <span>{user.name}</span>
    </div>
  );
}
```

```tsx
// Good — comment lives above the JSX element
export function UserCard({ user }: { user: User }) {
  // Show avatar only when the user has uploaded one
  const avatar = user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : null;

  return (
    <div className="card">
      {avatar}
      <span>{user.name}</span>
    </div>
  );
}
```

### JSDoc

Every function, method, and class, however small, must have a comprehensive JSDoc block. The JSDoc must describe what the function does, every parameter, and what it returns. If the function returns nothing, state that explicitly.

**TypeScript files** (`.ts`, `.tsx`): omit `@param` and `@returns` type tags — the TypeScript signature already carries the types. Describe each parameter by name.

```ts
/**
 * Resize a frame to the given dimensions.
 *
 * @param frame - The source frame as an HxWxC array.
 * @param width - Target width in pixels.
 * @param height - Target height in pixels.
 * @returns The resized frame with shape (height, width, channels).
 */
export function resizeFrame(frame: Uint8Array, width: number, height: number): Uint8Array {
  // ...
}
```

For a function with no return value, document it as returning nothing:

```ts
/**
 * Write the configuration to a JSON file.
 *
 * @param config - The configuration mapping to serialize.
 * @param path - Destination file path.
 * @returns Nothing. Writes to disk.
 */
export function saveConfig(config: Record<string, unknown>, path: string): void {
  // ...
}
```

When a function throws errors that callers are expected to handle, document them in `@throws`:

```ts
/**
 * Load calibration data from a file.
 *
 * @param path - Path to the calibration file.
 * @returns The parsed calibration parameters.
 * @throws {Error} If the file does not exist or its contents cannot be parsed.
 */
export function loadCalibration(path: string): Record<string, unknown> {
  // ...
}
```

**JavaScript files** (`.js`, `.jsx`): include type tags on every `@param` and `@returns`, since there is no other source of type information.

```js
/**
 * Resize a frame to the given dimensions.
 *
 * @param {Uint8Array} frame - The source frame as an HxWxC array.
 * @param {number} width - Target width in pixels.
 * @param {number} height - Target height in pixels.
 * @returns {Uint8Array} The resized frame with shape (height, width, channels).
 */
export function resizeFrame(frame, width, height) {
  // ...
}
```
