# Limited Run storefront Theme API (Liquid templating)

## Question

What Liquid objects, attributes, filters, tags, and template files does Limited
Run (limitedrun.com) expose to storefront **themes**? This is the theme
_customization_ API (HTML / Liquid / CSS / JS assets edited in the admin or
exported), not any HTTP/REST API. Verify the custom filters/tags our local
renderer implements (`money`, `simple_format`, `ordinalize`, `stylesheet_tag`,
`asset_url`, `img_tag`, `favicon_tag`, `link_to_*`, `{% include %}`,
`{% paginate %}`, `{% contact_form %}`, `{% captcha %}`) and find gaps.

## Short answer

Limited Run's theming is **Ruby Liquid** (the Shopify library, ~2.x-era dialect
circa 2012–2014): standard `{{ output }}` / `{% tag %}` syntax, standard filters
and tags, plus a set of Limited-Run-specific objects and filters. There are two
official primary sources and they are **thin but real**:

- **Theme API / Custom HTML** — <https://help.limitedrun.com/articles/4-theme-api-custom-html>
  Lists the Liquid objects and their attributes (piecemeal, one heading per
  object), the custom filters (with one-line examples), and a short "Tags"
  section.
- **Anatomy of a Theme** — <https://help.limitedrun.com/articles/3-anatomy-of-a-theme>
  Six asset types, the four required files, `{{ content }}`, snippets via
  `{% include %}`, and the `configs/default.json` schema.

Everything else (route map, `{% paginate %}` output variables, `{% contact_form %}`
/ `{% captcha %}` internals, `.css` being run through Liquid, `favicon_tag`,
`store_script_tag`, predicate methods like `product.available?`) is **not in the
official articles** and is reconstructed from the 2014 `watsonbox/limitedrun-themekit`
gem and its bundled "Skeleton" theme (authored by "Limited Run",
`configs/default.json` `author.name = "Limited Run"`).

The official articles do **not** define a Liquid version, do **not** mention
`{% raw %}`, and contain **no "not supported" / limits section**.

## Findings

### 1. Two ways to use the API: Output and Tags

> "Every Asset in a Theme supports Limited Run's Theme API and there are two main
> ways to use the API"

> "A filter is structured like `data`, followed by a `pipe`, followed by the
> filter name"

> "there are logic tags that let you do more things with the API objects"

Source: <https://help.limitedrun.com/articles/4-theme-api-custom-html>

Standard Liquid syntax is assumed but never named:

> "`{{ }}` and Tags `{% %}` follow conventional Liquid conventions" (paraphrase of
> the Output/Tags framing on the same page)

No Liquid version, dialect, or "Shopify-compatible" claim appears anywhere on
help.limitedrun.com. The gem confirms it is the Ruby `liquid` gem
(`require 'liquid'`, `Liquid::Template.parse`, `Liquid::Block`, `Liquid::Tag`).
Source: <https://raw.githubusercontent.com/watsonbox/limitedrun-themekit/master/lib/limitedrun-themekit/renderer.rb>

### 2. Liquid objects and attributes (official)

The Theme API article has one heading per object, in this order:
`store`, `category`, `product`, `event`, `image`, `variation`, `track listing`,
`order`, `order item`, `download`, `customer`, `address`, `page`, `calendar`,
`news`, `news item`, `history`, `history item`, `roster`, `roster item`, `link`,
`gallery`, `gallery item`, `Miscellaneous`, `Tags`.

> "Available in all Theme Assets" — stated for **`store`** only.

