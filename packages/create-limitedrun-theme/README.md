# create-limitedrun-theme

Scaffold a new [Limited Run](https://limitedrun.com/) storefront theme project —
the `npm create` entry point for the [`@limitedrun/cli`](../cli) toolchain.

```sh
npm create limitedrun-theme@latest my-theme
cd my-theme
npm run dev
```

## What it does

Runs a short wizard (target directory + starter theme), then writes a ready-to-run
project:

```
my-theme/
  configs/default.json      theme settings schema
  layouts/default.html      the wrapper; templates render into {{ content }}
  templates/*.html          one file per page type
  snippets/*.html           partials for {% include %}
  stylesheets/*.css         Liquid-processed on serve/build
  javascripts/*.js          served verbatim
  store.json                local mock data for the preview (never shipped)
  store.schema.json         JSON Schema for store.json
  package.json              scripts wired to `limitedrun dev` / `limitedrun build`
  .gitignore
  README.md
  AGENTS.md  CLAUDE.md       agent guide: commands, layout, Liquid API reference
```

Then, unless told otherwise, runs `npm install` and `git init`.

## Starter themes

`--template <id>` (or pick in the prompt). All are ports of Limited Run's own
themes and share the same `store.json` mock.

| id            | notes                                            |
| ------------- | ------------------------------------------------ |
| `skeleton`    | minimal, no snippets — the default               |
| `telescope`   | responsive, background image, colour pickers     |
| `hyde`        | featured image, grid hover effects, social icons |
| `binoculars`  | responsive, background image, sidebar snippet    |
| `winter`      | responsive, background image                     |
| `winter-peak` | `winter` with a bolder header                    |

## Usage

```
npm create limitedrun-theme@latest [directory] [options]

Options:
  -t, --template <id>   skeleton | telescope | hyde | binoculars | winter | winter-peak
  -y, --yes             accept defaults (template: skeleton), no prompts
      --no-install      skip `npm install`
      --no-git          skip `git init`
```

`--yes` makes it non-interactive for CI. `directory` may be nested and is created
if missing; it must not already exist.

## After scaffolding

```sh
npm run dev      # preview on http://localhost:4567, live-reloads on save
npm run build    # writes dist/<name>.zip
```

Upload `dist/<name>.zip` in the Limited Run admin under **Storefront → Themes**.
Edit `store.json` to change the data the preview renders against — it is a local
mock only and is excluded from the build.

See the generated `AGENTS.md` for the full Liquid Theme API reference (objects,
filters, tags, template→route map, `configs/default.json` formats).

## Local development of this package

Not published yet. To test the current build against a scaffolded project:

```sh
# once, from the monorepo root
npm install && npm run build
cd packages/cli && npm link

# scaffold without installing the (unpublished) CLI, then link it
node ../create-limitedrun-theme/dist/bin.js /tmp/my-theme --yes --no-install --no-git
cd /tmp/my-theme && npm link @limitedrun/cli && limitedrun dev
```

`npm run test -w create-limitedrun-theme` shells the built `bin.js` against every
template id.

## License

MIT. See the repo [LICENSE](../../LICENSE) — retains the original copyright of the
`limitedrun-themekit` gem.
