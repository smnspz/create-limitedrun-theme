import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Context, Emitter, Liquid, TagToken, TopLevelToken } from 'liquidjs';

// Limited Run's custom Liquid tags, reimplemented for local preview.
//
// `include` ports the gem's param-passing, path-traversal-guarded snippet
// include (lib/liquid/tags/lr_include.rb). `paginate` and `contact_form` are
// pass-through blocks — the gem shipped them as near-noops and real themes
// already render fine without pagination state against single-page mock data.
// `captcha` emits static placeholder markup.
//
// ponytail: paginate just renders its body; real page-slicing + `*_pagination`
// output would only matter with multi-page mock data. Revisit if the mock
// dataset grows or a theme's layout depends on the pagination nav.

interface BlockTag {
  templates: TopLevelToken[];
  liquid: Liquid;
  token: TagToken;
  parse(token: TagToken, remain: TopLevelToken[]): void;
  render(ctx: Context, emitter: Emitter): Generator<unknown, void, unknown>;
}

/**
 * Consume remaining tokens up to the matching `end<name>` tag, parsing each into
 * `this.templates`. Called from a tag's `parse` hook with `this` bound to the tag.
 *
 * @param endTag - the closing tag name (e.g. `endpaginate`)
 * @param remain - the parser's remaining token stream; drained in place
 * @throws {Error} if the stream ends before the closing tag is seen
 */
function parseBlock(this: BlockTag, endTag: string, remain: TopLevelToken[]): void {
  this.templates = [];
  const parser = (
    this.liquid as unknown as {
      parser: { parseToken: (t: TopLevelToken, r: TopLevelToken[]) => TopLevelToken };
    }
  ).parser;

  // Parse each token until the closing tag, then stop
  while (remain.length) {
    const token = remain.shift() as TopLevelToken & { name?: string; kind?: number };
    if (token.name === endTag) return;
    this.templates.push(parser.parseToken(token, remain));
  }

  // Reaching here means the closing tag was never found
  throw new Error(`tag {% ${this.token.getText?.() ?? ''} %} not closed`);
}

/**
 * Render the templates collected by {@link parseBlock} in the current context.
 * Called from a tag's `render` hook with `this` bound to the tag.
 *
 * @param ctx - the active Liquid render context
 * @param emitter - the output emitter to write into
 * @yields the renderer's work; produces no return value
 */
function* renderBlock(
  this: BlockTag,
  ctx: Context,
  emitter: Emitter,
): Generator<unknown, void, unknown> {
  // Hand the collected templates to liquidjs's own renderer
  const renderer = (
    this.liquid as unknown as {
      renderer: { renderTemplates: (t: unknown, c: Context, e: Emitter) => unknown };
    }
  ).renderer;
  yield renderer.renderTemplates(this.templates as unknown, ctx, emitter);
}

/**
 * Parse an `include` tag's argument string — `'file.ext' key='value' key2=ident`
 * — into the snippet file name and a params map. Quoted values are literals;
 * bare identifiers are resolved against the render context.
 *
 * @param args - the raw argument string from the tag token
 * @param ctx - the render context, used to resolve bare-identifier params
 * @returns the snippet `file` name and the `params` exposed to it as `include.*`
 * @throws {Error} if no quoted file name is present
 */
function parseIncludeArgs(
  args: string,
  ctx: Context,
): { file: string; params: Record<string, unknown> } {
  // Take the leading quoted file name
  const fileMatch = args.match(/^\s*['"]([^'"]+)['"]/);
  if (!fileMatch) throw new Error(`include: expected a quoted file name, got: ${args}`);
  const file = fileMatch[1] as string;

  // Collect the trailing key=value pairs; quoted are literals, bare are context lookups
  const params: Record<string, unknown> = {};
  const rest = args.slice(fileMatch[0].length);
  const pairRe = /([\w-]+)\s*=\s*(?:'([^']*)'|"([^"]*)"|([\w.-]+))/g;
  let m: RegExpExecArray | null = pairRe.exec(rest);
  while (m) {
    const key = m[1] as string;
    params[key] =
      m[2] ?? m[3] ?? (m[4] !== undefined ? ctx.getSync(String(m[4]).split('.')) : undefined);
    m = pairRe.exec(rest);
  }
  return { file, params };
}

/**
 * Register the custom Limited Run tags (`paginate`, `contact_form`, `captcha`,
 * `include`) on a Liquid instance.
 *
 * @param liquid - the engine to extend
 * @param snippetsDir - absolute path to the theme's snippets directory, used by
 *   `include` for lookup and path-traversal checks
 */
export function registerTags(liquid: Liquid, snippetsDir: string): void {
  const resolvedSnippets = path.resolve(snippetsDir);

  // `{% paginate collection by N %}…{% endpaginate %}` — pass-through: renders
  // the body in the current scope, ignoring the pagination arguments.
  liquid.registerTag('paginate', {
    parse(token: TagToken, remain: TopLevelToken[]) {
      parseBlock.call(this as unknown as BlockTag, 'endpaginate', remain);
    },
    render(ctx: Context, emitter: Emitter) {
      return renderBlock.call(this as unknown as BlockTag, ctx, emitter);
    },
  });

  // `{% contact_form %}…{% endcontact_form %}` — wraps the body in a `<form>`
  // that posts to `/contact`.
  liquid.registerTag('contact_form', {
    parse(token: TagToken, remain: TopLevelToken[]) {
      parseBlock.call(this as unknown as BlockTag, 'endcontact_form', remain);
    },
    *render(ctx: Context, emitter: Emitter) {
      emitter.write('<form accept-charset="UTF-8" action="/contact" method="post">');
      yield renderBlock.call(this as unknown as BlockTag, ctx, emitter);
      emitter.write('</form>');
    },
  });

  // `{% captcha [theme] %}` — emits static placeholder markup for local preview.
  liquid.registerTag('captcha', {
    render(_ctx: Context, emitter: Emitter) {
      emitter.write('<div class="captcha" data-preview-placeholder="true">[captcha]</div>');
    },
  });

  // `{% include 'file.ext' key='value' %}` — renders a snippet with the given
  // params exposed as `include.*`; rejects paths that escape the snippets dir.
  liquid.registerTag('include', {
    render(ctx: Context, emitter: Emitter) {
      const self = this as unknown as { token: TagToken; liquid: Liquid };
      const { file, params } = parseIncludeArgs(self.token.args, ctx);

      // Reject any path that resolves outside the snippets directory
      const target = path.resolve(resolvedSnippets, file);
      if (target !== resolvedSnippets && !target.startsWith(resolvedSnippets + path.sep)) {
        throw new Error(`include: '${file}' escapes the snippets directory`);
      }

      // Read the snippet, or report it missing
      let source: string;
      try {
        source = readFileSync(target, 'utf8');
      } catch {
        throw new Error(`include: snippet '${file}' not found`);
      }

      // Render it with the params exposed as `include.*`
      const scope = { ...ctx.getAll(), include: params };
      return (async () => {
        emitter.write(await self.liquid.parseAndRender(source, scope));
      })();
    },
  });
}
