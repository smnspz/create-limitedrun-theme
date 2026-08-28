# AGENTS.md

The agent guide for this repo is [CLAUDE.md](./CLAUDE.md) — a full overview of
both packages (`@limitedrun/cli`, `create-limitedrun-theme`), the architecture,
commands, conventions, and known liquidjs/Ruby-Liquid gaps.

Quick facts:

- npm workspaces monorepo, Node 20+, TypeScript strict, ESM-only.
- `npm install` at the root, then `npm test --workspaces` and `npm run lint` must
  pass. A Husky pre-commit hook enforces this.
- Conventional Commits; end messages with
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Function comments/JSDoc follow
  [.agents/guidelines/javascript-functions.md](.agents/guidelines/javascript-functions.md).
