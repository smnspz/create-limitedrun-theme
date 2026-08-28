---
'@limitedrun/cli': minor
'create-limitedrun-theme': minor
---

Optional SCSS and TypeScript support. `stylesheets/*.scss` are compiled to
plain CSS with dart-sass and `javascripts/*.ts` are type-stripped with the
TypeScript compiler, on both `limitedrun dev` and `limitedrun build` — the
export only ever contains `.css`/`.js`. Zero config: drop in a `.scss`/`.ts`
file and it works. Sass partials (`_*.scss`) and `.d.ts` files are not emitted.
The generated `AGENTS.md`/`README.md` document the feature and its one caveat
(keep Liquid `{{ config }}` out of `.scss`).