Source (all quotes/attrs in this section): <https://help.limitedrun.com/articles/4-theme-api-custom-html>
(cross-checked against the Skeleton theme templates in the gem:
<https://github.com/watsonbox/limitedrun-themekit/tree/master/spec/assets/skeleton-theme/templates>)

| Object                                 | Documented attributes                                                                                                                                                    | Collections / sub-objects                                                                                                                                          | Notes                                                                                                                                                                                                                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `store`                                | `name`, `url`                                                                                                                                                            | `categories`, `products`, `events`, `pages`, `news` (`.items`), `history` (`.items`), `gallery` (`.items`), `calendar` (`.events`), `roster` (`.items`), `mailbox` | lookup helpers: `store.category_by_slug['x']`, `store.page_by_path['x']`, `store.product_by_id[n]`, `store.product_by_music_catalog_number['x']`, `store.roster_item_by_slug['x']` _(helper names from WebFetch extraction of the article; not independently re-verified — treat as likely-but-unconfirmed)_ |
| `category`                             | `name`, `slug`, `url`, `custom['key']`                                                                                                                                   | `products`                                                                                                                                                         |                                                                                                                                                                                                                                                                                                              |
| `product`                              | `state`, `name`, `slug`, `description`, `url`, `price_range`, `music_catalog_number`, `music_pressing_information`, `custom['key']`                                      | `categories`, `images`, `variations`, `music_track_listings`                                                                                                       | predicates: `unlisted?`, `announced?`, `available?`, `unavailable?`. Skeleton also uses `product.id`, `product.soundcloud_playlist_id`, `product.eligible_for_availability_notices?` (not in article)                                                                                                        |
| `event`                                | `state`, `name`, `slug`, `description`, `url`, `price_range`, `custom['key']`                                                                                            | `images`, `variations`                                                                                                                                             | same predicates as product; Skeleton also uses `event.id`, `event.starts_at`, `event.venue` (`.name`, `.maps_url`, `.street_address_1/2`, `.city`, `.state`, `.postal_code`, `.country`), `event.soundcloud_playlist_id`, `event.eligible_for_availability_notices?`                                         |
| `image`                                | `url`, `v075_url`, `v150_url`, `v200_url`, `v300_url`, `v600_url`                                                                                                        |                                                                                                                                                                    |                                                                                                                                                                                                                                                                                                              |
| `variation`                            | `name`, `description`, `price`, `weight`, `requires_exact_payment`                                                                                                       |                                                                                                                                                                    | predicate `available?`; Skeleton uses `variation.id`                                                                                                                                                                                                                                                         |
| track listing (`music_track_listings`) | `id3_track_number`, `id3_track_artist`, `id3_track_name`                                                                                                                 |                                                                                                                                                                    |                                                                                                                                                                                                                                                                                                              |
| `order`                                | `key`, `paypal_pay_key`, `number`, `state`, `status`, `transaction_id`, `pending_reason`, `item_count`, `digital`, `subtotal`, `shipping`, `total_price`, `total_weight` | `items`, `downloads`, `customer`, `shipping_address`                                                                                                               | predicate `attempted?`; Skeleton also uses `order.discount?`, `order.discount_amount`                                                                                                                                                                                                                        |
| order item                             | `name`, `digital`, `unit_price`, `unit_weight`, `quantity`, `total_price`, `total_weight`                                                                                |                                                                                                                                                                    |                                                                                                                                                                                                                                                                                                              |
| `download`                             | `name`                                                                                                                                                                   |                                                                                                                                                                    | rendered via `{{ download \| link_to_download }}`                                                                                                                                                                                                                                                            |
| `customer`                             | `email`, `first_name`, `last_name`                                                                                                                                       |                                                                                                                                                                    |                                                                                                                                                                                                                                                                                                              |
| `address`                              | `first_name`, `last_name`, `street_address_1`, `street_address_2`, `city`, `state`, `postal_code`, `country`                                                             |                                                                                                                                                                    |                                                                                                                                                                                                                                                                                                              |
| `page`                                 | `title`, `path`, `url`, `body`                                                                                                                                           |                                                                                                                                                                    |                                                                                                                                                                                                                                                                                                              |
| `calendar`                             | `title`, `path`, `url`                                                                                                                                                   | `events`                                                                                                                                                           | "requires Ticket Selling Module"                                                                                                                                                                                                                                                                             |
| `news`                                 | `title`, `path`, `url`                                                                                                                                                   | `items`                                                                                                                                                            | "requires News Module"                                                                                                                                                                                                                                                                                       |
| news item                              | `title`, `slug`, `url`, `body`, `published_at`, `custom['key']`                                                                                                          |                                                                                                                                                                    |                                                                                                                                                                                                                                                                                                              |
| `history`                              | `title`, `path`, `url`                                                                                                                                                   | `items`                                                                                                                                                            | "requires History Module"                                                                                                                                                                                                                                                                                    |
| history item                           | `released_on`, `released_by`, `catalog_number`, `name`, `description`, `release_information`                                                                             | `images`, `links`                                                                                                                                                  | `release_information` is the array `[released_on, released_by, catalog_number]` for `join` (per `{% comment %}` in Skeleton `history.html` / `roster-item.html`)                                                                                                                                             |
| `roster`                               | `title`, `path`, `url`                                                                                                                                                   | `items`                                                                                                                                                            | "requires Roster Module"                                                                                                                                                                                                                                                                                     |
| roster item                            | `name`, `slug`, `description`, `url`, `custom['key']`                                                                                                                    | `history_items`, `images`, `links`, `products`                                                                                                                     | Skeleton also uses `item.soundcloud_playlist_id`, `item.products_pagination`                                                                                                                                                                                                                                 |
| `link`                                 | `name`, `url`                                                                                                                                                            |                                                                                                                                                                    |                                                                                                                                                                                                                                                                                                              |
| `gallery`                              | `title`, `path`, `url`                                                                                                                                                   | `items`                                                                                                                                                            | "requires Gallery Module"                                                                                                                                                                                                                                                                                    |
| gallery item                           | `url`, `v075_url`, `v150_url`, `v200_url`, `v300_url`, `v600_url`                                                                                                        |                                                                                                                                                                    |                                                                                                                                                                                                                                                                                                              |
| Miscellaneous                          | `current_path`, `current_asset` _(from WebFetch extraction of the "Miscellaneous" heading — not re-verified)_                                                            |                                                                                                                                                                    |                                                                                                                                                                                                                                                                                                              |

**Context-injected variables** the article does not tie to a specific object but
that Skeleton templates rely on:

- Layout / detail pages: `product`, `page`, `news`, `item` (used as truthy guards
  in `layouts/default.html`, e.g. `{% if product %}`, `{% elsif news and item %}`).
- `category.html`: `category` (the current category).
- `product.html`: `product`. `event.html`: `event`. `order.html`: `order`.
- `news-item.html`: `item` (the news item). `roster-item.html`: `item`, plus a
  `section` variable (`{% if section == 'products' %}`).
- `contact.html`: `message` (`.name`, `.email`, `.body`, `.subject`,
  `.received`, `.errors`), `store.mailbox.title`.
- `search.html`: `products` (result list) and `query` / `q`.
- `<title>` etc. use `{{ 'now' | date: "%Y" }}`.
  Source: <https://github.com/watsonbox/limitedrun-themekit/blob/master/spec/assets/skeleton-theme/layouts/default.html>
  and sibling templates.

### 3. Custom filters (official)

From the "API" section of <https://help.limitedrun.com/articles/4-theme-api-custom-html>
(examples quoted verbatim):

| Filter                   | Example                                                           | Output / purpose                                                              |
| ------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `asset_url`              | `{{ 'default.css' \| asset_url \| stylesheet_tag: 'screen' }}`    | resolve a theme asset to a cache-busted URL (e.g. `/asset/default-c6324.css`) |
| `stylesheet_tag`         | `{{ 'http://.../main.css' \| stylesheet_tag }}`                   | `<link rel="stylesheet">`; optional media arg (`: 'screen'`)                  |
| `script_tag`             | `{{ 'http://.../jquery.js' \| script_tag }}`                      | `<script src>`                                                                |
| `img_tag`                | `{{ 'http://.../logo.png' \| img_tag }}`                          | `<img>` (Skeleton passes a class arg: `\| img_tag: 'thumbnail'`)              |
| `link_to`                | `{{ 'Google' \| link_to: 'http://google.com' }}`                  | `<a>`                                                                         |
| `link_to_javascript`     | `{{ 'Alert!' \| link_to_javascript: "alert('Hello, World!');" }}` | `<a>` to inline JS                                                            |
| `link_to_category`       | `{{ category \| link_to_category }}`                              | `<a href=category.url>category.name</a>`                                      |
| `link_to_product`        | `{{ product \| link_to_product }}`                                |                                                                               |
| `link_to_page`           | `{{ page \| link_to_page }}`                                      |                                                                               |
| `link_to_news_item`      | `{{ item \| link_to_news_item }}`                                 |                                                                               |
| `link_to_download`       | `{{ download \| link_to_download }}`                              |                                                                               |
| `ordinalize`             | `{{ 2 \| ordinalize }}` → `2nd`                                   |                                                                               |
| `simple_format`          | `{{ product.description \| simple_format }}`                      | line-broken text → `<p>` HTML                                                 |
| `money`                  | `{{ 10 \| money }}` → `$10.00`                                    | storefront currency                                                           |
| `money_with_currency`    | `{{ 10 \| money_with_currency }}` → `$10.00 USD`                  |                                                                               |
| `money_without_currency` | `{{ 10 \| money_without_currency }}` → `10.00`                    |                                                                               |
| `capitalize`             | `{{ 'hello there' \| capitalize }}` → `Hello There`               | (LR titlecases every word)                                                    |
| `downcase`               | `{{ 'Hello There' \| downcase }}` → `hello there`                 |                                                                               |
| `upcase`                 | `{{ 'Hello There' \| upcase }}` → `HELLO THERE`                   |                                                                               |
| `first`                  | `{{ store.products \| first }}`                                   |                                                                               |
| `last`                   | `{{ category.products \| last }}`                                 |                                                                               |
| `join`                   | `{{ product.price_range \| money \| join: ' - ' }}`               | note `money` maps over an array here                                          |
| `size`                   | `{{ category.products.size }}` → `15`                             | (also `.size` property access)                                                |

**Not in the official filter list but used by the Skeleton theme (and therefore
real):**

- `favicon_tag` — `{{ config['favicon_image_url'] | favicon_tag }}` in
  `layouts/default.html`.
- `link_to_roster_item` — `{{ item | link_to_roster_item }}` in `roster.html` /
  layout.
- Standard Liquid filters: `date`, `escape`, `strip_html`, `strip_newlines`,
  `replace`, `strip`.

Source: <https://github.com/watsonbox/limitedrun-themekit/blob/master/spec/assets/skeleton-theme/layouts/default.html>

The gem's own `lib/liquid/filters.rb` only stubs `stylesheet_url`,
`stylesheet_tag`, `script_tag`, `img_tag`, `link_to_news_item`, `link_to_page`,
`link_to_category`, `link_to_roster_item` (several hard-coded); it never
implements `money`, `simple_format`, `ordinalize`, `asset_url`, `favicon_tag`,
etc. — so the gem is an incomplete mock, not an authority on filter behaviour.
Source: <https://raw.githubusercontent.com/watsonbox/limitedrun-themekit/master/lib/liquid/filters.rb>

### 4. Custom / logic tags

**Official** ("Tags" section, <https://help.limitedrun.com/articles/4-theme-api-custom-html>):

- `{% if %}` / `{% unless %}` — `{% if store.pages.size > 0 %}`
- `{% for %}` — `{% for page in store.pages %}`
- `{% paginate %}`:
  ```liquid
  {% paginate store.products by 30 %}
    {% for product in store.products %}
      ...
    {% endfor %}
    {{ store.products_pagination }}
  {% endpaginate %}
  ```

**From Anatomy of a Theme**: `{% include 'sidebar.html' %}` for snippets.
Source: <https://help.limitedrun.com/articles/3-anatomy-of-a-theme>

**From the Skeleton theme (not documented as LR-specific, but present and
relied on):**

- `{% comment %} … {% endcomment %}` — used heavily (Skeleton `contact.html`,
  `history.html`, `roster-item.html`).
- `{% assign x = true %}`, `{% if/elsif/else %}`, `{% for x in y limit:5 %}`,
  `forloop.first`.
- `{% contact_form %} … {% endcontact_form %}` — block tag. Skeleton
  `contact.html` documents the fields in a `{% comment %}`:
  > "The contact_form tag has three required fields: `message[name]`,
  > `message[email]`, `message[body]`" … "an option field … `message[subject]`"
- `{% captcha clean %}` — inline tag taking a theme name. Skeleton comment:
  > "The follow themes are available: `red`, `white`, `blackglass`, `clean`"
- Output token `{{ store_script_tag }}` — Skeleton layout comment:
  > "The following store.js script is required for every page. Do not remove it."
- Per-collection pagination output variables produced by `{% paginate %}`:
  `store.products_pagination`, `store.events_pagination`,
  `category.products_pagination`, `news.items_pagination`,
  `history.items_pagination`, `gallery.items_pagination`,
  `roster` item `item.products_pagination`.

Source: <https://github.com/watsonbox/limitedrun-themekit/tree/master/spec/assets/skeleton-theme>

The gem's `contact_form` / `captcha` / `paginate` implementations are pass-through
stubs (`paginate` just renders its block; `captcha` emits an old reCAPTCHA v1
script; `contact_form` wraps `<form>`), so they only tell us the tag names and
block/inline shape, not real server behaviour.
Sources:
<https://raw.githubusercontent.com/watsonbox/limitedrun-themekit/master/lib/liquid/tags/paginate.rb>,
<https://raw.githubusercontent.com/watsonbox/limitedrun-themekit/master/lib/liquid/tags/contact_form.rb>,
<https://raw.githubusercontent.com/watsonbox/limitedrun-themekit/master/lib/liquid/tags/captcha.rb>

`{% raw %}` — **not mentioned** in any official article and **not used** by the
Skeleton theme. Ruby Liquid of that era supports it, but we have no confirmation
Limited Run enables it.

### 5. Template files and the route map

**Anatomy of a Theme** names the asset types and files:

> six asset types: layout, stylesheet, javascript, template, snippet, config

> "Every Theme must have a `default.html` **layout**." … "a `default.css`
> **stylesheet**." … "a `default.js` **javascript**." … "a `default.json`
> **config**."

> Default templates: `index.html`, `category.html`, `product.html`,
> `order.html`, `maintenance.html`, `404.html`

> Specialty app templates: `news.html`, `news-item.html`, `history.html`,
> `gallery.html`, `contact.html`

> "`{{ content }}` marks where templates render within layouts."

> Snippets: "`{% include 'sidebar.html' %}`"

Source: <https://help.limitedrun.com/articles/3-anatomy-of-a-theme>

The gem's Skeleton theme additionally ships `event.html`, `events.html`,
`roster.html`, `roster-item.html`, `search.html`. The **route map** below is
**inferred from the gem's Sinatra server** (`lib/limitedrun-themekit/server.rb`)
plus the object `url`/`path` attributes; Limited Run does not publish a routing
table, and the gem's paths (`/artists`, `/news`, `/store`) are the gem author's
choices and may not match production.

| Template                | Page / route                                                  | Primary variable(s)                | Source of route claim                                                    |
| ----------------------- | ------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| `default.html` (layout) | wraps every page                                              | `store`, `config`, `content`       | anatomy (official)                                                       |
| `index.html`            | storefront home (product grid)                                | `store.products`                   | anatomy (official) + gem `get '/'`                                       |
| `category.html`         | a category page                                               | `category` (+ `category.products`) | anatomy (official); gem `get '/categories/:category'`, `get '/store'`    |
| `product.html`          | a product page                                                | `product`                          | anatomy (official); gem `get '/products/:slug'`                          |
| `event.html`            | a show/event page                                             | `event`                            | gem Skeleton; route not in gem server                                    |
| `events.html`           | shows/calendar listing                                        | `store.events`                     | gem Skeleton; route not in gem server                                    |
| `order.html`            | order status page                                             | `order`                            | anatomy (official); route not in gem server (`order.key`)                |
| `news.html`             | news index                                                    | `news.items`                       | anatomy (official); gem `get '/news'`                                    |
| `news-item.html`        | a single post                                                 | `item`                             | anatomy (official); gem `get '/news/posts/:item'`                        |
| `history.html`          | discography/history index                                     | `history.items`                    | anatomy (official); route not in gem server                              |
| `roster.html`           | artists/roster index                                          | `roster.items`                     | gem `get '/artists'`                                                     |
| `roster-item.html`      | one artist (+ `?section=products`)                            | `item`, `section`                  | gem `get '/artists/:item'` (+ `/artists/:item/products`)                 |
| `gallery.html`          | gallery index                                                 | `gallery.items`                    | anatomy (official); route not in gem server                              |
| `contact.html`          | contact form page                                             | `message`, `store.mailbox`         | anatomy (official); gem `get '/contact'`                                 |
| `search.html`           | product search results                                        | `products`, `query`/`q`            | gem Skeleton (`/products/search`, `action="/products/search"` in layout) |
| `404.html`              | not-found page                                                | —                                  | anatomy (official)                                                       |
| `maintenance.html`      | store-closed page (own `<!DOCTYPE>`, inline CSS via `config`) | `config`                           | anatomy (official)                                                       |

### 6. Stylesheets / JavaScript handling

- **`asset_url` + cache-busting + CDN**: official.

  > "`{{ 'default.css' | asset_url | stylesheet_tag: 'screen' }}`" produces a
  > `<link>` with a cache-busted URL "like `/asset/default-c6324.css`";
  > `{{ 'default.js' | asset_url | script_tag }}` → versioned `<script>`.
  > Source: <https://help.limitedrun.com/articles/3-anatomy-of-a-theme>
  > Skeleton also links absolute CDN assets from `s1.limitedrun.com` and theme
  > gallery images from `d2hzwnl4ytplf6.cloudfront.net`.

- **CSS is run through Liquid.** Not in official docs, but: `maintenance.html`
  embeds `{{ config['background_color'] }}` inside a `<style>` block, and the
  gem serves stylesheets via
  `Renderer#render_string(css)` → `Liquid::Template.parse(css).render('config' => theme_config)`.
  So `default.css` (and other stylesheets) can use `{{ config[...] }}`.
  Sources: <https://raw.githubusercontent.com/watsonbox/limitedrun-themekit/master/lib/limitedrun-themekit/server.rb>;
  real theme `watsonbox/telescope-pinna` ships a `stylesheets/default.css` full of
  `{{ config['link_color'] }}` etc.
  (<https://github.com/watsonbox/telescope-pinna/blob/master/stylesheets/default.css>).
  Production behaviour is not officially documented. The gem serves `default.js`
  as a **static file** (no Liquid), but that is a gem choice.

### 7. `configs/default.json` schema

**Official** (<https://help.limitedrun.com/articles/3-anatomy-of-a-theme>):

Root keys: `name`, `description`, `author` (`{ name, website }`), `images`
(array of `{ thumbnail, original }`), `settings` (object: setting-key → def).

> Required per setting: `key`, `format`, `label`, `position` (numeric order)
> Optional per setting: `default`, `help`, `placeholder`
> "Possible values include: `'image'`, `'color'`, `'text'`, `'boolean'`"

Settings render contextually in the dashboard (color picker / upload / checkbox
/ text field).

Reference in Liquid: `{{ config['background_image_url'] }}`.

**From the gem's bundled Skeleton `configs/default.json`** (authored by "Limited
Run"): confirms `format` values `image`, `boolean`, `color`, `text` in the wild;
adds root key `sort` (number); adds one setting key **`content_type: true`** on
the `favicon_image_url` (an `image` setting). `content_type` is **not** in the
official docs.
Source: <https://raw.githubusercontent.com/watsonbox/limitedrun-themekit/master/spec/assets/skeleton-theme/configs/default.json>

**Custom Theme Fields** (<https://help.limitedrun.com/articles/custom-theme-fields>)
are a separate, per-record feature (App Store add-on), not part of `default.json`:

> "Custom Theme Fields are currently supported in the following areas: Products,
> Shows (Events), Categories, News Items, History Items, Roster Items."
> Field types: "checkbox, image, textfield, and textarea." Accessed in Liquid as
> `{{ product.custom['album-name'] }}` (`object.custom['key']`).

### 8. Liquid dialect, comments, limits

- **Dialect**: Ruby `liquid` gem — the themekit gemspec pins
  `liquid "~> 2.6.0"` (Shopify's _original_ Liquid, 2013-era: no `{% render %}`,
  no whitespace-control `{%- -%}`, no `map`/`where`/`default` filters). 2.6
  built-ins that ARE available but the docs don't name: `{% comment %}`,
  `{% raw %}`, `{% assign %}`, `{% capture %}`, `{% case %}`, `{% cycle %}`,
  `{% tablerow %}`. Not called "Shopify" anywhere.
  Source: <https://raw.githubusercontent.com/watsonbox/limitedrun-themekit/master/limitedrun-themekit.gemspec> Objects expose Ruby-style **predicate methods** ending in `?`
  (`product.available?`, `variation.available?`, `order.attempted?`,
  `product.announced?`) — a Liquid-Drop feature, usable directly in `{% if %}`.
  Source: Skeleton templates,
  <https://github.com/watsonbox/limitedrun-themekit/tree/master/spec/assets/skeleton-theme/templates>
- **`{% comment %}`**: works (used throughout Skeleton).
- **`{% raw %}`**: undocumented, unused by Skeleton — but a `liquid 2.6`
  built-in, so almost certainly available.
- **Limits / "not supported"**: the Theme API article has **no** limits section.
  A targeted search of it for "not supported", "unsupported", "cannot", "limit",
  "raw" returned nothing.
  Source: <https://help.limitedrun.com/articles/4-theme-api-custom-html>
- Only documented "gotcha": module-gated objects.
  > `calendar`/Ticket Selling, `news`/News, `history`/History, `roster`/Roster,
  > `gallery`/Gallery modules must be purchased for those objects to exist.

### 9. How themes are edited (no official local-dev story)

> "Click 'Storefront' > 'Theme' in the dashboard navigation."
> "If the 'HTML / CSS' button is disabled, first click the 'Duplicate' button."
> "You can edit the HTML, CSS and JavaScript of any Theme Asset by clicking the
> 'Edit' button next to it."

Sources: <https://help.limitedrun.com/articles/designing-a-new-theme-in-secret>,
<https://help.limitedrun.com/articles/changing-a-themes-html>

Neither article mentions local development, ZIP export, or `store.json`. The
"export from the admin interface" workflow is asserted only by the themekit gem
README (<https://github.com/watsonbox/limitedrun-themekit>), consistent with the
findings in `docs/research/limitedrun-store-json.md`.

## What primary sources could NOT confirm

- **No Liquid version / dialect statement.** "Ruby Liquid ~2.x" is inferred from
  the gem's dependency and the Skeleton syntax, not stated by Limited Run.
- **The full, exact text of the Theme API article's object attribute lists.**
  help.limitedrun.com could only be read through WebFetch's summarizer (the raw
  HTML and the Wayback Machine were not retrievable in this session — Wayback
  returned HTTP 429, and web.archive.org is blocked for WebFetch). Attribute
  spellings were cross-checked against Skeleton templates where possible, but
  items only seen via the summarizer (the `store.*_by_*` lookup helpers,
  `current_path`, `current_asset`) are **not independently verified**.
- **`{% paginate %}` behaviour**: the output-variable name pattern
  (`<collection>_pagination`) and default `by` values come from the Skeleton
  theme; the article shows only `store.products_pagination`. What
  `{{ ..._pagination }}` renders (markup, query param, page-size cap) is
  undocumented.
- **`{% contact_form %}` / `{% captcha %}` real behaviour**: only the tag names,
  required fields, and captcha theme names (from Skeleton `{% comment %}` blocks)
  are known. Server-side handling, current captcha provider, CSRF, and the
  `message` object shape are undocumented.
- **`store_script_tag` / `favicon_tag`**: real, used by the LR-authored Skeleton
  layout, but absent from both official articles — no documentation of what they
  emit.
- **Whether stylesheets are run through Liquid in production** (the gem does it;
  official docs are silent) and whether `default.js` is.
- **`{% raw %}` support.**
- **`configs/default.json` `content_type` key** — appears in the LR-authored
  Skeleton config but is undocumented; purpose unknown.
- **The real production route/URL for each template** (e.g. events, orders,
  roster, gallery, history, search). The gem's Sinatra routes are the gem
  author's invention.
- **Any `cart` object.** The task brief lists `cart`, but no official article and
  no Skeleton template references a `cart` Liquid object — the cart is
  JavaScript-only in Skeleton (`Store.cart.add(...)`, `Store.cart.show()`).
- **`page` / list of `configs/` beyond `default.json`, multiple layouts,
  localization, metafields, sections** — none mentioned; assume unsupported.

## Recommendation

1. Treat the two official articles as the **only** authority for object
   attributes and filter names, and cite them. Everything the renderer needs
   beyond that (`favicon_tag`, `store_script_tag`, `{% comment %}`, CSS-through-
   Liquid, pagination output vars, contact/captcha field contracts, the route
   map) is **gem/Skeleton-derived** and should be labelled as such in our docs
   and code comments.
2. **Verification of our renderer** against the docs:
   - Confirmed by official docs: `money`, `money_with_currency`, `simple_format`,
     `ordinalize`, `stylesheet_tag`, `script_tag`, `img_tag`, `asset_url`,
     `link_to_page`, `link_to_category`, `link_to_news_item`, `link_to_download`;
     tags `{% paginate %}`, `{% include %}` (the latter via Anatomy).
   - Confirmed by the LR-authored Skeleton theme only (NOT the API article):
     `favicon_tag`, `link_to_roster_item`, `{% contact_form %}`, `{% captcha %}`,
     `store_script_tag`, `{% comment %}`.
   - `stylesheet_url` is a gem-internal helper (from locomotivecms/wagon), **not
     a Limited Run filter** — keep it only as an implementation detail of
     `stylesheet_tag`, don't advertise it.
   - **Missing from our renderer** (documented, real): `money_without_currency`,
     `link_to`, `link_to_javascript`, `link_to_product`, `capitalize` (LR
     titlecases _every_ word — differs from standard Liquid), and standard Liquid
     `date`, `escape`, `strip_html`, `strip_newlines`, `replace`, `strip`, `first`,
     `last`, `join`, `size`. Also object **predicate methods** (`available?`,
     `announced?`, `unavailable?`, `unlisted?`, `attempted?`) must work inside
     `{% if %}`.
   - `img_tag` takes an optional **class** argument (`| img_tag: 'thumbnail'`);
     `stylesheet_tag` takes an optional **media** argument.
3. Ship `templates/search.html`, `event.html`, `events.html`, `roster.html`,
   `roster-item.html` in the scaffold even though Anatomy omits them — the
   LR-authored Skeleton has them.
4. Keep a `default.js` that ends with the equivalent of `{{ store_script_tag }}`
   guidance ("required on every page").

### Copy-paste block for a generated theme's `AGENTS.md`

```markdown
## Limited Run Theme API — quick reference

Templating: Ruby Liquid, gem pins `liquid ~> 2.6.0` (2013-era, NOT Shopify —
no `{% render %}`, no `{%- -%}`, no `map`/`where`/`default`). Standard `{{ }}` /
`{% %}` and 2.6 built-ins: `if` `unless` `elsif` `else` `for`+`limit:` `assign`
`capture` `case` `cycle` `comment` `raw` `tablerow`, `forloop.first`.
Official docs (the ONLY authority):

- https://help.limitedrun.com/articles/4-theme-api-custom-html (objects + filters + tags)
- https://help.limitedrun.com/articles/3-anatomy-of-a-theme (files + configs/default.json)

### Objects (official — help article #4; `store` is available everywhere)

store .name .url | .products .categories .events .pages .mailbox
.news(.items) .history(.items) .gallery(.items) .calendar(.events) .roster(.items)
category .name .slug .url .custom['k'] | .products
product .state .name .slug .description .url .price_range
.music_catalog_number .music_pressing_information .custom['k']
.categories .images .variations .music_track_listings
predicates: .available? .announced? .unavailable? .unlisted?
event like product + (Skeleton) .starts_at .venue .images .variations ; same predicates
image / gallery item .url .v075_url .v150_url .v200_url .v300_url .v600_url
variation .name .description .price .weight .requires_exact_payment .available?
music_track_listings .id3_track_number .id3_track_artist .id3_track_name
order .key .paypal_pay_key .number .state .status .transaction_id .pending_reason
.item_count .digital .subtotal .shipping .total_price .total_weight .attempted?
.items .downloads .customer .shipping_address
order item .name .digital .unit_price .unit_weight .quantity .total_price .total_weight
download .name customer .email .first_name .last_name
address .first_name .last_name .street_address_1 .street_address_2 .city .state .postal_code .country
page .title .path .url .body
news / history / roster / gallery / calendar (module-gated) .title .path .url + .items/.events
news item .title .slug .url .body .published_at .custom['k']
history item .released_on .released_by .catalog_number .name .description .release_information .images .links
roster item .name .slug .description .url .custom['k'] .history_items .images .links .products
link .name .url

### Custom filters (official — help article #4)

asset_url stylesheet_tag[: 'media'] script_tag img_tag[: 'class']
link_to: url link_to_javascript: js link_to_category link_to_product
link_to_page link_to_news_item link_to_download
ordinalize simple_format money money_with_currency money_without_currency
capitalize (title-cases EVERY word) downcase upcase first last join: sep size

# also standard Liquid: date escape strip_html strip_newlines replace strip

### Custom filters/tags — from LR's Skeleton theme, NOT in the API article

favicon_tag {{ config['favicon_image_url'] | favicon_tag }}
link_to_roster_item
{{ store_script_tag }} <-- REQUIRED once per page (loads store.js cart JS)
{% comment %}…{% endcomment %}
{% contact_form %}…{% endcontact_form %} fields: message[name] message[email] message[body] (+opt message[subject])
{% captcha <theme> %} themes: red white blackglass clean
{% paginate <collection> by <n> %}…{{ <collection>_pagination }}…{% endpaginate %}
known: store.products_pagination store.events_pagination category.products_pagination
news.items_pagination history.items_pagination gallery.items_pagination

### Tags (official — help article #4 + Anatomy)

{% if %} {% unless %} {% for %} {% paginate %} {% include 'snippet.html' %}

### Template -> page (files: official unless noted; ROUTES are gem/theme guesses, unverified)

default.html layout, wraps every page ({{ content }}) [official]
index.html storefront home / product grid [official] /
category.html a category (var: category, category.products) [official] /categories/:slug
product.html a product (var: product) [official] /products/:slug
order.html order status (var: order) [official]
maintenance.html store-closed page (own <!DOCTYPE>, config only) [official]
404.html not found [official]
news.html / news-item.html news index / post (var: item) [official]
history.html / gallery.html module index pages [official]
contact.html contact form (vars: message, store.mailbox) [official]
event.html / events.html a show / shows listing [Skeleton only]
roster.html / roster-item.html artists index / one artist [Skeleton only] (roster-item takes ?section=products)
search.html product search results (vars: products, query) [Skeleton only] /products/search?q=

### configs/default.json (official — Anatomy)

root: name, description, author{name,website}, images[{thumbnail,original}], settings{}
(Skeleton also uses: sort <number>)
setting: REQUIRED key, format, label, position(number)
OPTIONAL default, help, placeholder
format values: "image" | "color" | "text" | "boolean"
(Skeleton also uses: "content_type": true -- undocumented)
read in Liquid as {{ config['setting_key'] }} (also works inside default.css)

### Not supported / unknown (no official statement either way)

- No `cart` Liquid object — cart is JS only (Store.cart.add / Store.cart.show).
- No multiple layouts, sections, metafields, i18n, or configs other than default.json.
- {% raw %} not used by Skeleton but is a liquid-2.6 built-in. No documented output/size/loop limits.
- module-gated objects: news/history/roster/gallery/calendar need the paid module.
```
