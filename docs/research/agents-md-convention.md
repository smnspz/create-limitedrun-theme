# The `AGENTS.md` convention (and the `.agent` / `.agents/` directory idea)

## Question

What is the `AGENTS.md` convention for guiding AI coding agents — who created
it, what does the spec actually say, who reads it, and is the "`.agent`" /
"`.agents/`" directory a real competing/complementary standard? Does Claude Code
read `AGENTS.md`?

## Short answer

`AGENTS.md` is a deliberately minimal, open convention: a plain-Markdown file
(no required schema) placed at a repository root, with optional nested copies
deeper in the tree, that gives coding agents the build/test/convention context a
`README.md` would clutter. It was published August 19, 2025 by a group of agent
vendors led by OpenAI (Codex), with Amp, Google Jules, Cursor, and Factory, as a
successor to the pile of proprietary files (`.cursorrules`,
`.github/copilot-instructions.md`, `CLAUDE.md`, `AGENT.md`, etc.). In December
2025 it was contributed to the Linux Foundation's new Agentic AI Foundation and
is no longer OpenAI-owned. Its own primary sources claim "over 60k open-source
projects" use it and list ~25 tools that read it natively.

The `.agents/` (and `.agent/`) **directory** is _not_ an adopted standard. It is
a cluster of competing community draft proposals (GitHub issue #71 on the
`agents.md` repo, `agentsfolder/spec`, `bgreenwell/dotagents`,
`dotagentsprotocol.com`), none ratified by the `agents.md` maintainers, none
implemented by a major agent as a general config directory. Separately,
`.claude/`, `.cursor/rules/`, `.gemini/`, `.github/`, and the emerging
`.agents/skills/` are real tool-specific directories, but those are a different
thing from a canonical `.agents/` config spec.

Claude Code does **not** read `AGENTS.md`. Anthropic's docs say so explicitly and
recommend a `@AGENTS.md` import (or a symlink) from `CLAUDE.md`.

## Findings

### 1. Origin and history

The canonical repo is `github.com/agentsmd/agents.md`. It was **created
2025-08-19** (`"created_at": "2025-08-19T17:22:54Z"`; first commit message
"Initial commit", dated 2025-08-19). It was originally published under the
`openai/` org: `https://github.com/openai/agents.md` today returns
`HTTP 301` → `https://github.com/agentsmd/agents.md`, and early cross-references
in the repo's own issue tracker point at `openai/agents.md/issues/9`.

Source: `https://api.github.com/repos/agentsmd/agents.md` (metadata),
`git log` of the cloned repo, `curl -I https://github.com/openai/agents.md`
(301 redirect), comment by BradKML on issue #71
(`https://github.com/agentsmd/agents.md/issues/71`) linking `openai/agents.md/issues/9`.

**Who created it / why.** The site's About section:

> "AGENTS.md emerged from collaborative efforts across the AI software
> development ecosystem, including OpenAI Codex, Amp, Jules from Google, Cursor,
> and Factory."

And the rationale ("Why AGENTS.md?"):

> "README.md files are for humans: quick starts, project descriptions, and
> contribution guidelines. AGENTS.md complements this by containing the extra,
> sometimes detailed context coding agents need: build steps, tests, and
> conventions that might clutter a README or aren't relevant to human
> contributors. … Rather than introducing another proprietary file, we chose a
> name and format that could work for anyone."

Source: `components/AboutSection.tsx` and `components/WhySection.tsx` in
`https://github.com/agentsmd/agents.md` (verbatim from the cloned repo);
mirrored at `https://agents.md/`.

**Relationship to predecessors.** The `agents.md` site does **not** name
`.cursorrules`, `.github/copilot-instructions.md`, or `CLAUDE.md` anywhere — it
only frames itself against `README.md` and, in the migration FAQ, against the
singular `AGENT.md`:

> "How do I migrate existing docs to AGENTS.md? Rename existing files to
> AGENTS.md and create symbolic links for backward compatibility:
> `mv AGENT.md AGENTS.md && ln -s AGENTS.md AGENT.md`"

Source: `components/FAQSection.tsx` in `https://github.com/agentsmd/agents.md`.

