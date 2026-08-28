# Project instructions

## Coding guidelines

- **JavaScript / TypeScript functions**: follow
  [.agents/guidelines/javascript-functions.md](.agents/guidelines/javascript-functions.md)
  — every named function/method gets a JSDoc block (summary + `@param` /
  `@returns`, plus `@throws` / `@yields` where relevant).

## Repo layout

- `packages/cli` — `@limitedrun/cli` (`limitedrun dev` / `limitedrun build`)
- `packages/create-limitedrun-theme` — `npm create` scaffolder + starter themes
  under `templates/` (shared `store.json` mock in `templates/_shared/`)
- `docs/research/` — primary-source research notes

## Checks before committing

`npm run lint` (prettier + typecheck) and `npm test --workspaces` must pass.
A Husky pre-commit hook runs lint-staged, typecheck, and the test suites.
