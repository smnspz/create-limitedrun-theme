#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import * as p from '@clack/prompts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_ROOT = path.join(HERE, '..', 'templates');

/** Starter themes bundled with the scaffolder (directories under templates/). */
const TEMPLATES = [
  { id: 'skeleton', label: 'Skeleton', hint: 'Minimal starting point, no snippets' },
  { id: 'telescope', label: 'Telescope', hint: 'Responsive, background image, color pickers' },
  { id: 'hyde', label: 'Hyde', hint: 'Featured image, highly customizable' },
  { id: 'binoculars', label: 'Binoculars', hint: 'Responsive, background image' },
  { id: 'winter', label: 'Winter', hint: 'Responsive, background image' },
  { id: 'winter-peak', label: 'Winter Peak', hint: 'Winter with a bolder header' },
] as const;

/**
 * Read this package's own version from its package.json, used to pin the
 * generated theme's `@limitedrun/cli` dependency.
 *
 * @returns the version string (e.g. `0.1.0`)
 */
async function ownVersion(): Promise<string> {
  const pkg = JSON.parse(await readFile(path.join(HERE, '..', 'package.json'), 'utf8'));
  return pkg.version as string;
}

/**
 * Build the `package.json` contents for a generated theme project.
 *
 * @param name - the theme/project name (the target directory's basename)
 * @param cliVersion - version to pin `@limitedrun/cli` to, as `^<version>`
 * @returns the file contents, newline-terminated
 */
function themePackageJson(name: string, cliVersion: string): string {
  return `${JSON.stringify(
    {
      name,
      version: '0.1.0',
      private: true,
      description: 'A Limited Run theme',
      scripts: {
        dev: 'limitedrun dev',
        build: 'limitedrun build',
      },
      devDependencies: {
        '@limitedrun/cli': `^${cliVersion}`,
      },
    },
    null,
    2,
  )}\n`;
}

/**
 * Build the README.md contents for a generated theme project.
 *
 * @param name - the theme/project name
 * @returns the Markdown document
 */
const THEME_README = (name: string) => `# ${name}

A [Limited Run](https://limitedrun.com/) theme.

## Develop

\`\`\`sh
npm run dev      # preview at http://localhost:4567, live-reloads on save
npm run build    # produce dist/${name}.zip
\`\`\`

Edit \`store.json\` to change the mock data the preview renders against.
\`store.json\` is a local mock only — it is never uploaded to Limited Run.

## SCSS / TypeScript (optional)

Rename a stylesheet to \`.scss\` or a script to \`.ts\` and it is compiled to
plain \`.css\`/\`.js\` on \`dev\` and \`build\` automatically — no config, no extra
install. Sass partials are \`_name.scss\`; \`.ts\` is type-stripped only (no
bundling). Keep \`{{ config[...] }}\` out of \`.scss\` — use a plain \`.css\` file
with CSS custom properties for merchant-configurable values.

## Deploy

\`npm run build\`, then upload \`dist/${name}.zip\` in the Limited Run admin
under Storefront → Themes.
`;

/**
 * Build the AGENTS.md contents for a generated theme project — orientation for
 * an AI agent editing or running the theme.
 *
 * @param name - the theme/project name
 * @returns the Markdown document
 */
