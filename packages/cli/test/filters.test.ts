import { Liquid } from 'liquidjs';
import { describe, expect, it } from 'vitest';
import { registerFilters } from '../src/renderer/filters.js';

function engine(): Liquid {
  const liquid = new Liquid({ jsTruthy: true });
  registerFilters(liquid, 'javascripts');
  return liquid;
}

describe('custom filters', () => {
  const liquid = engine();
  const render = (tpl: string, scope: Record<string, unknown> = {}) =>
    liquid.parseAndRender(tpl, scope);

  it('money formats numbers and strings', async () => {
    expect(await render('{{ 20 | money }}')).toBe('$20.00');
    expect(await render('{{ "18" | money }}')).toBe('$18.00');
    expect(await render('{{ p | money | join: " - " }}', { p: [20, 30] })).toBe('$20.00 - $30.00');
  });

  it('money_with_currency appends USD', async () => {
    expect(await render('{{ 5 | money_with_currency }}')).toBe('$5.00 USD');
  });

  it('ordinalize adds ordinal suffixes', async () => {
    expect(await render('{{ 1 | ordinalize }}')).toBe('1st');
    expect(await render('{{ 2 | ordinalize }}')).toBe('2nd');
    expect(await render('{{ 11 | ordinalize }}')).toBe('11th');
    expect(await render('{{ 23 | ordinalize }}')).toBe('23rd');
  });

  it('simple_format wraps bare text but passes through markup', async () => {
    expect(await render('{{ t | simple_format }}', { t: 'hi\n\nthere' })).toBe(
      '<p>hi</p>\n\n<p>there</p>',
    );
    expect(await render('{{ t | simple_format }}', { t: '<p>done</p>' })).toBe('<p>done</p>');
  });

  it('stylesheet_tag builds a local link', async () => {
    expect(await render('{{ "default.css" | asset_url | stylesheet_tag: "screen" }}')).toBe(
      '<link href="/stylesheets/default.css" media="screen" rel="stylesheet" type="text/css" />',
    );
  });

  it('favicon_tag is empty for a blank value', async () => {
    expect(await render('{{ f | favicon_tag }}', { f: '' })).toBe('');
    expect(await render('{{ f | favicon_tag }}', { f: '/x.ico' })).toContain('href="/x.ico"');
  });

  it('link_to_* helpers render anchors', async () => {
    expect(await render('{{ p | link_to_page }}', { p: { path: '/news', title: 'News' } })).toBe(
      '<a href="/news">News</a>',
    );
  });
});
