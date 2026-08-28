# create-limitedrun-theme — agent guide

Onboarding for an agent working on this repo for the first time. Read this before
touching code.

## What this repo is

A modern Node/TypeScript toolchain for building [Limited Run](https://limitedrun.com/)
storefront **themes** — "create-react-app for Limited Run themes". It replaces the
2014 Ruby gem `limitedrun-themekit` (which was only a local Sinatra preview
server, now deleted from the repo).

npm workspaces monorepo, two published packages:

| Package                            | Bin                       | Does                                                                                                      |
| ---------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `packages/cli` → `@limitedrun/cli` | `limitedrun`              | `limitedrun dev` (local preview + live reload) and `limitedrun build` (validate + zip a theme for upload) |
| `packages/create-limitedrun-theme` | `create-limitedrun-theme` | `npm create limitedrun-theme` — scaffolds a theme project from a starter template                         |

**Scope is local-only.** Limited Run has no theme deployment API (verified —
`docs/research/`). Deploying a theme = uploading a zip by hand in the admin.
`limitedrun build` produces that zip. There is intentionally no `push`/`pull`/
`deploy` command.

## Core facts / mental model

- A Limited Run theme is **Liquid templates + CSS + JS** in a fixed directory
  layout the platform ingests verbatim: `configs/ layouts/ templates/ snippets/
stylesheets/ javascripts/`. **Never rename or restructure these** — the layout
  is the platform's contract.
- Templating is **Ruby Liquid ~2.6** (2013-era, _not_ Shopify Liquid). We render
  it with **liquidjs**. Watch for dialect gaps — see "liquidjs vs Ruby Liquid"
  below.
- `stylesheets/*.css` are **run through Liquid** (with only `config` in scope) on
  serve and build — themes put `{{ config['color'] }}` in CSS. `javascripts/*`
  are served verbatim.
- **Optional preprocessors**: `stylesheets/*.scss` compile to `.css` (dart-sass,
  pure JS) and `javascripts/*.ts` type-strip to `.js` (`typescript` compiler) on
  both dev and build — the export only holds `.css`/`.js`. Wired in
  `assets/transform.ts`. Sass is not Liquid-aware — `.scss` is treated as pure
  Sass; `_*.scss` partials and `.d.ts` are not emitted.
- `store.json` at a theme root is **local mock data** for the preview — it stands
  in for the `store`/`product`/… objects the platform provides at request time.
  It is authored by hand, validated against `store.schema.json`, and **excluded
  from `limitedrun build`**. It is not a Limited Run concept (`docs/research/limitedrun-store-json.md`).

## `packages/cli` (`@limitedrun/cli`)

```
src/
  bin.ts                 CLI entry — parseArgs, dispatch dev|build
  index.ts               public library exports
  commands/
    dev.ts               `limitedrun dev`: Hono server + chokidar + SSE live reload
    build.ts             `limitedrun build`: validate → asset transform → dist/<name>.zip
  renderer/
    engine.ts            ThemeRenderer — wraps liquidjs; renderPage/renderBare/renderStylesheet
    routes.ts            explicit route table: URL path → template + per-route assigns
    assigns.ts           THEME_DIRS constant; loadGlobals (config + store + store_script_tag)
    filters.ts           custom Liquid filters (money, simple_format, stylesheet_tag, link_to_*, …)
    tags.ts              custom Liquid tags ({% include %} guarded, {% paginate %}/{% contact_form %} pass-through, {% captcha %} stub)
  store/
    load.ts              loadStore — read + JSON-parse + ajv schema-check, friendly errors
    store.schema.json    the authoritative draft-07 schema for store.json
  assets/
    transform.ts         AssetTransform registry — raw .css/.js pass-through, .scss→.css (sass), .ts→.js (tsc type-strip); minify plugs in here
  fixtures/skeleton-theme/   real "Skeleton" theme + store.json — CLI test fixture ONLY (not shipped)
test/                    vitest — renderer, preview (3 ported gem specs), tags, filters, build, templates
```

Render flow: `dev.ts` route handler → `resolveRoute(pathname, store)` → `ThemeRenderer.renderPage/renderBare` → liquidjs (`layouts/default.html` wraps the template as `{{ content }}`). Files are re-read every request so edits show up on reload.

Build flow: `build.ts` validates `configs/default.json` + `store.json`, copies
`configs/layouts/templates/snippets` verbatim, runs `stylesheets/javascripts`
through `applyTransforms`, writes `dist/<name>/` + `dist/<name>.zip` (fflate).
`store.json`, `store.schema.json`, and Node files are excluded; `README.md` is
included if present.

## `packages/create-limitedrun-theme`

```
src/bin.ts               @clack/prompts wizard: target dir + starter template,
                         then cp(template) + cp(_shared) overlay, write package.json /
                         README.md / AGENTS.md / CLAUDE.md, optional npm install + git init
templates/
  skeleton/ telescope/ hyde/ binoculars/ winter/ winter-peak/   starter themes (ported from Limited Run's own)
  _shared/                store.json + store.schema.json + _gitignore, overlaid onto every scaffold
test/scaffold.test.ts    shells the built bin against every template id
```

The scaffolded `package.json` pins `@limitedrun/cli` from npm. For local testing,
`npm link` it (see README "realistic" flow).

Generated `AGENTS.md` (from `THEME_AGENTS(name)` in `src/bin.ts`) carries a full
Limited Run Theme API reference — keep it in sync with `docs/research/limitedrun-theme-api.md`.

## Commands

```sh
npm install                      # root, hoists everything
npm test --workspaces            # all vitest suites (cli: 6 files, scaffolder: 1)
npm run build                    # tsup, both packages → dist/
npm run lint                     # prettier --check + tsc --noEmit per workspace
npm run format                   # prettier --write

# run the CLI without publishing:
node packages/cli/dist/bin.js dev --path packages/cli/fixtures/skeleton-theme
node packages/create-limitedrun-theme/dist/bin.js my-theme --yes --no-install --no-git
```

Node 20+ (dev machine has 22). ESM-only, TypeScript strict.

## Conventions

- **Comments & JSDoc**: `.agents/guidelines/javascript-functions.md` is binding.
  Every named module-level function/method gets a JSDoc block (summary, blank
  line, `@param`/`@returns`, `@throws`/`@yields` where relevant). Function bodies
  get verb-first **block** comments, blank-line separated, essence only — no
  per-line narration of obvious code, no parenthetical enumerations.
  `packages/cli/src/commands/build.ts` is the canonical example.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`,
  `refactor:`). Commit per completed unit of work, not big batches.
- **Pre-commit hook** (Husky): runs lint-staged (Prettier) → `npm run typecheck`
  → `npm test`. It must pass; both must be green before committing.
- **Formatting**: Prettier only. (Biome was tried but its native binary needs
  glibc 2.29+; this host has 2.28.)
- **Versioning/release**: Changesets. `.github/workflows/release.yml` publishes
  on merge to `main`. Nothing is published to npm yet — see
  `docs/research/` and the memory notes.
- **README maintenance**: update the relevant README when setup/commands/
  architecture change.

## liquidjs vs Ruby Liquid — known gaps

- `{% assign x = (coll | first) %}` — parens make liquidjs parse a **range** and
  throw. Themes must drop the redundant parens (fixed in the winter starters).
- Predicate props (`product.available?`) — liquidjs supports `?` in property
  names, and the fixture `store.json` uses `"available?": true` keys. Works, but
  fragile.
- Lenient by default (undefined → empty). `limitedrun dev --strict` turns on
  `strictVariables`/`strictFilters`.
- Our renderer is a **best-effort approximation**. Missing documented filters:
  `capitalize` (LR title-cases every word), `link_to`, `link_to_javascript`,
  `link_to_product`, `money_without_currency`. See
  `docs/research/limitedrun-theme-api.md`.

## Research notes

`docs/research/` holds primary-source studies (each: Question / Short answer /
Findings with source URLs / gaps / Recommendation):

- `limitedrun-store-json.md` — store.json is an unofficial local-mock concept
- `limitedrun-theme-api.md` — the Liquid templating API, verified against
  help.limitedrun.com; contains the AGENTS.md reference block
- `limitedrun-api.md` — the Fulfiller/HTTP API (in progress)

## Where to start for common tasks

| Task                                    | Start at                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| A route renders wrong                   | `renderer/routes.ts` (assigns) then the template                                    |
| A Liquid filter/tag is missing or wrong | `renderer/filters.ts` / `renderer/tags.ts` + a test                                 |
| `dev` server behaviour                  | `commands/dev.ts`                                                                   |
| Zip contents / build validation         | `commands/build.ts`                                                                 |
| store.json shape / validation errors    | `store/store.schema.json` + `store/load.ts`                                         |
| Add minification / another asset lang   | register an `AssetTransform` in `assets/transform.ts` (`.scss`/`.ts` already wired) |
| New starter theme                       | add `templates/<id>/`, register in `TEMPLATES` in the scaffolder                    |
| Change generated project files          | `THEME_*` functions in `create-limitedrun-theme/src/bin.ts`                         |
