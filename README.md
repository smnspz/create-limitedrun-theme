# create-limitedrun-theme

Modern toolchain for building [Limited Run](https://limitedrun.com/) storefront
themes — a scaffolder plus a local dev/build CLI, in the spirit of
`create-react-app`.

It supersedes the 2014 `limitedrun-themekit` Ruby gem. Like the gem, it renders
themes **locally** against a mock `store.json`; unlike the gem it also scaffolds
new themes, live-reloads on save, and packages an upload-ready zip. There is no
theme API, so deploys are still a manual zip upload in the Limited Run admin.

## Quick start

```sh
npm create limitedrun-theme@latest my-theme
cd my-theme
npm run dev      # preview at http://localhost:4567
```

The scaffolder prompts for a starter theme (or pass `--template <id>`):
`skeleton` (default), `telescope`, `hyde`, `binoculars`, `winter`, `winter-peak`
— ported from Limited Run's own themes. Every starter ships the same
`store.json` mock, a `.gitignore`, and an `AGENTS.md` / `CLAUDE.md` that orient
an AI agent on editing and running the theme.

## Packages

| Package                                                         | What it does                                                                     |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [`create-limitedrun-theme`](./packages/create-limitedrun-theme) | `npm create` scaffolder — picks a starter theme, wires `package.json`            |
| [`@limitedrun/cli`](./packages/cli)                             | `limitedrun dev` (preview + live reload) and `limitedrun build` (validate + zip) |

## CLI

```
limitedrun dev [--path DIR] [--port N] [--strict]
limitedrun build [--path DIR] [--out DIR]
```

- **dev** — Hono server rendering the theme with [liquidjs](https://liquidjs.com/),
  routes matching the platform, stylesheets processed through Liquid, JS served
  verbatim, and a `chokidar` watcher that live-reloads the browser over SSE.
  `--strict` fails on undefined Liquid variables/filters.
- **build** — validates `configs/default.json` and `store.json`, runs
  `stylesheets/` and `javascripts/` through the asset-transform registry
  (identity today — the seam where SCSS / TypeScript / minification plug in
  later), and writes `dist/<name>.zip` in the platform's export layout. Upload
  that zip in the admin under **Storefront → Themes**.

## Theme layout

The authored source is exactly what the platform ingests:

```
configs/default.json      theme settings schema
layouts/default.html      wrapper layout ({{ content }})
templates/*.html          page templates
snippets/*                Liquid partials for {% include %}
stylesheets/*.css         run through Liquid on serve/build
javascripts/*.js          served verbatim
store.json                mock data for local preview (not shipped in the zip)
store.schema.json         JSON Schema for store.json
```

`store.json` is validated on `dev` startup and `build`; a bad file gives a
readable error instead of a stack trace.

## Development

```sh
npm install
npm test          # vitest, all packages
npm run build     # tsup, all packages
npm run lint      # prettier --check + per-package typecheck
```

Node 20+. Versioning and publishing via [Changesets](https://github.com/changesets/changesets).

## License

MIT — see [LICENSE](./LICENSE). Retains the original copyright of the
`limitedrun-themekit` gem by Howard Wilson.
