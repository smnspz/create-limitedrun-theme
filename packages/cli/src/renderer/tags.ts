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

/** Collect tokens until `end<name>` into `this.templates`, parsing each. */
function parseBlock(this: BlockTag, endTag: string, remain: TopLevelToken[]): void {
  this.templates = [];
  const parser = (
    this.liquid as unknown as {
      parser: { parseToken: (t: TopLevelToken, r: TopLevelToken[]) => TopLevelToken };
    }
  ).parser;
  while (remain.length) {
    const token = remain.shift() as TopLevelToken & { name?: string; kind?: number };
    if (token.name === endTag) return;
    this.templates.push(parser.parseToken(token, remain));
  }
  throw new Error(`tag {% ${this.token.getText?.() ?? ''} %} not closed`);
}

function* renderBlock(
  this: BlockTag,
  ctx: Context,
  emitter: Emitter,
): Generator<unknown, void, unknown> {
  const renderer = (
    this.liquid as unknown as {
      renderer: { renderTemplates: (t: unknown, c: Context, e: Emitter) => unknown };
    }
  ).renderer;
  yield renderer.renderTemplates(this.templates as unknown, ctx, emitter);
}

/** Parse `'file.ext' key='value' key2=ident` into a filename and a params map. */
function parseIncludeArgs(
  args: string,
  ctx: Context,
): { file: string; params: Record<string, unknown> } {
  const fileMatch = args.match(/^\s*['"]([^'"]+)['"]/);
  if (!fileMatch) throw new Error(`include: expected a quoted file name, got: ${args}`);
  const file = fileMatch[1] as string;
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
 * Register the custom tags on a Liquid instance.
 * @param liquid - the engine to extend
 * @param snippetsDir - absolute path to the theme's snippets directory
 */
export function registerTags(liquid: Liquid, snippetsDir: string): void {
  const resolvedSnippets = path.resolve(snippetsDir);

  liquid.registerTag('paginate', {
    parse(token: TagToken, remain: TopLevelToken[]) {
      parseBlock.call(this as unknown as BlockTag, 'endpaginate', remain);
    },
    render(ctx: Context, emitter: Emitter) {
      return renderBlock.call(this as unknown as BlockTag, ctx, emitter);
    },
  });

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

  liquid.registerTag('captcha', {
    render(_ctx: Context, emitter: Emitter) {
      emitter.write('<div class="captcha" data-preview-placeholder="true">[captcha]</div>');
    },
  });

  liquid.registerTag('include', {
    render(ctx: Context, emitter: Emitter) {
      const self = this as unknown as { token: TagToken; liquid: Liquid };
      const { file, params } = parseIncludeArgs(self.token.args, ctx);
      // Reject path traversal; snippet must resolve inside the snippets dir.
      const target = path.resolve(resolvedSnippets, file);
      if (target !== resolvedSnippets && !target.startsWith(resolvedSnippets + path.sep)) {
        throw new Error(`include: '${file}' escapes the snippets directory`);
      }
      let source: string;
      try {
        source = readFileSync(target, 'utf8');
      } catch {
        throw new Error(`include: snippet '${file}' not found`);
      }
      const scope = { ...ctx.getAll(), include: params };
      return (async () => {
        emitter.write(await self.liquid.parseAndRender(source, scope));
      })();
    },
  });
}
