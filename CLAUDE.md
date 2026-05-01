# fellwork-lint

Shared lint and format configuration for Fellwork projects. Published as
`@fellwork/biome-config` with presets: `base`, `lib`, `node`, `react`, `vue`,
`next`, `nuxt`.

## Commands

```bash
proto use            # Install pinned tool versions (bun, node, moon)
bun install          # Install biome + bumpp into node_modules
moon run :ci         # Lint + fixture tests across all packages
```

## Stack

- **bun** — runtime, package manager, publisher
- **moon** — task orchestrator
- **proto** — pinned tool versions (`.prototools`)
- **biome** — linter + formatter (npm devDeps, not proto)
- **bumpp** — semver bumping
- Published to npm public registry as `@fellwork/biome-config`

## Conventions

- Releases are CI-driven via PR labels. Do not bump versions manually.
- Fixtures under `packages/biome-config/fixtures/` are the regression suite — every preset change needs a fixture diff.
- Dogfooding: this repo lints itself with its own published config.

## gstack

AI dev tooling — headless browser, QA, design review, deploy workflows.

**Install (one-time per machine):**
```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup
```

Use `/browse` for all web browsing. Never use `mcp__claude-in-chrome__*` tools directly.

Available skills:
`/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/setup-gbrain`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`

## Agent-Specific Notes

This repository includes a compiled documentation database/knowledgebase at `AGENTS.db`.
For context for any task, you MUST use MCP `agents_search` to look up context including architectural, API, and historical changes.
Treat `AGENTS.db` layers as immutable; avoid in-place mutation utilities unless required by the design.
