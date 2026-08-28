import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Liquid } from 'liquidjs';
import { registerFilters } from './filters.js';
import { registerTags } from './tags.js';
import { THEME_DIRS, loadGlobals } from './assigns.js';

/** Options controlling how strictly templates are rendered. */
export interface RendererOptions {
  /** Treat undefined variables and filters as errors (default: false, lenient). */
  strict?: boolean;
}

/**
 * Renders a Limited Run theme with liquidjs.
 *
 * Mirrors the gem's Renderer: `layouts/default.html` always wraps the page
 * template via `{{ content }}`; `config` and `store` are global; files are
 * re-read per render so edits show up on reload.
 */
export class ThemeRenderer {
  private readonly themePath: string;
  private readonly liquid: Liquid;

  /**
   * @param themePath - absolute path to the theme root
   * @param options - strictness options
   */
  constructor(themePath: string, options: RendererOptions = {}) {
    this.themePath = themePath;
    const snippetsDir = path.join(themePath, THEME_DIRS.snippets);
    this.liquid = new Liquid({
      root: [path.join(themePath, THEME_DIRS.templates), snippetsDir],
      extname: '.html',
      jsTruthy: true,
      strictVariables: options.strict ?? false,
      strictFilters: options.strict ?? false,
      // Templates emit HTML fragments (product descriptions etc.) that must not
      // be auto-escaped; the gem's Liquid did not escape by default either.
      outputEscape: undefined,
    });
    registerFilters(this.liquid, THEME_DIRS.javascripts);
    registerTags(this.liquid, snippetsDir);
  }

  private read(dir: string, file: string): string {
    return readFileSync(path.join(this.themePath, dir, file), 'utf8');
  }

  /**
   * Render a page: the named template wrapped in the default layout.
   * @param template - template file name, e.g. `index.html`
   * @param assigns - per-route variables merged over the globals
   * @returns the full HTML document
   */
  async renderPage(template: string, assigns: Record<string, unknown> = {}): Promise<string> {
    const globals = loadGlobals(this.themePath);
    const scope = { ...globals, ...assigns };
    const content = await this.liquid.parseAndRender(
      this.read(THEME_DIRS.templates, template),
      scope,
    );
    return this.liquid.parseAndRender(this.read(THEME_DIRS.layouts, 'default.html'), {
      ...scope,
      content,
    });
  }

  /**
   * Render a standalone template without the layout (for `maintenance.html`,
   * `404.html`, and other full-document templates).
   */
  async renderBare(template: string, assigns: Record<string, unknown> = {}): Promise<string> {
    const globals = loadGlobals(this.themePath);
    return this.liquid.parseAndRender(this.read(THEME_DIRS.templates, template), {
      ...globals,
      ...assigns,
    });
  }

  /**
   * Render a stylesheet through Liquid with only `config` in scope, matching
   * the gem's `/stylesheets/:file` route.
   * @param file - css file name within the stylesheets directory
   */
  async renderStylesheet(file: string): Promise<string> {
    const { config } = loadGlobals(this.themePath);
    return this.liquid.parseAndRender(this.read(THEME_DIRS.stylesheets, file), { config });
  }
}
