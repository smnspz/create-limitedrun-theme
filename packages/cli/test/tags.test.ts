import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Liquid } from 'liquidjs';
import { describe, expect, it } from 'vitest';
import { registerTags } from '../src/renderer/tags.js';

function engine(snippetsDir: string): Liquid {
  const liquid = new Liquid({ jsTruthy: true });
  registerTags(liquid, snippetsDir);
  return liquid;
}

describe('paginate tag', () => {
  it('renders its body (pass-through)', async () => {
    const liquid = engine('/nonexistent');
    const out = await liquid.parseAndRender(
      '{% paginate items by 2 %}{% for i in items %}{{ i }}{% endfor %}{% endpaginate %}',
      { items: [1, 2, 3] },
    );
    expect(out).toBe('123');
  });
});

describe('contact_form + captcha tags', () => {
  it('wraps body in a form and emits a captcha placeholder', async () => {
    const liquid = engine('/nonexistent');
    const out = await liquid.parseAndRender(
      '{% contact_form %}<input>{% captcha clean %}{% endcontact_form %}',
    );
    expect(out).toBe(
      '<form accept-charset="UTF-8" action="/contact" method="post"><input><div class="captcha" data-preview-placeholder="true">[captcha]</div></form>',
    );
  });
});

describe('include tag', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'lr-snippets-'));
  writeFileSync(path.join(dir, 'greeting.html'), 'Hello {{ include.name }}');

  it('renders a snippet with passed params', async () => {
    const liquid = engine(dir);
    const out = await liquid.parseAndRender("{% include 'greeting.html' name='Ada' %}");
    expect(out).toBe('Hello Ada');
  });

  it('rejects path traversal', async () => {
    const liquid = engine(dir);
    await expect(liquid.parseAndRender("{% include '../secret.html' %}")).rejects.toThrow(
      /escapes/,
    );
  });

  it('reports a missing snippet', async () => {
    const liquid = engine(dir);
    await expect(liquid.parseAndRender("{% include 'nope.html' %}")).rejects.toThrow(/not found/);
  });
});
