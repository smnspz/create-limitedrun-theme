# @limitedrun/cli

## 0.2.0

### Minor Changes

- c0f68fb: Initial release: `create-limitedrun-theme` scaffolder and `@limitedrun/cli`
  (`limitedrun dev` live preview + `limitedrun build` zip), replacing the
  `limitedrun-themekit` gem with a Node/TypeScript toolchain.
- a81b0d3: Optional SCSS and TypeScript support. `stylesheets/*.scss` are compiled to
  plain CSS with dart-sass and `javascripts/*.ts` are type-stripped with the
  TypeScript compiler, on both `limitedrun dev` and `limitedrun build` — the
  export only ever contains `.css`/`.js`. Zero config: drop in a `.scss`/`.ts`
  file and it works. Sass partials (`_*.scss`) and `.d.ts` files are not emitted.
  The generated `AGENTS.md`/`README.md` document the feature and its one caveat
  (keep Liquid `{{ config }}` out of `.scss`).
