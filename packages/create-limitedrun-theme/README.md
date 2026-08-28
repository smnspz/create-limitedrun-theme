# create-limitedrun-theme

Scaffold a new [Limited Run](https://limitedrun.com/) theme project.

```sh
npm create limitedrun-theme@latest my-theme
```

Prompts for a target directory and a starter theme (`skeleton`, `telescope`,
`hyde`, `binoculars`, `winter`, `winter-peak`), then generates:

- the theme files (`configs/ layouts/ templates/ snippets/ stylesheets/ javascripts/`)
- `store.json` + `store.schema.json` — local mock data for the preview
- `package.json` wired to `limitedrun dev` / `limitedrun build`
- `README.md`, and `AGENTS.md` / `CLAUDE.md` orienting an AI agent on how to
  edit and run the theme
- `.gitignore`

Flags: `--template <id>` / `-t`, `--yes` / `-y`, `--no-install`, `--no-git`.

The real tooling lives in [`@limitedrun/cli`](../cli).
