import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadStore } from '../store/load.js';

/** Directory names inside a theme, matching the platform's export layout. */
export const THEME_DIRS = {
  configs: 'configs',
  layouts: 'layouts',
  templates: 'templates',
  stylesheets: 'stylesheets',
  javascripts: 'javascripts',
  snippets: 'snippets',
} as const;

/** Global Liquid scope shared by every template render. */
export interface ThemeGlobals {
  config: Record<string, unknown>;
  store: Record<string, unknown>;
  /** Bare `{{ store_script_tag }}` placeholder used by the default layout. */
  store_script_tag: string;
}

/**
 * Build the `config` map from `configs/default.json`: every setting whose
 * `default` is truthy, then overlaid with any `store.config` overrides —
 * matching the gem's Renderer#theme_config.
 *
 * @param themePath - absolute path to the theme root
 * @param storeConfig - the optional `config` object from store.json
 * @returns the resolved setting-key to value map exposed to templates as `config`
 */
function buildConfig(
  themePath: string,
  storeConfig: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const raw = readFileSync(path.join(themePath, THEME_DIRS.configs, 'default.json'), 'utf8');
  const settings = (JSON.parse(raw).settings ?? {}) as Record<string, { default?: unknown }>;
  const config: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(settings)) {
    if (def?.default) config[key] = def.default;
  }
  if (storeConfig) Object.assign(config, storeConfig);
  return config;
}

/**
 * Load the theme's global scope from disk. Re-read on every request so edits
 * to store.json / configs show up on the next reload.
 *
 * @param themePath - absolute path to the theme root
 * @returns the `config`, `store`, and `store_script_tag` globals
 * @throws {StoreValidationError} if store.json is missing or invalid
 */
export function loadGlobals(themePath: string): ThemeGlobals {
  const store = loadStore(themePath);
  const storeConfig = store.config as Record<string, unknown> | undefined;
  return {
    config: buildConfig(themePath, storeConfig),
    store,
    store_script_tag: '<!-- store.js (dev preview placeholder) -->',
  };
}
