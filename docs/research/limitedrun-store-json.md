# Where does `store.json` come from?

## Question

"Where do I download the `store.json` file in the Limited Run (limitedrun.com) UI?"
More broadly: does Limited Run's storefront theming system have any concept of a
`store.json` file, and if so, where does it originate?

## Short answer

There is no `store.json` to download anywhere in the Limited Run UI or API.
`store.json` is not a Limited Run concept at all — it is a local, hand-authored
mock-data file invented by the `limitedrun-themekit` gem so that Liquid templates
can be rendered offline. Limited Run's admin theme export gives you only theme
source files (configs / layouts / templates / stylesheets / javascripts); the
live `store` object exists solely as Liquid variables on Limited Run's servers.

## Findings

### 1. `store.json` is a themekit invention for offline rendering, not a Limited Run file

The `limitedrun-themekit` README explains the gem's whole reason for existing:

> "Because Limited Run themes are made up of liquid templates, they can't easily
> be worked on offline. This gem renders the templates locally using mock data to
> speed up development."

Source: <https://github.com/watsonbox/limitedrun-themekit> (README)

### 2. The README tells you to _create_ `store.json` yourself, after exporting the theme

> "Get hold of a responsive theme from Limited Run (export from the admin
> interface), and add a `store.json` to its root. See store.json for an example
> as used in the specs."

So the documented workflow is: (a) export the theme from the Limited Run admin,
(b) manually add a `store.json` at the theme root. It is never described as
something Limited Run supplies or that you download. The only reference example
is the fixture used by the gem's own test suite.

Source: <https://github.com/watsonbox/limitedrun-themekit> (README, "Usage")
Example file: <https://github.com/watsonbox/limitedrun-themekit/blob/master/spec/assets/skeleton-theme/store.json>

### 3. The gem's renderer simply reads `store.json` off disk as mock assigns

`lib/limitedrun-themekit/renderer.rb`:

```ruby
def global_assigns
  { 'config' => theme_config, 'store' => store }
end

def store
  @store ||= Hashie::Mash.new(JSON.parse(File.read(File.join(Limitedrun::Themekit::Config.theme_path, 'store.json'))))
end
```

The file is read from the theme path, parsed as JSON, wrapped in a `Hashie::Mash`,
and exposed to Liquid as the `store` variable (mirroring Limited Run's real
`store` object). `theme_config` also reads an optional `store.config` block from
the same file to override theme settings.

Source: <https://raw.githubusercontent.com/watsonbox/limitedrun-themekit/master/lib/limitedrun-themekit/renderer.rb>

### 4. `watsonbox/telescope-pinna` (the theme the gem was extracted from) treats `store.json` as a hand-edited file

> "Edit `store.json` to modify store data. Reloaded on every request."

The `store.json` in that repo is a hand-built mock of the Pinna Records store:
top-level keys `name`, `mailbox`, `products` (with nested `images`, `variations`,
pricing, availability, SoundCloud IDs), `categories`, `pages`, `roster`, `news`.
It is clearly a curated development fixture, not an export artifact.

Source: <https://github.com/watsonbox/telescope-pinna> (README)
File: <https://github.com/watsonbox/telescope-pinna/blob/master/store.json>

### 5. Limited Run's official theming docs never mention `store.json`, mock data, or local development

- **Anatomy of a Theme** describes the six asset types (layouts, stylesheets,
  javascripts, templates, snippets, configs) and the required files
  (`default.html`, `default.css`, `default.js`, `default.json`). The only
  JSON file in a theme is `default.json`, the theme config
  ("author, images for the Theme Gallery as well as setting definitions"). No
  `store.json`, no data file, no export-to-JSON, no local dev tooling.
  Source: <https://help.limitedrun.com/articles/3-anatomy-of-a-theme>

- **Theme API / Custom HTML** documents the `store` object purely as Liquid
  template variables "Available in all Theme Assets" — `store.name`, `store.url`,
  and collections for categories, products, events, pages, news, history,
  gallery, calendar. There is no mechanism to export or preview a raw JSON
  representation of store data.
  Source: <https://help.limitedrun.com/articles/4-theme-api-custom-html>