The predecessor relationship is instead documented by the _adopting tools_,
which list the older files alongside `AGENTS.md` in their resolution order (see
§4, Zed and Claude Code).

**Transfer to the Linux Foundation.** The About section:

> "AGENTS.md is now stewarded by the Agentic AI Foundation under the Linux
> Foundation."

The footer reads "Copyright © AGENTS.md a Series of LF Projects, LLC". The Linux
Foundation press release (2025-12-09) names AGENTS.md as one of the three anchor
contributions to the new Agentic AI Foundation (alongside Anthropic's MCP and
Block's goose), and states: "Since its release in August 2025, the format has
been adopted by more than 60,000 open-source projects and tools, including
GitHub Copilot, VS Code, Cursor, and Gemini CLI."

Source: `components/AboutSection.tsx`, `components/Footer.tsx` in
`https://github.com/agentsmd/agents.md`;
`https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation`;
`https://openai.com/index/agentic-ai-foundation/`.

### 2. The spec

There is no formal spec document — the "spec" is the `agents.md` README plus the
website copy. Extracted verbatim from the cloned repo:

**File name / location.** `AGENTS.md`, "at the root of the repository." "Most
coding agents can even scaffold one for you if you ask nicely."
Source: `components/HowToUseSection.tsx`.

**Format.** No schema:

> "Are there required fields? No. AGENTS.md is just standard Markdown. Use any
> headings you like; the agent simply parses the text you provide."

Source: `components/FAQSection.tsx`. The README ships a "minimal example" with
`Dev environment tips`, `Testing instructions`, and `PR instructions` headings —
illustrative, not required.

**Nested / monorepo behavior.**

> "Large monorepo? Use nested AGENTS.md files for subprojects. Place another
> AGENTS.md inside each package. Agents automatically read the nearest file in
> the directory tree, so the closest one takes precedence and every subproject
> can ship tailored instructions. For example, at time of writing the main
> OpenAI repo has 88 AGENTS.md files."

Source: `components/HowToUseSection.tsx`.

**Precedence / conflicts.**

> "What if instructions conflict? The closest AGENTS.md to the edited file wins;
> explicit user chat prompts override everything."

Source: `components/FAQSection.tsx`.

**Running commands.**

> "Will the agent run testing commands found in AGENTS.md automatically? Yes — if
> you list them. The agent will attempt to execute relevant programmatic checks
> and fix failures before finishing the task."

Source: `components/FAQSection.tsx`.

**The concrete resolution algorithm** is defined per-tool, not by `agents.md`.
The most detailed public description is OpenAI Codex's:

> "In your Codex home directory (defaults to `~/.codex`) … Codex reads
> `AGENTS.override.md` if it exists. Otherwise, Codex reads `AGENTS.md`. …
> Starting at the project root (typically the Git root), Codex walks down to
> your current working directory. In each directory along the path, it checks
> for `AGENTS.override.md`, then `AGENTS.md`, then any fallback names in
> `project_doc_fallback_filenames`. Codex includes at most one file per
> directory. … Codex concatenates files from the root down, joining them with
> blank lines. Files discovered later — closer to your current directory —
> appear later in the combined prompt. Since language models weight recent
> context more heavily, deeper files naturally take precedence. … Codex skips
> empty files and stops adding files once the combined size reaches the limit
> (default 32 KiB, `project_doc_max_bytes`)."

So Codex adds a `~/.codex/AGENTS.md` global layer and an `AGENTS.override.md`
mechanism that are Codex extensions, not part of the base convention.

Source: `https://learn.chatgpt.com/docs/agent-configuration/agents-md.md`
(the current location of the OpenAI Codex "Custom instructions with AGENTS.md"
guide; `https://developers.openai.com/codex/agents-md` and
`https://developers.openai.com/codex/guides/agents-md.md` 308-redirect there).

### 3. Adoption count

- Hero copy and `<meta name="description">`: "used by **over 60k open-source
  projects**", linking the GitHub code search
  `https://github.com/search?q=path%3AAGENTS.md+NOT+is%3Afork+NOT+is%3Aarchived&type=code`.
  `components/ExampleListSection.tsx` says "View 60k+ examples on GitHub".
  Source: `components/Hero.tsx`, `pages/_app.tsx`,
  `components/ExampleListSection.tsx` in `https://github.com/agentsmd/agents.md`.
- Earlier snapshots of the same site said "more than 20,000" (still quoted in
  some third-party captures), and the LF press release says "more than 60,000",
  so the number is a moving GitHub-search count, not an audited figure.

### 4. Which tools read `AGENTS.md`

The `agents.md` "Works with" list (`components/CompatibilitySection.tsx`,
verbatim from the cloned repo) links each tool to its own docs. Names + the
first-party doc URL the site cites:

| Tool                              | First-party reference the site links                                                      |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| OpenAI Codex                      | `https://openai.com/codex/`                                                               |
| Amp                               | `https://ampcode.com`                                                                     |
| Google Jules                      | `https://jules.google`                                                                    |
| Cursor                            | `https://cursor.com`                                                                      |
| Factory                           | `https://factory.ai`                                                                      |
| RooCode                           | `https://roocode.com`                                                                     |
| Aider                             | `https://aider.chat/docs/usage/conventions.html#always-load-conventions`                  |
| Gemini CLI                        | `https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/configuration.md` |
| goose                             | `https://github.com/block/goose`                                                          |
| Kilo Code                         | `https://kilocode.ai/`                                                                    |
| opencode                          | `https://opencode.ai/docs/rules/`                                                         |
| Phoenix                           | `https://phoenix.new/`                                                                    |
| Zed                               | `https://zed.dev/docs/ai/rules`                                                           |
| Semgrep                           | `https://semgrep.dev`                                                                     |
| Warp                              | `https://docs.warp.dev/knowledge-and-collaboration/rules#project-scoped-rules-1`          |
| GitHub Copilot coding agent       | `https://gh.io/coding-agent-docs`                                                         |
| VS Code                           | `https://code.visualstudio.com/docs/editor/artificial-intelligence`                       |
| Ona (formerly Gitpod)             | `https://ona.com`                                                                         |
| Devin                             | `https://devin.ai`                                                                        |
| Windsurf                          | `https://windsurf.com`                                                                    |
| UiPath (Autopilot & Coded Agents) | `https://uipath.github.io/uipath-python`                                                  |
| Augment Code                      | `https://docs.augmentcode.com/cli/overview`                                               |
| JetBrains Junie                   | `https://jetbrains.com/junie`                                                             |

Source: `components/CompatibilitySection.tsx` in
`https://github.com/agentsmd/agents.md`.

Native vs. config vs. symlink, from the tools' own docs:

- **Native, no config**: Codex (see §2), Google Jules — "Jules automatically
  looks for a file named AGENTS.md in the root of your repository"
  (`https://jules.google/docs/`), Cursor — "`AGENTS.md` is a simple markdown
  file for defining agent instructions. Place it in your project root as an
  alternative to `.cursor/rules`" and "Nested `AGENTS.md` support in
  subdirectories is now available" (`https://cursor.com/docs/context/rules`).
- **Native via a filename-priority list**: Zed. Zed reads a personal
  `~/.config/zed/AGENTS.md` (`%APPDATA%\Zed\AGENTS.md` on Windows) and, for
  projects, "checks for project-level instruction files in this order: `.rules`,
  `.cursorrules`, `.windsurfrules`, `.clinerules`,
  `.github/copilot-instructions.md`, `AGENT.md`, `AGENTS.md`, `CLAUDE.md`,
  `GEMINI.md`" — "Project instructions override personal `AGENTS.md` when they
  conflict."
  Source: `https://zed.dev/docs/ai/instructions`.
- **Opt-in config**: Aider — set `read: AGENTS.md` in `.aider.conf.yml` (the
  same mechanism as its older `CONVENTIONS.md`; Aider does not load it
  automatically). Gemini CLI — set `{"context": {"fileName": "AGENTS.md"}}` in
  `.gemini/settings.json`.
  Source: `components/FAQSection.tsx` in `https://github.com/agentsmd/agents.md`;
  `https://aider.chat/docs/usage/conventions.html`.
- **Symlink / import**: the site's migration answer recommends
  `ln -s AGENTS.md AGENT.md`; Claude Code recommends `@AGENTS.md` import or
  `ln -s AGENTS.md CLAUDE.md` (see §6).

### 5. The `.agent` / `.agents/` directory idea

This is **not** a ratified convention. It is several overlapping proposals:

**GitHub issue #71 — "Proposal: Standardize a `.agent` Directory for
Comprehensive Project Context"** on `agentsmd/agents.md`, opened by `haoranba`
on 2025-09-25. Proposes a `.agent/` directory holding `spec/`, `wiki/`,
`links/`, and an `AGENT.md`, as "a single, version-controlled source of truth for
AI agents." Thread status (as of the fetched page): **open, no maintainer
decision**, ~20 comments arguing about `.agent` vs `.agents`, overlap with
issue #9 (lazy-loading), alignment with Anthropic Agent Skills folders
(`scripts/`, `references/`, `assets/`), and pointing at external proposals.
Community members lean toward `.agents` (plural, dotted, to match `AGENTS.md`)
but nothing is adopted.
Source: `https://github.com/agentsmd/agents.md/issues/71` and its comments via
`https://api.github.com/repos/agentsmd/agents.md/issues/71/comments`.

**`agentsfolder/spec` ("AGENTS-1", the ".agents folder specification")** — a
community org spec defining `.agents/` with `manifest.yaml`, `prompts/`,
`modes/`, `policies/`, `skills/`, `scopes/`, `profiles/`, `schemas/`, `state/`
and "a deterministic resolution algorithm." Explicitly: "This document is a work
in progress. It may be updated, replaced, or obsoleted by other documents at any
time." Not referenced by `agents.md`.
Source: `https://github.com/agentsfolder/spec`.

**`bgreenwell/dotagents`** — "A proposed convention for the `.agents/`
directory," authored by `bgreenwell`, **draft status**, self-described as
"inspired by … GitHub Issue #71 in the `agentsmd/agents.md` repository." Keeps a
short router `AGENTS.md` at root, shared docs in `README.md`/`docs/`, and an
optional `.agents/` with `personas/`, `skills/`, `settings/`, `memory/`, `logs/`.
Source: `https://github.com/bgreenwell/dotagents`.

**`dotagentsprotocol.com` (".agents Protocol")** — authored by `aj47`, "draft"
dated 2026-02-24, "open and evolving." Two layers: `~/.agents/` (global) and
`./.agents/` (workspace), with `skills/`, `agents/`, `tasks/`, `memories/`.
Positions `AGENTS.md` as one of seven standards it "integrates."
Source: `https://dotagentsprotocol.com/`.

**What _is_ real** is a fragmented set of tool-specific dot-directories —
`.cursor/rules/`, `.github/`, `.gemini/`, `.claude/`, `.windsurf/rules/`,
`.clinerules/`, `.devin/rules/` — and the newer cross-tool `.agents/skills/`
convention for Agent Skills. Those are per-vendor config trees, not a single
canonical agent-config directory, and none of them is what the `.agents/` spec
proposals are asking for.

### 6. Relationship to Claude Code / `CLAUDE.md`

Claude Code does not read `AGENTS.md`. Anthropic's memory docs:

> "Claude Code reads `CLAUDE.md`, not `AGENTS.md`. If your repository already
> uses `AGENTS.md` for other coding agents, create a `CLAUDE.md` that imports it
> … `@AGENTS.md` … A symlink also works if you don't need to add Claude-specific
> content: `ln -s AGENTS.md CLAUDE.md`."

`CLAUDE.md` predates and parallels `AGENTS.md`: same idea (plain-Markdown,
loaded every session, "context, not enforced configuration"), same
root-plus-nested and concatenate-root-to-leaf load model ("instructions closer
to where you launched Claude are read last"), plus scopes `AGENTS.md` lacks —
managed-policy (`/etc/claude-code/CLAUDE.md`), user (`~/.claude/CLAUDE.md`),
`CLAUDE.local.md`, `.claude/rules/` with `paths:` frontmatter. `/init` (with
`CLAUDE_CODE_NEW_INIT=1`) and `/import` can read an existing `AGENTS.md`,
`.cursor/rules/`, `.github/copilot-instructions.md`, etc. and fold them into
`CLAUDE.md`.

Source: `https://code.claude.com/docs/en/memory` (the current location of
Claude Code "How Claude remembers your project" / memory docs;
`https://docs.claude.com/en/docs/claude-code/memory` 301-redirects there).

## What primary sources could NOT confirm

- **An exact author or "spec editor" for `AGENTS.md`.** The site credits five
  companies collectively; no individual, RFC, or dated design doc is published.
  The repo's git history starts at a squashed "Initial commit".
- **A precise adoption number.** "60k" is a live GitHub code-search result the
  site links; it was "20,000" in earlier snapshots. No audited count exists.
- **A single normative precedence spec.** `agents.md` gives one sentence
  ("closest file wins; chat overrides"); every concrete detail (global layer,
  size caps, override files, merge order) is defined independently by each tool,
  and they differ.
- **Any maintainer ruling on `.agents/` / `.agent/`.** Issue #71 is open with no
  decision; the external specs are all self-labeled drafts. Whether any of them
  becomes real is undetermined as of 2026-08-28.
- **Whether every tool in the "Works with" list truly reads `AGENTS.md`
  natively.** Some (Aider, Gemini CLI) require config; the list links vendor
  doc _home pages_ rather than the specific feature page in several cases
  (Amp, Factory, Devin, Windsurf, Semgrep, Ona), so native-vs-config could not
  be verified for those from the cited URL alone.
- **The full text of the OpenAI Codex guide and the OpenAI foundation blog
  post** — both were reachable only through redirects / search summaries during
  research, not fetched in full; quoted passages are from those summaries and
  the Linux Foundation press release.

## Sources

All accessed 2026-08-28.

Primary — the convention itself:

- `https://agents.md/` — the canonical website.
- `https://github.com/agentsmd/agents.md` — canonical repo (cloned; `README.md`,
  `components/WhySection.tsx`, `components/AboutSection.tsx`,
  `components/FAQSection.tsx`, `components/HowToUseSection.tsx`,
  `components/CompatibilitySection.tsx`, `components/Hero.tsx`,
  `components/ExampleListSection.tsx`, `components/Footer.tsx`, `pages/_app.tsx`,
  git log).
- `https://api.github.com/repos/agentsmd/agents.md` — repo metadata
  (`created_at` 2025-08-19).
- `https://github.com/openai/agents.md` — 301 redirect to `agentsmd/agents.md`
  (evidence of the original OpenAI-org home).
- `https://github.com/agentsmd/agents.md/issues/71` +
  `https://api.github.com/repos/agentsmd/agents.md/issues/71/comments` — the
  `.agent` directory proposal thread.

Primary — governance:

- `https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation`
  — LF press release naming AGENTS.md as an anchor contribution (2025-12-09).
- `https://openai.com/index/agentic-ai-foundation/` — OpenAI's announcement
  (accessed via search summary; direct fetch returned 403).

Primary — adopting tools' own docs:

- `https://learn.chatgpt.com/docs/agent-configuration/agents-md.md` — OpenAI
  Codex "Custom instructions with AGENTS.md" (target of the
  `developers.openai.com/codex/...` redirects).
- `https://cursor.com/docs/context/rules` — Cursor rules / AGENTS.md support.
- `https://zed.dev/docs/ai/instructions` and `https://zed.dev/docs/ai/rules` —
  Zed instruction-file priority list.
- `https://jules.google/docs/` — Google Jules AGENTS.md behavior (via search
  summary).
- `https://aider.chat/docs/usage/conventions.html` — Aider conventions /
  `read:` config.
- `https://code.claude.com/docs/en/memory` — Claude Code memory docs, "Claude
  Code reads `CLAUDE.md`, not `AGENTS.md`" (target of the
  `docs.claude.com/en/docs/claude-code/memory` redirect).

Primary — the `.agents/` directory proposals (all self-labeled drafts):

- `https://github.com/agentsfolder/spec` — ".agents folder specification"
  (AGENTS-1).
- `https://github.com/bgreenwell/dotagents` — `dotagents` `.agents/` convention.
- `https://dotagentsprotocol.com/` — ".agents Protocol" by `aj47`.