const THEME_AGENTS = (name: string) => `# ${name} — agent guide

This is a [Limited Run](https://limitedrun.com/) storefront theme: Liquid
templates plus CSS and JavaScript. It is built and previewed locally with
@limitedrun/cli; there is no theme *deployment* API, so shipping means uploading
a zip by hand in the Limited Run admin. (The Liquid templating API is documented
in the reference at the end of this file.)

## Commands

    npm run dev      # preview server on http://localhost:4567, live-reloads on save
    npm run build    # writes dist/${name}.zip in the platform's export layout

Run "npm install" first if node_modules/ is missing.

## Layout — do not rename these directories

    configs/default.json   theme settings schema (name, description, settings.*)
    layouts/default.html   the wrapper; page templates render into {{ content }}
    templates/*.html       one file per page type (see the table below)
    snippets/*             partials pulled in with {% include 'file.html' %}
    stylesheets/*.css      run through Liquid on serve/build (see below)
    stylesheets/*.scss     compiled to .css automatically (optional, see below)
    javascripts/*.js       served verbatim
    javascripts/*.ts       transpiled to .js automatically (optional, see below)
    store.json             LOCAL MOCK DATA — never shipped, edit freely
    store.schema.json      JSON Schema for store.json (validated on dev + build)

## Editing rules

- Keep layouts/default.html as the single wrapper; every non-standalone template
  is injected as {{ content }}.
- store.json must stay valid against store.schema.json — "npm run dev" fails
  loudly with the offending paths otherwise. Add fields freely, but match the
  shapes real templates read (product.price_range, store.roster.items, …).
- Stylesheets are Liquid-processed with only "config" in scope. Use
  {% assign x = config['some_setting'] %} then {{ x }}; add a matching key under
  "settings" in configs/default.json so it appears in the admin.
- After any change, run "npm run build" — it re-validates and produces the
  uploadable zip. Fix anything it reports before handing back.

## SCSS and TypeScript (optional)

Drop a ".scss" file in stylesheets/ or a ".ts" file in javascripts/ and it is
compiled to plain ".css"/".js" on both "npm run dev" and "npm run build" — the
zip only ever contains ".css"/".js". No config, no extra install.

- Sass files starting with "_" are partials (not emitted); "@use"/"@import"
  resolve against the file's directory.
- ".ts" is type-erased only — one file in, one file out. No bundling, no
  imports across files.
- Sass is not Liquid-aware. Keep "{{ config[...] }}" out of ".scss"; put those
  values in a plain ".css" file (":root { --x: {{ config['x'] }} }") and read
  them in Sass with "var(--x)".

## Deploy

"npm run build", then upload dist/${name}.zip in the Limited Run admin under
Storefront → Themes. store.json and store.schema.json are excluded from the zip
automatically.

## Production quirks — read before shipping

The LR production renderer disagrees with the local dev server in specific,
undocumented ways. When an upload breaks and you can't tell why, check this
list first — every item was confirmed by bisection while shipping a real store.

### Debugging is blind

When your theme is broken you get one of: a black *"We're sorry, but something
went wrong"* page (LR's fallback), \`HTTP 200\` with an empty body (0 bytes),
or LR's default Foundation/Skeleton theme silently rendered instead of yours.
There is no way to get a stack trace or Liquid parser message from production.
Bisect by uploading progressively simpler themes until one renders, then add
one thing back.

### Every upload creates a new theme entry — activate it

Uploading a zip does NOT overwrite the current theme. LR adds a new
"Imported ..." card in Storefront → Themes and leaves the old one active.
After every upload: find the newest card and click **"Use This Theme"**, then
reload. If you skip this step you're staring at your previous upload.

To confirm which upload is live during debugging, embed a visible marker in
the layout (e.g. a fixed-position \`<p>\` with a build ID). If the marker
isn't visible, LR is serving something else.

### Zip layout is flat at the archive root

LR's importer expects standard directories at the **root** of the archive,
NOT wrapped inside a top-level folder:

    ${name}.zip
    ├── configs/default.json
    ├── layouts/default.html
    ├── snippets/*.html
    ├── stylesheets/default.css
    ├── javascripts/default.js
    └── templates/*.html

Do not nest inside a \`${name}/\` folder — LR silently ignores nested zips.
The @limitedrun/cli \`build\` command already produces the correct flat
layout; if you re-zip manually, use \`cd dist/${name} && zip -r ../${name}.zip .\`.

### All 16 standard templates must be present

Even if you don't use news, roster, history, gallery, events, contact, or
search, LR still expects every template file. Deleting any of them causes
the theme to fail (empty response). Include a minimal stub for each unused
template. \`maintenance.html\` must be self-contained (own \`<!DOCTYPE>\`).

### \`<meta name="description">\` in the layout crashes the renderer

Confirmed by bisection: adding any \`<meta name="description">\` tag to
\`layouts/default.html\` — even a plain ASCII string, even outside any
\`{% if %}\` — makes the storefront return LR's 500 page. Omit the tag.
Meta tags in general are risky; add them cautiously and test each one.

### A pre-rendered cart overlay in the layout crashes the renderer

Any \`<div class="cart-overlay">...\` block in the layout, with any
combination of \`.cart-panel\`, \`[data-cart-*]\`, \`role="dialog"\`,
\`aria-label\`, or \`hidden\` attributes, breaks the storefront. Use LR's
default drawer instead:

    window.Store?.cart?.add?.(variationId);  // add to cart
    window.Store?.cart?.show?.();            // open the drawer

If you really need a custom cart UI, inject its DOM at runtime from
\`default.js\` after \`DOMContentLoaded\`; keep the markup out of Liquid.

### Custom fonts and images go through the LR UI

External \`<link>\` to Google Fonts, bunny.net, jsDelivr etc. work but add a
runtime dependency you don't control. LR provides a native pipeline:
Storefront → **HTML / CSS** → edit \`configs/default.json\` → **Upload font**
or **Upload image**. LR returns a public CDN URL (e.g.
\`https://f9.limitedrun.com/fonts/1852/berkeley-mono-variable-2.ttf\`) that
you embed in your CSS via \`@font-face\` or in an \`<img>\` tag.

### Undocumented objects that exist in production

- \`store.subdomain\` — the store's LR subdomain. Used by the native
  newsletter form: \`newsletters.limitedrun.com/subscribe?store={{ store.subdomain }}\`.
- \`favicon_tag\` filter — renders a favicon config setting as a \`<link>\`.
- \`{% contact_form %}\` block — form generator.
- \`{% captcha %}\` tag — themes: \`red white blackglass clean\`.
- \`{{ store_script_tag }}\` — required once per page; loads \`store.js\`
  which provides \`window.Store\`.

### Undocumented objects that do NOT exist

- \`store.mailbox.email\` — only \`.title\` is on \`mailbox\`. Hardcode
  contact addresses instead of reading a nonexistent field.

### Native newsletter endpoint

Not in the docs but present in the Hyde reference theme. Subscribers land in
the LR admin mailbox section.

    <form action="//newsletters.limitedrun.com/subscribe?store={{ store.subdomain }}"
          method="post" target="_blank">
      <input type="email" name="email" required>
      <button type="submit">Subscribe</button>
    </form>

### Verify zip integrity before uploading

Whenever you copy the zip from \`dist/\` to a browser-accessible location,
confirm byte-identity:

    shasum dist/${name}.zip ~/Downloads/${name}.zip
    cmp    dist/${name}.zip ~/Downloads/${name}.zip && echo IDENTICAL

\`cp\` preserves bytes, but a broken editor plugin or partial copy can
silently truncate. One-second check worth doing.

### Bisection playbook

When an upload breaks and you can't tell why:

1. Replace \`layouts/default.html\` with a hardcoded minimum:

       <!DOCTYPE html><html><head><title>t</title>
       {{ 'default.css' | asset_url | stylesheet_tag: 'screen' }}
       </head><body><p>DIAG</p><div>{{ content }}</div>
       {{ store_script_tag }}</body></html>

   Replace \`templates/index.html\` with a single \`<p>index OK</p>\`.
2. Upload, activate the new import, reload. If "DIAG / index OK" appears,
   the pipeline is fine. If not, the trigger is in your zip structure,
   activation, or configs.
3. Add pieces back in this order, one per upload cycle (build → repack →
   upload → activate → reload):
   snippet includes, real header/nav markup, \`<title>\` conditionals, real
   page templates, JS asset, then \`<meta>\` tags one at a time.
4. The moment the storefront breaks, the last thing you added is the trigger.

Keep a visible marker in every intermediate build so you always know which
upload the store is actually serving.

---

## Limited Run Theme API — reference

Templating is **Ruby Liquid**, ~2.6-era (2013), **not Shopify Liquid**: no
{% render %}, no {%- whitespace control -%}, no map/where/default filters.
Standard {{ output }} / {% tag %} plus the Limited Run objects and filters below.
Official docs are the only authority and are thin:

- https://help.limitedrun.com/articles/4-theme-api-custom-html  (objects, filters, tags)
- https://help.limitedrun.com/articles/3-anatomy-of-a-theme     (files, configs/default.json)

Everything marked (unofficial) below comes from Limited Run's own "Skeleton"
theme, not the articles — real, but undocumented.

### Standard tags (Liquid 2.6 built-ins)

    {% if %} {% elsif %} {% else %} {% unless %} {% for x in y limit:5 %}
    {% assign %} {% capture %} {% case %} {% cycle %} {% comment %} {% raw %} {% tablerow %}
    forloop.first / forloop.last / forloop.index

### Objects (official; "store" is available in every asset)

    store        .name .url
                 .products .categories .events .pages .mailbox
                 .news(.items) .history(.items) .gallery(.items)
                 .calendar(.events) .roster(.items)
    category     .name .slug .url .custom['k']  |  .products
    product      .state .name .slug .description .url .price_range
                 .music_catalog_number .music_pressing_information .custom['k']
                 .categories .images .variations .music_track_listings
                 predicates: .available? .announced? .unavailable? .unlisted?
    event        like product + (unofficial) .starts_at .venue .images .variations
    image        .url .v075_url .v150_url .v200_url .v300_url .v600_url
    variation    .name .description .price .weight .requires_exact_payment .available?
    order        .key .number .state .status .transaction_id .item_count .digital
                 .subtotal .shipping .total_price .total_weight .attempted?
                 .items .downloads .customer .shipping_address
    order item   .name .digital .unit_price .quantity .total_price .total_weight
    customer     .email .first_name .last_name
    address      .first_name .last_name .street_address_1 .street_address_2
                 .city .state .postal_code .country
    page         .title .path .url .body
    news item    .title .slug .url .body .published_at .custom['k']
    history item .released_on .released_by .catalog_number .name .description
                 .release_information .images .links
    roster item  .name .slug .description .url .custom['k']
                 .history_items .images .links .products
    link         .name .url
    config       config['setting_key']  (also usable inside stylesheets)

Module-gated: news / history / roster / gallery / calendar objects exist only if
that paid module is enabled on the store.

### Custom filters (official — article #4)

    asset_url            {{ 'default.css' | asset_url | stylesheet_tag: 'screen' }}
    stylesheet_tag[: media]   script_tag   img_tag[: 'class']   favicon_tag (unofficial)
    link_to: url    link_to_javascript: js
    link_to_category  link_to_product  link_to_page  link_to_news_item
    link_to_download  link_to_roster_item (unofficial)
    money   money_with_currency   money_without_currency
    ordinalize   simple_format
    capitalize (title-cases EVERY word — differs from standard Liquid)  downcase  upcase
    first  last  join: sep  size
    standard Liquid: date  escape  strip_html  strip_newlines  replace  strip

### Custom tags

    {% include 'snippet.html' %}                              (official — Anatomy)
    {% paginate store.products by 30 %}                        (official)
      … {{ store.products_pagination }} …
    {% endpaginate %}
      pagination vars seen: store.products_pagination, store.events_pagination,
      category.products_pagination, news.items_pagination,
      history.items_pagination, gallery.items_pagination
    {% contact_form %} … {% endcontact_form %}                 (unofficial)
      required fields: message[name] message[email] message[body]  (+ opt message[subject])
    {% captcha clean %}   themes: red white blackglass clean    (unofficial)
    {{ store_script_tag }}   REQUIRED once per page — loads store.js cart JS  (unofficial)

### Template → page (files official unless noted; routes are unverified guesses)

    default.html      layout, wraps every page ({{ content }})        official
    index.html        home / product grid                             official   /
    category.html     a category (vars: category, category.products)  official   /categories/:slug
    product.html      a product (var: product)                        official   /products/:slug
    order.html        order status (var: order)                       official
    maintenance.html  store-closed page (own <!DOCTYPE>, config only) official
    404.html          not found                                       official
    news.html / news-item.html    news index / post (var: item)       official
    history.html / gallery.html   module index pages                  official
    contact.html      contact form (vars: message, store.mailbox)     official
    event.html / events.html      a show / shows listing              unofficial
    roster.html / roster-item.html   artists / one artist             unofficial (roster-item takes ?section=products)
    search.html       product search (vars: products, query)          unofficial   /products/search?q=

### configs/default.json (official — Anatomy)

    root:    name, description, author{name,website},
             images[{thumbnail,original}], settings{}
             (Skeleton also uses: sort <number>)
    setting: REQUIRED  key, format, label, position (number)
             OPTIONAL  default, help, placeholder
             format:   "image" | "color" | "text" | "boolean"
             (Skeleton also uses "content_type": true — undocumented)

### Not supported / unknown (no official statement either way)

- No "cart" Liquid object — the cart is JavaScript only (Store.cart.add /
  Store.cart.show).
- No multiple layouts, sections, metafields, i18n, or configs other than
  default.json.
- No documented output size or loop limits.

This local renderer is a best-effort approximation: some filters above
(link_to, link_to_javascript, link_to_product, money_without_currency,
capitalize) may render empty or unchanged in preview but work in production.
`;