- **Designing a New Theme in Secret** and **Changing a Theme's HTML** describe
  editing themes entirely inside the admin dashboard ("Storefront" > "Theme" >
  "HTML / CSS"). No local development environment, config files, data downloads,
  or the themekit gem are mentioned.
  Sources: <https://help.limitedrun.com/articles/designing-a-new-theme-in-secret>,
  <https://help.limitedrun.com/articles/changing-a-themes-html>

### 6. The only Limited Run JSON API is the Fulfiller API — unrelated to theme data

Limited Run exposes a per-store "Fulfiller API" (installed from the App Store),
e.g.
`https://{subdomain}.limitedrun.com/v1/integrations/fulfiller/variations.json?token={api_token}`,
returning variation `sku`, `name`, `price`, `inventory`. This is an inventory /
fulfilment integration endpoint, not a storefront data dump, and its shape does
not match the themekit `store.json` schema.

Source: <https://help.limitedrun.com/articles/fulfiller-api>

### 7. Company disambiguation

`limitedrun.com` ("Limited Run" — commerce & newsletters for labels, musicians,
and artists, docs at help.limitedrun.com) is a different company from **Limited
Run Games** (the physical video-game publisher, en.wikipedia.org/wiki/Limited_Run_Games).
They share a name only. All findings above concern `limitedrun.com`.

## What primary sources could NOT confirm

- **No official statement that `store.json` does or does not exist.** Limited
  Run's docs are simply silent on it — absence of evidence. The conclusion that
  it is purely a themekit construct is inferred from the gem's README/source plus
  the docs' silence, not from an explicit Limited Run "there is no store.json"
  statement.
- **The exact contents of the admin theme export ZIP** are not documented on
  help.limitedrun.com. "Export from the admin interface" is only asserted by the
  themekit README; the current admin UI wording / menu location could not be
  verified against an official page.
- **No canonical / distributed `store.json`.** Only two exist in the wild: the
  gem's spec fixture (`spec/assets/skeleton-theme/store.json`) and the
  `telescope-pinna` theme's file. GitHub code search for other `limitedrun`
  themes containing a `store.json` could not be completed (requires auth); none
  surfaced via web search.
- **No themekit issues/wiki discussing `store.json` provenance** — the repo has
  no matching issues and no wiki.
- **Whether the live `store` object's full schema matches `store.json`.** Limited
  Run documents `store` attributes piecemeal in the Theme API article; there is
  no published complete schema to diff against the mock file.

## Recommendation

The toolchain and its docs should state plainly:

1. **`store.json` is not provided by Limited Run and cannot be downloaded from the
   Limited Run UI or fetched from an API.** It is a local mock-data file you
   author by hand (inherited behaviour from the original `limitedrun-themekit`
   gem), used only to render templates offline.
2. **What Limited Run gives you** is a theme export (ZIP of `configs/ layouts/
templates/ stylesheets/ javascripts/`) from the admin Storefront → Theme →
   HTML/CSS area. The live data (`store.name`, `store.products`, etc.) only ever
   exists as Liquid variables when the theme runs on Limited Run's servers.
3. **Ship a starter `store.json`** in the scaffolder (modelled on
   `telescope-pinna`'s file and the gem's spec fixture) so users have a working
   example to edit, and document its shape as "best-effort mirror of Limited
   Run's `store` Liquid object, per the Theme API docs" — noting it is
   unofficial and may drift from the real object.
4. Link users to the primary sources:
   <https://help.limitedrun.com/articles/3-anatomy-of-a-theme> and
   <https://help.limitedrun.com/articles/4-theme-api-custom-html> for the real
   `store` object, and note the Fulfiller API
   (<https://help.limitedrun.com/articles/fulfiller-api>) is unrelated.
5. Avoid implying any connection to Limited Run Games.
