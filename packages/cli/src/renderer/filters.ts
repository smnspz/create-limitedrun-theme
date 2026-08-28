import type { Liquid } from 'liquidjs';

// Limited Run's custom Liquid filters, reimplemented for local preview.
// The `stylesheet_*`, `script_tag`, `img_tag` and `link_to_*` set is ported
// from the original gem (lib/liquid/filters.rb). `asset_url`, `favicon_tag`,
// `money`, `money_with_currency`, `simple_format`, `ordinalize` and
// `link_to_download` were referenced by real themes but never defined by the
// gem — their behaviour here is a best-effort approximation pending official
// platform documentation.

/**
 * Format a value as `$0.00`.
 *
 * @param input - a number, a numeric string (currency symbols are stripped), or
 *   an array of either; non-numeric input is returned unchanged
 * @returns the formatted string, or an array of formatted strings for array input
 */
function money(input: unknown): string | string[] {
  if (Array.isArray(input)) return input.map((v) => money(v) as string);
  if (input === null || input === undefined || input === '') return '';
  const n = typeof input === 'number' ? input : Number(String(input).replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(n)) return String(input);
  return `$${n.toFixed(2)}`;
}

/**
 * Add an ordinal suffix to an integer-ish value: 1 -> "1st", 22 -> "22nd".
 *
 * @param input - a number or string parseable as an integer; unparseable input
 *   is coerced to string and returned unchanged
 * @returns the number with its ordinal suffix
 */
function ordinalize(input: unknown): string {
  const n = Number.parseInt(String(input), 10);
  if (Number.isNaN(n)) return String(input ?? '');
  const rem100 = Math.abs(n) % 100;
  const rem10 = rem100 % 10;
  const suffix =
    rem100 >= 11 && rem100 <= 13
      ? 'th'
      : rem10 === 1
        ? 'st'
        : rem10 === 2
          ? 'nd'
          : rem10 === 3
            ? 'rd'
            : 'th';
  return `${n}${suffix}`;
}

/**
 * Approximate Rails' `simple_format`: wrap paragraphs in `<p>` and turn single
 * newlines into `<br />`. Text that already contains block-level markup is
 * returned unchanged.
 *
 * @param input - the source text (coerced to string; empty/nullish yields "")
 * @returns the formatted HTML
 */
function simpleFormat(input: unknown): string {
  const text = String(input ?? '').trim();
  if (text === '') return '';
  if (/<(p|div|ul|ol|h[1-6]|table|section|article)[\s>]/i.test(text)) return text;
  const paragraphs = text.split(/\n{2,}/).map((p) => p.replace(/\n/g, '<br />\n'));
  return paragraphs.map((p) => `<p>${p}</p>`).join('\n\n');
}

/**
 * Resolve the URL of a theme stylesheet (ported from the gem): absolute URLs
 * pass through; bare names get a `/stylesheets/` prefix and a `.css` suffix.
 *
 * @param input - a stylesheet name or URL; null/undefined yields ""
 * @returns the resolved stylesheet URL
 */
function stylesheetUrl(input: unknown): string {
  if (input === null || input === undefined) return '';
  let s = String(input);
  if (/^https?:/.test(s)) return s;
  if (!s.startsWith('/')) s = `/stylesheets/${s}`;
  if (!s.endsWith('.css')) s = `${s}.css`;
  return s;
}

/**
 * Register every custom Limited Run filter on a Liquid instance.
 *
 * @param liquid - the engine to extend
 * @param javascriptsDir - configured name of the theme's JS directory, used by `script_tag`
 */
export function registerFilters(liquid: Liquid, javascriptsDir: string): void {
  liquid.registerFilter('money', money);
  liquid.registerFilter('money_with_currency', (input: unknown) => {
    const m = money(input);
    return Array.isArray(m) ? m.map((v) => `${v} USD`) : m ? `${m} USD` : '';
  });
  liquid.registerFilter('ordinalize', ordinalize);
  liquid.registerFilter('simple_format', simpleFormat);

  // Asset helpers.
  liquid.registerFilter('asset_url', (input: unknown) => (input == null ? '' : String(input)));
  liquid.registerFilter('stylesheet_url', stylesheetUrl);
  liquid.registerFilter('stylesheet_tag', (input: unknown, media = 'screen') => {
    if (input == null) return '';
    return `<link href="${stylesheetUrl(input)}" media="${media}" rel="stylesheet" type="text/css" />`;
  });
  liquid.registerFilter('script_tag', (input: unknown) => {
    if (input == null) return '';
    return `<script src="/${javascriptsDir}/${input}" type="text/javascript"></script>`;
  });
  liquid.registerFilter(
    'img_tag',
    (input: unknown, klass = '') => `<img src="${input ?? ''}" class="${klass}" />`,
  );
  liquid.registerFilter('favicon_tag', (input: unknown) => {
    if (!input) return '';
    return `<link rel="shortcut icon" href="${input}" type="image/x-icon" />`;
  });

  // Link helpers (ported from the gem).
  liquid.registerFilter(
    'link_to_news_item',
    (input: Record<string, unknown>) =>
      `<a href="${input?.url ?? '/news/posts/first'}">${input?.title ?? ''}</a>`,
  );
  liquid.registerFilter(
    'link_to_page',
    (input: Record<string, unknown>) => `<a href="${input?.path ?? ''}">${input?.title ?? ''}</a>`,
  );
  liquid.registerFilter(
    'link_to_category',
    (input: Record<string, unknown>) => `<a href="${input?.url ?? ''}">${input?.name ?? ''}</a>`,
  );
  liquid.registerFilter(
    'link_to_roster_item',
    (input: Record<string, unknown>) => `<a href="${input?.url ?? ''}">${input?.name ?? ''}</a>`,
  );
  liquid.registerFilter(
    'link_to_download',
    (input: Record<string, unknown>) =>
      `<a href="${input?.url ?? '#'}">${input?.name ?? 'Download'}</a>`,
  );
}