/** CLAUDE.md contents for a generated theme project. */
const THEME_CLAUDE = 'See [AGENTS.md](./AGENTS.md) for how to edit and run this theme.\n';

/**
 * Ask a yes/no question, exiting the process if the user cancels the prompt.
 *
 * @param message - the question to display
 * @returns the user's choice
 */
async function confirm(message: string): Promise<boolean> {
  // Exit the whole process if the user hits Ctrl-C
  const answer = await p.confirm({ message });
  if (p.isCancel(answer)) {
    p.cancel('Cancelled.');
    process.exit(1);
  }
  return answer;
}

/**
 * Run the scaffolder: resolve the target directory and starter template
 * (from flags/positionals or interactive prompts), copy the template plus the
 * shared store mock, write `package.json` / `README.md` / `AGENTS.md` /
 * `CLAUDE.md`, and optionally run `npm install` and `git init`.
 *
 * @returns a promise that resolves once the theme has been created
 */
async function main(): Promise<void> {
  // Parse the flags and positionals
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      template: { type: 'string', short: 't' },
      install: { type: 'boolean' },
      'no-install': { type: 'boolean' },
      git: { type: 'boolean' },
      'no-git': { type: 'boolean' },
      yes: { type: 'boolean', short: 'y' },
    },
  });

  p.intro('create-limitedrun-theme');

  // Resolve the target directory, prompting if none was given
  let dir = positionals[0];
  if (!dir) {
    const answer = await p.text({
      message: 'Where should the theme live?',
      placeholder: 'my-theme',
      defaultValue: 'my-theme',
    });
    if (p.isCancel(answer)) return p.cancel('Cancelled.');
    dir = answer || 'my-theme';
  }
  const target = path.resolve(dir);
  const name = path.basename(target);

  // Refuse to overwrite an existing directory
  if (existsSync(target)) {
    p.cancel(`${dir} already exists — choose another directory.`);
    process.exit(1);
  }

  // Resolve the starter template from --template, or reject an unknown id
  let templateId = values.template;
  if (templateId && !TEMPLATES.some((t) => t.id === templateId)) {
    p.cancel(`Unknown template '${templateId}'. Options: ${TEMPLATES.map((t) => t.id).join(', ')}`);
    process.exit(1);
  }

  // Otherwise prompt for it (or default to skeleton under --yes)
  if (!templateId) {
    if (values.yes) {
      templateId = 'skeleton';
    } else {
      const picked = await p.select({
        message: 'Which starter theme?',
        options: TEMPLATES.map((t) => ({ value: t.id, label: t.label, hint: t.hint })),
        initialValue: 'skeleton',
      });
      if (p.isCancel(picked)) return p.cancel('Cancelled.');
      templateId = picked as string;
    }
  }

  // Decide install / git from flags, --yes, or a prompt
  const doInstall = values['no-install']
    ? false
    : values.install || values.yes
      ? true
      : await confirm('Install dependencies with npm?');
  const doGit = values['no-git']
    ? false
    : values.git || values.yes
      ? true
      : await confirm('Initialize a git repository?');

  // Copy the template, then overlay the shared store mock and .gitignore
  const s = p.spinner();
  s.start(`Creating theme from "${templateId}"`);
  await cp(path.join(TEMPLATES_ROOT, templateId), target, { recursive: true });
  await cp(path.join(TEMPLATES_ROOT, '_shared'), target, { recursive: true });
  await rename(path.join(target, '_gitignore'), path.join(target, '.gitignore'));
  await writeFile(path.join(target, 'package.json'), themePackageJson(name, await ownVersion()));
  await writeFile(path.join(target, 'README.md'), THEME_README(name));
  await writeFile(path.join(target, 'AGENTS.md'), THEME_AGENTS(name));
  await writeFile(path.join(target, 'CLAUDE.md'), THEME_CLAUDE);
  s.stop('Theme created');

  // Initialize a git repo if requested
  if (doGit) {
    try {
      execSync('git init -q && git add -A', { cwd: target, stdio: 'ignore' });
    } catch {
      p.log.warn('git init failed — skipping.');
    }
  }

  // Install dependencies if requested
  if (doInstall) {
    s.start('Installing dependencies');
    try {
      execSync('npm install', { cwd: target, stdio: 'ignore' });
      s.stop('Dependencies installed');
    } catch {
      s.stop('npm install failed — run it yourself.');
    }
  }

  // Print the next steps
  p.outro(
    [
      `Done. Next:`,
      ``,
      `  cd ${dir}`,
      ...(doInstall ? [] : ['  npm install']),
      `  npm run dev`,
    ].join('\n'),
  );
}

// Run, printing any error and exiting non-zero
main().catch((err) => {
  p.log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
