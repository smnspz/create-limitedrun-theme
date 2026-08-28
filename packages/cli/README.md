# @limitedrun/cli

Local dev server and build tooling for [Limited Run](https://limitedrun.com/)
storefront themes. Provides the `limitedrun` command used by projects created
with [`create-limitedrun-theme`](../create-limitedrun-theme).

```sh
limitedrun dev      # preview the theme in ./ on http://localhost:4567
limitedrun build    # validate it and write dist/<name>.zip
```

Renders themes **locally** with [liquidjs](https://liquidjs.com/) against a
hand-authored `store.json` mock. There is no Limited Run theme deployment API, so
`build` produces an upload-ready zip and deploying is a manual step in the admin.

## Install

```sh
npm i -D @limitedrun/cli
```

A scaffolded theme already depends on it and exposes `npm run dev` / `npm run build`.

## Commands

```
limitedrun dev [options]      start the preview server
limitedrun build [options]    produce the export zip

Options:
  --path <dir>    theme directory (default: current directory)
  --port <n>      dev server port (default: 4567)
  --strict        fail on undefined Liquid variables/filters (dev only)
  --out <dir>     build output directory (default: <path>/dist)
```

### `limitedrun dev`

- Serves the theme with routes matching the platform (see the table below).
- `stylesheets/*.css` are rendered through Liquid with `config` in scope;
  `javascripts/*` are served verbatim.
- `stylesheets/*.scss` are compiled with [dart-sass](https://sass-lang.com/) and
  `javascripts/*.ts` are type-stripped with the TypeScript compiler — on both
  `dev` and `build`, so the export only ever contains `.css`/`.js`. See
  "Preprocessors" below.
- A `chokidar` watcher reloads every connected browser over SSE on any file
  change. Template/`store.json`/config edits show up on the next request.
- Render errors are shown in the browser (with the reload client attached) rather
  than a blank 500.
- `--strict` turns on `strictVariables` / `strictFilters` for debugging.

### `limitedrun build`

1. Validates `configs/default.json` parses and `store.json` matches
   `store.schema.json` — fails with the offending paths otherwise.
2. Copies `configs/ layouts/ templates/ snippets/` verbatim.
3. Runs `stylesheets/ javascripts/` through the asset-transform registry
   (raw `.css`/`.js` pass through; `.scss`→`.css`, `.ts`→`.js`) and writes them
   under their emitted names.
4. Includes `README.md` if present.
5. Writes `dist/<name>/` and `dist/<name>.zip`.

Excluded from the zip: `store.json`, `store.schema.json`, `node_modules`,
`dist`, `package.json`.

## Theme layout

The authored source is exactly what the platform ingests — do not rename:

```
configs/default.json   settings schema (name, description, settings.*)
layouts/default.html   wrapper; templates render into {{ content }}
templates/*.html       page templates
snippets/*             partials for {% include 'file.html' %}
stylesheets/*.css      run through Liquid on serve/build
stylesheets/*.scss     compiled to .css (optional)
javascripts/*.js       served verbatim
javascripts/*.ts       transpiled to .js (optional)
store.json             local mock data (not shipped)
store.schema.json      schema for store.json
```

## Preprocessors

Optional and zero-config. Put a `.scss` file in `stylesheets/` or a `.ts` file
in `javascripts/`:

- `.scss` → compiled to `<name>.css` with dart-sass. Files named `_*.scss` are
  partials and are not emitted; `@use`/`@import` resolve against the file's
  directory.
- `.ts` → `<name>.js` by type erasure only (TypeScript `transpileModule`). No
  bundling and no cross-file imports — one file in, one file out. `.d.ts` files
  are ignored.
- Both `dev` and `build` compile them; the export only contains `.css`/`.js`.
- Sass runs before Liquid and is not Liquid-aware. Keep `{{ config[...] }}` out
  of `.scss` — put merchant-configurable values in a plain `.css` file
  (`:root { --x: {{ config['x'] }} }`) and reference `var(--x)` from Sass.

### Routes → templates

| Path                                                                            | Template                           |
| ------------------------------------------------------------------------------- | ---------------------------------- |
| `/`                                                                             | `index.html`                       |
| `/store`, `/categories/:slug`                                                   | `category.html`                    |
| `/products/:slug`                                                               | `product.html`                     |
| `/artists`, `/artists/:slug`, `/artists/:slug/products`                         | `roster.html` / `roster-item.html` |
| `/news`, `/news/posts/:slug`                                                    | `news.html` / `news-item.html`     |
| `/events`, `/events/:slug`                                                      | `events.html` / `event.html`       |
| `/gallery`, `/history`, `/contact`, `/search?q=`, `/orders/:id`, `/maintenance` | matching template                  |
| anything else                                                                   | `404.html` (status 404)            |

Routes are reconstructed from the original `limitedrun-themekit` gem; Limited Run
does not publish a routing table.

## Liquid support

Ruby-Liquid-flavoured (the platform runs `liquid ~> 2.6`), rendered here with
liquidjs. Custom filters: `money`, `money_with_currency`, `simple_format`,
`ordinalize`, `asset_url`, `stylesheet_tag`, `script_tag`, `img_tag`,
`favicon_tag`, `link_to_page` / `link_to_category` / `link_to_news_item` /
`link_to_roster_item` / `link_to_download`. Custom tags: `{% include %}`
(param-passing, path-traversal-guarded), `{% paginate %}` and `{% contact_form %}`
(pass-through), `{% captcha %}` (static placeholder).

This is a best-effort approximation of the platform renderer — a few documented
filters (`capitalize`, `link_to`, `link_to_javascript`, `link_to_product`,
`money_without_currency`) are not implemented yet. See
[`docs/research/limitedrun-theme-api.md`](../../docs/research/limitedrun-theme-api.md).

## Extending the asset pipeline

`limitedrun dev` and `limitedrun build` both run assets through the registry in
`src/assets/transform.ts`. To add SCSS, TypeScript, or minification, push another
`AssetTransform` onto `transforms` — nothing else changes.

## Library use

The package also exports its internals:

```ts
import { ThemeRenderer, resolveRoute, loadStore, build, createDevApp } from '@limitedrun/cli';
```

## License

MIT. See the repo [LICENSE](../../LICENSE).
