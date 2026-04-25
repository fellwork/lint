# Fellwork Lint — Design Spec

**Date:** 2026-04-24
**Status:** Approved (brainstorming phase complete; ready for implementation planning)
**Repo:** `c:/git/fellwork/lint`

## Context

Fellwork has older shared-config repos ([eslint/](../../../../eslint/), [prettier-config/](../../../../prettier-config/), [shared-configs/](../../../../shared-configs/)) built on the pnpm + turbo + changesets + ESLint + Prettier stack. This project replaces them with a modern stack centered on Biome.

**Goals:**
- Provide opinionated, shared Biome configurations for all Fellwork projects.
- Cover the actual project archetypes Fellwork ships: TS libraries, Node services, plain React, plain Vue, Next.js, and Nuxt.
- Be the single source of truth for lint + format conventions across Fellwork.

**Non-goals:**
- Maintaining feature parity with the old eslint/prettier configs (those are being hard-cut on `lint/` v1 — see Migration).
- Shipping oxlint configs (considered, deferred — see Decisions).
- Shipping Prettier configs (Biome's formatter replaces Prettier).
- Authoring custom oxlint or Biome plugins to fill Vue/Nuxt rule gaps (documented as gaps instead).

## Decisions Summary

| # | Decision |
|---|---|
| 1 | Monorepo, but **one package** to start: `@fellwork/biome-config`. Layout supports adding more later. |
| 2 | **No Prettier package.** Biome's formatter is the chosen formatter. |
| 3 | **Per-project-type presets:** `base`, `lib`, `node`, `react`, `vue`, `next`, `nuxt`. Layered (`next` extends `react`, `nuxt` extends `vue`). |
| 4 | **Publishing:** GitHub Packages, `@fellwork` scope, private. |
| 5 | **Vue/Nuxt scope:** antfu-inspired curation philosophy, ship gap-filling reference configs (vue-tsc tsconfig, GAPS.md), do not author custom plugins. |
| 6 | **Migration:** hard cut — old eslint/prettier-config repos stop publishing once `lint/` v1 ships. |
| 7 | **Versioning:** Moon orchestrates, `bumpp` does the bumps, `bun publish` to GitHub Packages. No changelog file; commit messages + auto-generated GitHub Releases serve as the changelog. |
| 8 | **Testing:** fixture projects per preset with strict expected-rule-ID matching. Catches Biome version-bump regressions and accidental rule changes. |
| 9 | **Releases:** CI-driven via PR label (`semver:patch` / `semver:minor` / `semver:major`). PRs without a `semver:*` label merge silently with no release. |
| 10 | **Composition rule:** child presets are additive by default. A child may relax a parent rule **only when required for the child context to work**, with an inline comment and a GAPS.md note. |
| 11 | **Adding a rule = minor bump** (post-1.0). Removing a rule = major. Bug fix to a rule's pattern = patch. |

## Why Biome-only (no oxlint)

Considered and explicitly chosen biome-only over a parallel oxlint package:

**Pros (taken):** one tool, one config, one binary; massively simpler maintenance; fixture tests halve in size; no two-tool coordination; matches the minimal-stack ethos.

**Cons (accepted):** Biome's lint catalog is thinner than oxlint's for `eslint-plugin-react`, `eslint-plugin-vue`, and the long tail of typescript-eslint corners. Vue/Nuxt rule coverage in particular is meaningfully reduced versus an oxlint-based stack.

**Mitigations:** documented gaps in `extras/GAPS.md`; reference `vue-tsc` integration for template type-checking; revisit oxlint inclusion if Biome's catalog stays too thin in practice.

## Repo Layout & Toolchain

```
lint/
├── .moon/
│   ├── workspace.yml             # projects glob: packages/*
│   ├── toolchain.yml             # bun runtime
│   └── tasks.yml                 # shared tasks: ci, release, lint, test
├── .prototools                   # pinned versions: bun, biome, node, moon
├── .github/workflows/
│   ├── ci.yml                    # PR: lint + fixture tests
│   └── release.yml               # main merge: label-driven bumpp + bun publish
├── packages/
│   └── biome-config/
├── package.json                  # root, private, workspaces=packages/*
├── bun.lockb
├── moon.yml                      # root project config
├── .npmrc                        # @fellwork → GitHub Packages
├── .gitignore
├── docs/superpowers/specs/       # this file lives here
├── README.md
└── LICENSE
```

**Tool pins via proto** (`.prototools`):
- `bun` — runtime, package manager, publisher
- `node` — LTS, only for tools that shell out to node
- `biome` — pinned CLI for fixture tests and self-dogfooding
- `moon` — pinned so every dev/CI runs the same version

**Config authoring format:** hand-authored JSON. Biome reads `biome.json` (JSONC supported). No TS-source → JSON build step. If preset composition gets painful later, revisit.

**No `.changeset/` directory.** Per Decision 7.

`packages/` directory retained even with one package — supports future packages without restructuring; moon's workspace ergonomics expect it.

## Package Internals — `@fellwork/biome-config`

```
packages/biome-config/
├── package.json
├── moon.yml                     # tasks: ci, test, build (no-op), publish
├── README.md
├── presets/
│   ├── base.json                # TS baseline (antfu-inspired, no stylistic rules)
│   ├── lib.json                 # extends base + stricter export rules
│   ├── node.json                # extends base + Node hygiene
│   ├── react.json               # extends base + React/JSX rules
│   ├── vue.json                 # extends base + Vue script-block rules
│   ├── next.json                # extends react + Next ignores/file conventions
│   └── nuxt.json                # extends vue + Nuxt ignores/file conventions
├── extras/
│   ├── GAPS.md                  # what @nuxt/eslint and eslint-plugin-vue did
│   │                            # that this stack doesn't, plus mitigations
│   ├── vue-tsconfig.json        # recommended tsconfig for vue-tsc template type-checking
│   └── package-scripts.md       # copy-paste npm scripts for vue-tsc, tsc --noEmit, etc.
└── tests/
    ├── fixtures/
    │   ├── base/
    │   ├── lib/
    │   ├── node/
    │   ├── react/
    │   ├── vue/
    │   ├── next/
    │   └── nuxt/
    └── run-fixtures.ts          # bun-runnable test runner
```

**`package.json` shape:**

```json
{
  "name": "@fellwork/biome-config",
  "publishConfig": { "registry": "https://npm.pkg.github.com" },
  "files": ["presets"],
  "exports": {
    "./base":  "./presets/base.json",
    "./lib":   "./presets/lib.json",
    "./node":  "./presets/node.json",
    "./react": "./presets/react.json",
    "./vue":   "./presets/vue.json",
    "./next":  "./presets/next.json",
    "./nuxt":  "./presets/nuxt.json"
  },
  "peerDependencies": { "@biomejs/biome": ">=1.5.0" }
}
```

**Consumer usage** in their `biome.json`:

```json
{ "extends": ["@fellwork/biome-config/nuxt"] }
```

**`extras/` not exported** — reference material reached via repo browsing or copy-paste from the README, not runtime config.

## Preset Rule Selection Philosophy

- **Antfu-inspired, stripped of stylistic rules.** Biome's formatter owns formatting; lint rules never overlap.
- **Errors over warnings.** Warnings get ignored; errors get fixed. Almost everything is `error`.
- **Composition is additive by default** (Decision 10). Child presets only add rules or upgrade severity. Relaxations require an inline comment explaining the framework idiom that necessitates it, plus a GAPS.md entry.
- **No project-aware rules attempted.** Auto-import detection, route conventions, server-route checks (the `@nuxt/eslint` magic) are documented gaps, not faked.

**What each preset adds:**

| Preset | Adds |
|---|---|
| `base` | Biome recommended + TS hygiene + unicorn-style cleanliness + perfectionist sorting + security baseline. No formatter rules. |
| `lib` | Stricter export rules (no default exports, named exports preferred). |
| `node` | Node-relevant rules (process/fs hygiene), security additions. |
| `react` | React-specific rules + react-hooks rules where Biome supports them. |
| `vue` | Vue script-block rules from Biome's `.vue` support. |
| `next` | Ignore `.next/`, `out/`; file conventions for `app/**`, `pages/**`; React Server Component parser hints. |
| `nuxt` | Ignore `.nuxt/`, `.output/`, `.data/`; file conventions for `pages/`, `layouts/`, `composables/`, `server/`. |

**`next` and `nuxt` carry value through file-pattern / ignore / parser config**, since Biome lacks framework-specific rules. Without those deltas, `next`/`nuxt` would be aliases for `react`/`vue`.

**Real linting horsepower** in this stack is Biome alone — the documented gap is meaningful, especially for Vue templates and Nuxt project conventions.

## Gap-Filling Extras (`packages/biome-config/extras/`)

**`GAPS.md`** — documents what's lost vs the old `eslint-plugin-vue` + `@nuxt/eslint` setup:
- Auto-import awareness
- Route-definition checks
- Server-route conventions
- Template-level Vue rules

For each gap, lists mitigations: vue-tsc for template type-checking, manual conventions, future plugin candidates if the gap proves painful in practice.

**`vue-tsconfig.json`** — recommended tsconfig snippet enabling `vue-tsc --noEmit` template type-checking. Catches a meaningful subset of what eslint-plugin-vue's template rules caught.

**`package-scripts.md`** — copy-paste `package.json` script snippets for consumers: `lint`, `lint:templates` (vue-tsc), `typecheck` (tsc --noEmit), `format`.

Both linked from the package README's Vue/Nuxt sections.

## Testing Strategy

**Fixture-based tests, strict expected-rule-ID matching.**

```
packages/biome-config/tests/
├── fixtures/
│   ├── <preset>/
│   │   ├── biome.json           # extends the preset under test
│   │   ├── good.ts              # must lint clean (exit 0)
│   │   ├── bad.ts               # must lint dirty (exit non-zero)
│   │   ├── bad.expected.txt     # exact set of rule IDs expected to fire
│   │   └── (for vue/nuxt) template-uncovered.vue
│   │                            # documented-gap fixture: contains template
│   │                            # bugs the preset *won't* catch, with comment
│   │                            # noting the gap. Makes the limit visible in
│   │                            # the test suite, not just the docs.
└── run-fixtures.ts              # bun-runnable; invokes pinned biome CLI
```

**Test loop per fixture:**
1. `biome check fixtures/<preset>/good.*` → assert exit 0.
2. `biome check fixtures/<preset>/bad.*` → assert exit non-zero AND reported rule IDs equal `bad.expected.txt` (exact set, not subset).

**Strict matching is intentional.** Every Biome version bump that introduces a new rule will require updating `bad.expected.txt` files. That cost is the feature: it makes silent rule-set changes impossible.

**Run via moon:** `moon run biome-config:test`. Wired into CI on every PR.

**What this catches:**
- Biome version bumps that rename or remove rules.
- Accidental rule changes during preset edits.
- Preset composition bugs (child preset accidentally relaxing a parent rule).

**What this does NOT catch:**
- Whether the rules are *good choices* — design judgment, not testable.
- Real-world performance against a large codebase — fixtures are intentionally small.

## Release Flow

**CI-driven, label-gated, on merge to `main`.**

**Per-PR labeling:**
- `semver:patch` / `semver:minor` / `semver:major` — required to trigger a release on merge.
- `semver:canary` — publishes a canary release with `--tag canary`; consumers opt in via `bun add @fellwork/biome-config@canary`.
- **No label = no release.** PR merges silently. Lets docs-only / test-only PRs land without burning a version.

**On merge:**
1. `release.yml` workflow checks for `semver:*` label; if absent, exits cleanly.
2. Installs proto-pinned tools.
3. `moon run :release` invokes:
   - `bumpp --<level>` per the label → updates `package.json`, creates release commit, creates git tag (`@fellwork/biome-config@0.3.0`).
   - `bun publish --registry https://npm.pkg.github.com` per affected package.
   - `git push --follow-tags`.
4. `gh release create <tag> --generate-notes` creates the GitHub Release with auto-populated commit list — this is the consumer-facing changelog.

**Versioning conventions:**
- Pre-1.0 (`0.x.y`) until at least one Fellwork project is consuming `lint/` in production.
- 1.0 ships when preset shape has been stable for ~30 days post first consumer.
- Post-1.0: strict semver. Adding a rule = minor (Decision 11). Removing a rule = major. Bug fix to existing rule's pattern = patch.

**Authentication:**
- Normal flow (CI): workflow uses `${{ secrets.GITHUB_TOKEN }}` with `permissions: { contents: write, packages: write }`. No PAT required.
- Exceptional flow (local canary debugging only): a maintainer may publish a canary from their laptop using a personal `~/.npmrc` with a PAT scoped `read:packages, write:packages` on `@fellwork`. Not part of the normal release path.

## CI Workflows

### `ci.yml` — every PR

```yaml
on: pull_request
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - install proto, run `proto install`
      - bun install --frozen-lockfile
      - moon run :ci
```

`:ci` task fans out to per-project `ci`. For `biome-config:ci`:
- `biome check` on the repo's own source (dogfooding configs against themselves).
- `bun run tests/run-fixtures.ts` (fixture pass/fail assertions).
- Schema validation: every preset JSON parses against Biome's config schema.

### `release.yml` — on merge to `main`

```yaml
on:
  pull_request:
    types: [closed]
    branches: [main]
permissions:
  contents: write
  packages: write
jobs:
  release:
    if: github.event.pull_request.merged == true
    steps:
      - check for semver:* label on the merged PR; exit cleanly if none
      - checkout main with fetch-depth: 0
      - install proto + tools
      - bun install --frozen-lockfile
      - moon run :release
      - gh release create <tag> --generate-notes
```

### Branch protection on `main`

- Require `ci.yml` to pass.
- Require 1 review.
- Disallow direct pushes — forces all changes through PRs (which the release workflow keys off).

## Migration Path (Hard Cut)

Per Decision 6:

1. **Build `@fellwork/biome-config` v0.x** with all 7 presets, fixtures passing, CI green.
2. **Publish v0.1.0** to GitHub Packages.
3. **Migrate one Fellwork project** (likely [foreman/](../../../../foreman/) or [scribe/](../../../../scribe/) — small Node services) as the first real consumer. Iterate presets based on what's missing.
4. **Migrate remaining Fellwork projects** in parallel. Each project's PR removes its old eslint/prettier config and adds `@fellwork/biome-config` extends.
5. **Stop publishing** from old [eslint/](../../../../eslint/) and [prettier-config/](../../../../prettier-config/) repos. Archive once the last Fellwork project migrates.
6. **Cut v1.0** when preset shape has been stable for ~30 days post-first-consumer.

Old repo versions remain installable from npm/GitHub Packages indefinitely (npm doesn't unpublish), so any project that hasn't migrated can pin to the last published version while it catches up.

## Open Questions Deferred to Implementation

- Exact `bumpp` configuration (config file format, hooks).
- Exact moon task definitions in `.moon/tasks.yml`.
- The actual rule lists per preset — these are implementation work, informed by `@antfu/eslint-config` and `@nuxt/eslint` as reference points but adapted to Biome's catalog.
- Whether to add a `format-only` preset (Biome with formatter on, lint rules off) for projects that want only the formatter — defer until requested.
