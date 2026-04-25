# fellwork-lint

Shared lint and format configuration for Fellwork projects.

## Packages

- [`@fellwork/biome-config`](./packages/biome-config) — Biome shared configurations (presets: `base`, `lib`, `node`, `react`, `vue`, `next`, `nuxt`).

## Toolchain

- **bun** — runtime, package manager, publisher
- **moon** — task orchestrator
- **proto** — pinned tool versions (see `.prototools`)
- **biome** — linter + formatter (installed via npm devDeps, not proto)
- **bumpp** — semver bumping
- **npm public registry** — published as `@fellwork/biome-config`

## Local development

Install [proto](https://moonrepo.dev/proto), then:

```bash
proto use            # installs pinned tool versions (bun, node, moon)
bun install          # installs biome and bumpp into node_modules
moon run :ci         # runs lint + fixture tests across all packages
```

## Releasing

Releases are CI-driven. To cut a release, add **one** of these labels to your PR before merging:

- `semver:patch` — bug fix to existing rule's pattern
- `semver:minor` — adding a rule, new preset, or non-breaking change
- `semver:major` — removing a rule, breaking preset reshape, or peer-dep bump
- `semver:canary` — pre-release, publishes with `--tag canary`

Merging a labeled PR triggers [`.github/workflows/release.yml`](./.github/workflows/release.yml) which bumps the version, publishes to the npm public registry, and creates a GitHub Release with auto-generated release notes from the commit log.

> **Required repo secret:** `NPM_TOKEN` — an npm Automation token with publish rights for the `@fellwork` scope. Generate at npmjs.com → Account → Access Tokens → "Automation".

PRs without a `semver:*` label merge silently with no release. Use this for docs-only or test-only changes.

## Recommended branch protection on `main`

In GitHub repo settings, configure:
- Require `verify` (the CI workflow's job) to pass before merging
- Require 1 review
- Require all conversations resolved
- Disallow direct pushes — all changes via PR

## License

MIT — see [LICENSE](./LICENSE).
