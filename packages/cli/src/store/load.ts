import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Ajv, type ErrorObject } from 'ajv';
import schema from './store.schema.json' with { type: 'json' };

/** Thrown when store.json is missing, unparseable, or fails schema validation. */
export class StoreValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoreValidationError';
  }
}

// Initializations
const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const validate = ajv.compile(schema);

/**
 * Render Ajv validation errors as a short, readable, indented list.
 *
 * @param errors - the `validate.errors` array from Ajv
 * @returns one `  <path> <message>` line per error, newline-separated
 */
function formatErrors(errors: ErrorObject[]): string {
  return errors.map((e) => `  ${e.instancePath || '/'} ${e.message ?? 'is invalid'}`).join('\n');
}

/**
 * Read and validate `store.json` at the theme root.
 * @param themePath - absolute path to the theme root
 * @returns the parsed store mock data
 * @throws {StoreValidationError} on missing file, invalid JSON, or schema failure
 */
export function loadStore(themePath: string): Record<string, unknown> {
  const file = path.join(themePath, 'store.json');
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    throw new StoreValidationError(
      `store.json not found at ${file}\nAdd a store.json with mock data to preview this theme.`,
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new StoreValidationError(`store.json is not valid JSON: ${(err as Error).message}`);
  }

  if (!validate(data)) {
    throw new StoreValidationError(
      `store.json does not match the expected shape:\n${formatErrors(validate.errors ?? [])}`,
    );
  }
  return data as Record<string, unknown>;
}
