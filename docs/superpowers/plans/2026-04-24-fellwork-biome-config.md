# @fellwork/biome-config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, test, and ship `@fellwork/biome-config` v0.1.0 — a Biome shared configuration package with seven per-project-type presets, fixture-based regression tests, and a CI-driven label-gated release pipeline publishing to GitHub Packages.

**Architecture:** A single-package monorepo orchestrated by Moon, with Bun as the runtime/installer/publisher and proto pinning all CLI versions. The package ships hand-authored JSON presets exported via `package.json#exports`. Fixtures per preset assert exact rule-ID firings against the pinned Biome CLI.

**Tech Stack:** bun (runtime + package manager + publisher), proto (tool version manager), moon (task orchestrator), biome (linter + formatter under test), bumpp (semver bumping), GitHub Actions, GitHub Packages.

**Spec:** [docs/superpowers/specs/2026-04-24-fellwork-lint-design.md](../specs/2026-04-24-fellwork-lint-design.md)

---

## Pre-Flight Checks

Before starting, verify:
- Working directory is `c:/git/fellwork/lint/`
- `git status` is clean (only the spec commit on `main`)
- `proto --version` works (install proto first if not: https://moonrepo.dev/proto)
- The maintainer has a GitHub PAT with `read:packages, write:packages` scope on `@fellwork` for local canary testing only — not required for normal flow

---

## Task 1: Pin tool versions with proto

**Files:**
- Create: `.prototools`

- [ ] **Step 1: Write `.prototools`**

```toml
bun = "1.1.34"
node = "20.18.1"
moon = "1.30.4"
biome = "1.9.4"
```

> **Note:** These are reasonable pins as of 2026-04-24 — the implementer should bump to the actual current stable versions of each tool before starting. Run `proto outdated` after creating the file to see latest.

- [ ] **Step 2: Install pinned tools**

Run: `proto use`
Expected: proto installs each pinned version and shims them into PATH.

Verify: `bun --version`, `moon --version`, `biome --version` each report the pinned version.

- [ ] **Step 3: Commit**

```bash
git add .prototools
git commit -m "chore: pin tool versions with proto"
```

---

## Task 2: Initialize Bun workspace at the repo root

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.npmrc`

- [ ] **Step 1: Write root `package.json`**

```json
{
  "name": "fellwork-lint",
  "private": true,
  "type": "module",
  "workspaces": ["packages/*"],
  "scripts": {
    "ci": "moon run :ci",
    "release": "moon run :release"
  },
  "engines": {
    "bun": ">=1.1.0"
  }
}
```

- [ ] **Step 2: Write `.gitignore`**

```gitignore
node_modules/
.moon/cache/
.moon/docker/
*.log
.DS_Store
.idea/
.vscode/
dist/
build/
```

- [ ] **Step 3: Write `.npmrc`**

```
@fellwork:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

> **Note:** `NODE_AUTH_TOKEN` is set by the GitHub Actions release workflow. Locally, maintainers source it from their PAT only when running canary publishes; normal workflow does not need it.

- [ ] **Step 4: Run `bun install`**

Run: `bun install`
Expected: creates `bun.lockb`, no packages installed yet (workspaces are empty).

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore .npmrc bun.lockb
git commit -m "chore: bootstrap bun workspace"
```

---

## Task 3: Initialize Moon workspace

**Files:**
- Create: `.moon/workspace.yml`
- Create: `.moon/toolchain.yml`
- Create: `.moon/tasks.yml`

- [ ] **Step 1: Write `.moon/workspace.yml`**

```yaml
$schema: 'https://moonrepo.dev/schemas/workspace.json'

projects:
  - 'packages/*'

vcs:
  manager: 'git'
  defaultBranch: 'main'
```

- [ ] **Step 2: Write `.moon/toolchain.yml`**

```yaml
$schema: 'https://moonrepo.dev/schemas/toolchain.json'

# Tool versions are sourced from .prototools (proto-managed).
# Moon will use the proto-installed binaries.
bun: {}
node: {}
```

- [ ] **Step 3: Write `.moon/tasks.yml`**

```yaml
$schema: 'https://moonrepo.dev/schemas/tasks.json'

# Inherited by every project. Individual projects override `command` per task.
tasks:
  ci:
    deps:
      - '~:check'
      - '~:test'
    inputs: []

  check:
    command: 'noop'
    options:
      runInCI: true

  test:
    command: 'noop'
    options:
      runInCI: true

  release:
    command: 'noop'
    options:
      runInCI: false   # only fired by the release workflow, not normal CI
```

- [ ] **Step 4: Verify Moon picks up the workspace**

Run: `moon query projects`
Expected: empty list (no projects under `packages/*` yet, but no errors).

- [ ] **Step 5: Commit**

```bash
git add .moon/
git commit -m "chore: bootstrap moon workspace"
```

---

## Task 4: Create the `@fellwork/biome-config` package skeleton

**Files:**
- Create: `packages/biome-config/package.json`
- Create: `packages/biome-config/moon.yml`
- Create: `packages/biome-config/README.md`
- Create: `packages/biome-config/presets/.gitkeep`
- Create: `packages/biome-config/tests/fixtures/.gitkeep`

- [ ] **Step 1: Write `packages/biome-config/package.json`**

```json
{
  "name": "@fellwork/biome-config",
  "version": "0.0.0",
  "description": "Shared Biome configurations for Fellwork projects",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/fellwork/lint.git",
    "directory": "packages/biome-config"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "restricted"
  },
  "files": ["presets", "extras"],
  "exports": {
    "./base":  "./presets/base.json",
    "./lib":   "./presets/lib.json",
    "./node":  "./presets/node.json",
    "./react": "./presets/react.json",
    "./vue":   "./presets/vue.json",
    "./next":  "./presets/next.json",
    "./nuxt":  "./presets/nuxt.json"
  },
  "peerDependencies": {
    "@biomejs/biome": ">=1.5.0"
  },
  "devDependencies": {
    "@biomejs/biome": "1.9.4"
  }
}
```

- [ ] **Step 2: Write `packages/biome-config/moon.yml`**

```yaml
$schema: 'https://moonrepo.dev/schemas/project.json'

type: 'library'
language: 'typescript'

tasks:
  check:
    command: 'biome check presets'
    inputs:
      - 'presets/**/*.json'

  test:
    command: 'bun run tests/run-fixtures.ts'
    inputs:
      - 'presets/**/*.json'
      - 'tests/**'

  release:
    command: 'bun run scripts/release.ts'
    options:
      runInCI: false
```

- [ ] **Step 3: Write minimal `packages/biome-config/README.md`**

```markdown
# @fellwork/biome-config

Shared Biome configurations for Fellwork projects.

## Install

```bash
bun add -D @fellwork/biome-config @biomejs/biome
```

## Usage

In your `biome.json`:

```json
{ "extends": ["@fellwork/biome-config/<preset>"] }
```

Available presets: `base`, `lib`, `node`, `react`, `vue`, `next`, `nuxt`.

See [extras/GAPS.md](./extras/GAPS.md) for documented coverage gaps and mitigations.
```

- [ ] **Step 4: Add placeholder files to keep empty dirs in git**

```bash
touch packages/biome-config/presets/.gitkeep
mkdir -p packages/biome-config/tests/fixtures
touch packages/biome-config/tests/fixtures/.gitkeep
```

- [ ] **Step 5: Re-run `bun install` to register the workspace**

Run: `bun install`
Expected: installs `@biomejs/biome@1.9.4` into `packages/biome-config/node_modules/`. Moon should now detect the project.

Verify: `moon query projects`
Expected: lists `biome-config`.

- [ ] **Step 6: Commit**

```bash
git add packages/biome-config/ bun.lockb
git commit -m "feat: scaffold @fellwork/biome-config package"
```

---

## Task 5: Build the fixture test runner

**Files:**
- Create: `packages/biome-config/tests/run-fixtures.ts`

The test runner is the load-bearing piece: it enforces exact-rule-ID matching for `bad.*` files and clean linting for `good.*` files. We TDD it against a tiny throwaway fixture before writing any presets.

- [ ] **Step 1: Create a throwaway fixture for runner development**

Run:
```bash
mkdir -p packages/biome-config/tests/fixtures/_runner-self-test
```

Create `packages/biome-config/tests/fixtures/_runner-self-test/biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": false,
      "suspicious": {
        "noDebugger": "error"
      }
    }
  }
}
```

Create `packages/biome-config/tests/fixtures/_runner-self-test/good.ts`:

```typescript
export const greeting = 'hello'
```

Create `packages/biome-config/tests/fixtures/_runner-self-test/bad.ts`:

```typescript
debugger
export const greeting = 'hello'
```

Create `packages/biome-config/tests/fixtures/_runner-self-test/bad.expected.txt`:

```
lint/suspicious/noDebugger
```

- [ ] **Step 2: Verify Biome's JSON reporter format**

Run: `cd packages/biome-config && bunx biome check --reporter=json tests/fixtures/_runner-self-test/bad.ts`

Capture the output. Inspect the JSON structure — confirm where rule categories appear (likely `diagnostics[].category` in 1.9.x).

> **Note to implementer:** If the JSON shape differs from what `run-fixtures.ts` below assumes, adjust the parsing in Step 3 accordingly. The exact field name (`category` vs `rule` vs `code`) is the only thing likely to drift between Biome versions.

- [ ] **Step 3: Write `packages/biome-config/tests/run-fixtures.ts`**

```typescript
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const FIXTURES_DIR = join(import.meta.dir, 'fixtures')

interface FixtureFailure {
  preset: string
  file: string
  reason: string
}

const failures: FixtureFailure[] = []

function listPresets(): string[] {
  return readdirSync(FIXTURES_DIR).filter(name => {
    if (name.startsWith('.')) return false
    if (name.startsWith('_')) return false
    return statSync(join(FIXTURES_DIR, name)).isDirectory()
  })
}

function runBiome(args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync('bunx', ['biome', ...args], {
    encoding: 'utf8',
    cwd: join(import.meta.dir, '..'),
  })
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

function extractRuleIds(jsonReporterStdout: string): Set<string> {
  const ids = new Set<string>()
  try {
    const parsed = JSON.parse(jsonReporterStdout)
    const diagnostics = parsed.diagnostics ?? parsed.summary?.diagnostics ?? []
    for (const diag of diagnostics) {
      const id = diag.category ?? diag.rule ?? diag.code
      if (id) ids.add(id)
    }
  } catch {
    // empty set; caller treats as failure
  }
  return ids
}

function assertGood(preset: string, dir: string, file: string) {
  const result = runBiome(['check', join(dir, file)])
  if (result.status !== 0) {
    failures.push({
      preset,
      file,
      reason: `expected clean lint, got exit ${result.status}:\n${result.stdout}\n${result.stderr}`,
    })
  }
}

function assertBad(preset: string, dir: string, file: string) {
  const expectedPath = join(dir, file.replace(/\.[^.]+$/, '.expected.txt'))
  if (!existsSync(expectedPath)) {
    failures.push({ preset, file, reason: `missing ${file.replace(/\.[^.]+$/, '.expected.txt')}` })
    return
  }
  const expected = new Set(
    readFileSync(expectedPath, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean),
  )
  const result = runBiome(['check', '--reporter=json', join(dir, file)])
  if (result.status === 0) {
    failures.push({ preset, file, reason: 'expected violations, got clean lint' })
    return
  }
  const reported = extractRuleIds(result.stdout)
  const missing = [...expected].filter(id => !reported.has(id))
  const unexpected = [...reported].filter(id => !expected.has(id))
  if (missing.length || unexpected.length) {
    const parts: string[] = []
    if (missing.length) parts.push(`missing: ${missing.join(', ')}`)
    if (unexpected.length) parts.push(`unexpected: ${unexpected.join(', ')}`)
    failures.push({ preset, file, reason: parts.join('; ') })
  }
}

function runPreset(preset: string) {
  const dir = join(FIXTURES_DIR, preset)
  const entries = readdirSync(dir)
  for (const entry of entries) {
    if (entry === 'biome.json') continue
    if (entry.endsWith('.expected.txt')) continue
    if (entry.startsWith('good.')) {
      assertGood(preset, dir, entry)
    } else if (entry.startsWith('bad.')) {
      assertBad(preset, dir, entry)
    }
  }
}

const presets = listPresets()
if (presets.length === 0) {
  console.error('no fixtures found under tests/fixtures/')
  process.exit(1)
}

for (const preset of presets) {
  runPreset(preset)
}

if (failures.length > 0) {
  console.error(`\n${failures.length} fixture failure(s):`)
  for (const f of failures) {
    console.error(`  [${f.preset}/${f.file}] ${f.reason}`)
  }
  process.exit(1)
}

console.log(`✓ all fixtures pass (${presets.length} preset${presets.length === 1 ? '' : 's'})`)
```

- [ ] **Step 4: Run the runner against the throwaway self-test fixture**

Wait — the runner's `listPresets` filters out names starting with `_`, so the self-test fixture is invisible to it. That's intentional once real presets exist, but for this verification step we need a real fixture. Skip this step if no real fixture exists yet; the runner will be exercised end-to-end starting in Task 6.

For now just type-check the runner:

Run: `cd packages/biome-config && bunx tsc --noEmit --target esnext --module esnext --moduleResolution bundler --strict tests/run-fixtures.ts`
Expected: no errors.

- [ ] **Step 5: Remove the throwaway self-test fixture**

```bash
rm -rf packages/biome-config/tests/fixtures/_runner-self-test
```

- [ ] **Step 6: Commit**

```bash
git add packages/biome-config/tests/run-fixtures.ts
git commit -m "feat: add fixture test runner with strict rule-id matching"
```

---

## Task 6: Build the `base` preset (first real preset, TDD)

**Files:**
- Create: `packages/biome-config/tests/fixtures/base/biome.json`
- Create: `packages/biome-config/tests/fixtures/base/good.ts`
- Create: `packages/biome-config/tests/fixtures/base/bad.ts`
- Create: `packages/biome-config/tests/fixtures/base/bad.expected.txt`
- Create: `packages/biome-config/presets/base.json`

- [ ] **Step 1: Write fixture `biome.json` extending the not-yet-existing preset**

`packages/biome-config/tests/fixtures/base/biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": ["../../../presets/base.json"]
}
```

> **Note:** Fixtures use a relative path to the preset under test rather than the npm package name. This avoids needing the package to be `bun link`-ed during testing and proves the preset file is self-contained.

- [ ] **Step 2: Write `good.ts` (must lint clean)**

`packages/biome-config/tests/fixtures/base/good.ts`:

```typescript
export interface User {
  readonly id: string
  readonly name: string
}

export const formatUser = (user: User): string => {
  return `${user.name} (${user.id})`
}

export const users: readonly User[] = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
]
```

- [ ] **Step 3: Write `bad.ts` (must violate specific rules)**

`packages/biome-config/tests/fixtures/base/bad.ts`:

```typescript
let unused: any = 1

if (1 == '1') {
  console.log('uh')
}

debugger

export function broken(x) {
  return x
}
```

- [ ] **Step 4: Write `bad.expected.txt` (the rule IDs that MUST fire)**

`packages/biome-config/tests/fixtures/base/bad.expected.txt`:

```
lint/suspicious/noExplicitAny
lint/style/useConst
lint/suspicious/noDoubleEquals
lint/suspicious/noDebugger
lint/correctness/noUnusedVariables
```

> **Note:** `console.log` deliberately not in the expected list — it would only fire under `noConsoleLog` which we leave as warning (or off) in `base`. The implementer may need to adjust the rule list in Step 5 OR the expected list here based on what Biome's recommended set actually catches in the pinned version. After running Step 6 the first time, reconcile by **adjusting the preset to match the design intent**, not by relaxing the expected list to match defaults.

- [ ] **Step 5: Write `presets/base.json`**

`packages/biome-config/presets/base.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "trailingCommas": "all",
      "semicolons": "asNeeded",
      "arrowParentheses": "always"
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noUselessFragments": "error",
        "useArrowFunction": "error",
        "useOptionalChain": "error"
      },
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      },
      "style": {
        "useConst": "error",
        "useTemplate": "error",
        "useImportType": "error",
        "useExportType": "error",
        "noDefaultExport": "off"
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noDoubleEquals": "error",
        "noDebugger": "error",
        "noConsoleLog": "warn"
      }
    }
  }
}
```

- [ ] **Step 6: Run the fixture test**

Run: `cd packages/biome-config && bun run tests/run-fixtures.ts`

Expected: `✓ all fixtures pass (1 preset)`

If failures appear:
- **`good.ts` fails** → either the example code violates a rule we don't want it to (relax the rule in `base.json`) or the example itself is bad code (rewrite it).
- **`bad.ts` reports rules not in expected** → either the preset is over-strict for the design intent (relax) or the expected list is incomplete (add the rule). Decide deliberately; do not blindly add to either side.
- **`bad.ts` misses expected rules** → the preset isn't enabling those rules; add them.

Iterate Steps 5–6 until clean.

- [ ] **Step 7: Run via moon to confirm task wiring**

Run: `moon run biome-config:test`
Expected: same output as Step 6, but invoked through Moon's task graph.

- [ ] **Step 8: Commit**

```bash
git add packages/biome-config/presets/base.json packages/biome-config/tests/fixtures/base/
git commit -m "feat: add base preset with fixture coverage"
```

---

## Task 7: Build the `lib` preset (TDD)

**Files:**
- Create: `packages/biome-config/tests/fixtures/lib/biome.json`
- Create: `packages/biome-config/tests/fixtures/lib/good.ts`
- Create: `packages/biome-config/tests/fixtures/lib/bad.ts`
- Create: `packages/biome-config/tests/fixtures/lib/bad.expected.txt`
- Create: `packages/biome-config/presets/lib.json`

`lib` adds stricter export discipline: no default exports, named exports preferred.

- [ ] **Step 1: Write fixture `biome.json`**

`packages/biome-config/tests/fixtures/lib/biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": ["../../../presets/lib.json"]
}
```

- [ ] **Step 2: Write `good.ts` (named exports only)**

```typescript
export interface PublicApi {
  readonly version: string
}

export const create = (version: string): PublicApi => ({ version })
```

- [ ] **Step 3: Write `bad.ts` (default export should fire)**

```typescript
const value = 42
export default value
```

- [ ] **Step 4: Write `bad.expected.txt`**

```
lint/style/noDefaultExport
```

- [ ] **Step 5: Write `presets/lib.json` (extends base, upgrades noDefaultExport)**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": ["./base.json"],
  "linter": {
    "rules": {
      "style": {
        "noDefaultExport": "error"
      }
    }
  }
}
```

- [ ] **Step 6: Run the fixture test**

Run: `cd packages/biome-config && bun run tests/run-fixtures.ts`
Expected: `✓ all fixtures pass (2 presets)`

- [ ] **Step 7: Commit**

```bash
git add packages/biome-config/presets/lib.json packages/biome-config/tests/fixtures/lib/
git commit -m "feat: add lib preset (extends base, strict exports)"
```

---

## Task 8: Build the `node` preset (TDD)

**Files:**
- Create: `packages/biome-config/tests/fixtures/node/biome.json`
- Create: `packages/biome-config/tests/fixtures/node/good.ts`
- Create: `packages/biome-config/tests/fixtures/node/bad.ts`
- Create: `packages/biome-config/tests/fixtures/node/bad.expected.txt`
- Create: `packages/biome-config/presets/node.json`

`node` adds Node-relevant hygiene. Biome's Node coverage is thin (no eslint-plugin-node port), so `node` mostly tightens base rules around process/fs patterns and disables browser-only assumptions.

- [ ] **Step 1: Write fixture `biome.json`**

`packages/biome-config/tests/fixtures/node/biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": ["../../../presets/node.json"]
}
```

- [ ] **Step 2: Write `good.ts`**

```typescript
import { readFile } from 'node:fs/promises'

export const loadConfig = async (path: string): Promise<string> => {
  return readFile(path, 'utf8')
}
```

- [ ] **Step 3: Write `bad.ts` (uses `console.log` which becomes error in node)**

```typescript
export const log = (msg: string) => {
  console.log(msg)
}
```

- [ ] **Step 4: Write `bad.expected.txt`**

```
lint/suspicious/noConsoleLog
```

- [ ] **Step 5: Write `presets/node.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": ["./base.json"],
  "linter": {
    "rules": {
      "suspicious": {
        "noConsoleLog": "error"
      }
    }
  }
}
```

> **Note:** Server-side code should use a structured logger, not `console.log`. The base preset only warns; `node` upgrades to error.

- [ ] **Step 6: Run the fixture test**

Run: `cd packages/biome-config && bun run tests/run-fixtures.ts`
Expected: `✓ all fixtures pass (3 presets)`

- [ ] **Step 7: Commit**

```bash
git add packages/biome-config/presets/node.json packages/biome-config/tests/fixtures/node/
git commit -m "feat: add node preset (extends base, console.log = error)"
```

---

## Task 9: Build the `react` preset (TDD)

**Files:**
- Create: `packages/biome-config/tests/fixtures/react/biome.json`
- Create: `packages/biome-config/tests/fixtures/react/good.tsx`
- Create: `packages/biome-config/tests/fixtures/react/bad.tsx`
- Create: `packages/biome-config/tests/fixtures/react/bad.expected.txt`
- Create: `packages/biome-config/presets/react.json`

- [ ] **Step 1: Write fixture `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": ["../../../presets/react.json"]
}
```

- [ ] **Step 2: Write `good.tsx`**

```typescript
import type { FC } from 'react'

interface Props {
  readonly name: string
}

export const Greeting: FC<Props> = ({ name }) => {
  return <span>{name}</span>
}
```

- [ ] **Step 3: Write `bad.tsx`**

```typescript
import type { FC } from 'react'

interface Props {
  readonly items: readonly string[]
}

export const List: FC<Props> = ({ items }) => {
  return (
    <ul>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: Write `bad.expected.txt`**

```
lint/suspicious/noArrayIndexKey
```

- [ ] **Step 5: Write `presets/react.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": ["./base.json"],
  "linter": {
    "rules": {
      "a11y": {
        "recommended": true
      },
      "correctness": {
        "useExhaustiveDependencies": "error",
        "useHookAtTopLevel": "error",
        "useJsxKeyInIterable": "error"
      },
      "suspicious": {
        "noArrayIndexKey": "error",
        "noDuplicateJsxProps": "error"
      },
      "style": {
        "useFragmentSyntax": "error"
      }
    }
  }
}
```

- [ ] **Step 6: Run the fixture test**

Run: `cd packages/biome-config && bun run tests/run-fixtures.ts`
Expected: `✓ all fixtures pass (4 presets)`

- [ ] **Step 7: Commit**

```bash
git add packages/biome-config/presets/react.json packages/biome-config/tests/fixtures/react/
git commit -m "feat: add react preset with hooks + JSX hygiene"
```

---

## Task 10: Build the `vue` preset (TDD)

**Files:**
- Create: `packages/biome-config/tests/fixtures/vue/biome.json`
- Create: `packages/biome-config/tests/fixtures/vue/good.vue`
- Create: `packages/biome-config/tests/fixtures/vue/bad.vue`
- Create: `packages/biome-config/tests/fixtures/vue/template-uncovered.vue`
- Create: `packages/biome-config/tests/fixtures/vue/bad.expected.txt`
- Create: `packages/biome-config/presets/vue.json`

> **Reminder:** Biome's Vue support covers `<script>` blocks only. The `template-uncovered.vue` fixture documents that the template gap is intentional, not a regression.

- [ ] **Step 1: Write fixture `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": ["../../../presets/vue.json"]
}
```

- [ ] **Step 2: Write `good.vue` (clean script block)**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)
</script>

<template>
  <button @click="count++">{{ doubled }}</button>
</template>
```

- [ ] **Step 3: Write `bad.vue` (script-block violations only)**

```vue
<script setup lang="ts">
let unused: any = 1
debugger
</script>

<template>
  <div>placeholder</div>
</template>
```

- [ ] **Step 4: Write `template-uncovered.vue` (documented gap)**

```vue
<script setup lang="ts">
import { ref } from 'vue'

const items = ref(['a', 'b', 'c'])
</script>

<template>
  <!--
    Documented gap (see extras/GAPS.md):
    Biome does NOT lint Vue templates. Both of the following are bugs that
    eslint-plugin-vue would have caught but this preset does not:
      1. Missing :key on v-for
      2. Direct mutation of a ref's value in template via .value
    The fixture asserts these go uncaught — if Biome ever adds template
    coverage, this fixture will start firing rules and we'll need to update
    the GAPS.md and possibly the preset.
  -->
  <ul>
    <li v-for="item in items">{{ item }}</li>
  </ul>
</template>
```

> The runner doesn't load `template-uncovered.vue` (filename doesn't start with `good.` or `bad.`), so it's documentation-as-code, not a test assertion.

- [ ] **Step 5: Write `bad.expected.txt`**

```
lint/suspicious/noExplicitAny
lint/style/useConst
lint/suspicious/noDebugger
lint/correctness/noUnusedVariables
```

- [ ] **Step 6: Write `presets/vue.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": ["./base.json"],
  "files": {
    "include": ["**/*.vue", "**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
  },
  "overrides": [
    {
      "include": ["*.vue"],
      "linter": {
        "rules": {
          "style": {
            "useImportType": "off",
            "useConst": "error"
          }
        }
      }
    }
  ]
}
```

> **Note on the override:** `useImportType` can misfire inside `<script setup>` for type-only imports that are also used at runtime by Vue's macros. Relaxed in the Vue context per the additive-composition rule (see GAPS.md entry).

- [ ] **Step 7: Run the fixture test**

Run: `cd packages/biome-config && bun run tests/run-fixtures.ts`
Expected: `✓ all fixtures pass (5 presets)`

- [ ] **Step 8: Commit**

```bash
git add packages/biome-config/presets/vue.json packages/biome-config/tests/fixtures/vue/
git commit -m "feat: add vue preset with script-block coverage"
```

---

## Task 11: Build the `next` preset (TDD)

**Files:**
- Create: `packages/biome-config/tests/fixtures/next/biome.json`
- Create: `packages/biome-config/tests/fixtures/next/good.tsx`
- Create: `packages/biome-config/tests/fixtures/next/bad.tsx`
- Create: `packages/biome-config/tests/fixtures/next/bad.expected.txt`
- Create: `packages/biome-config/presets/next.json`

`next` extends `react` and adds Next-relevant ignores plus file-pattern hints.

- [ ] **Step 1: Write fixture `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": ["../../../presets/next.json"]
}
```

- [ ] **Step 2: Write `good.tsx`**

```typescript
import Link from 'next/link'

export default function Page() {
  return <Link href="/about">About</Link>
}
```

> Default export is allowed for Next pages — the `next` preset must NOT inherit `lib`'s `noDefaultExport: error`.

- [ ] **Step 3: Write `bad.tsx` (inherited react rules still fire)**

```tsx
import type { FC } from 'react'

export const Bad: FC<{ items: string[] }> = ({ items }) => (
  <ul>
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
)
```

- [ ] **Step 4: Write `bad.expected.txt`**

```
lint/suspicious/noArrayIndexKey
```

- [ ] **Step 5: Write `presets/next.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": ["./react.json"],
  "files": {
    "ignore": [
      ".next/**",
      "out/**",
      "next-env.d.ts"
    ]
  },
  "overrides": [
    {
      "include": ["app/**/page.tsx", "app/**/layout.tsx", "pages/**/*.tsx", "pages/**/*.ts"],
      "linter": {
        "rules": {
          "style": {
            "noDefaultExport": "off"
          }
        }
      }
    }
  ]
}
```

- [ ] **Step 6: Run the fixture test**

Run: `cd packages/biome-config && bun run tests/run-fixtures.ts`
Expected: `✓ all fixtures pass (6 presets)`

- [ ] **Step 7: Commit**

```bash
git add packages/biome-config/presets/next.json packages/biome-config/tests/fixtures/next/
git commit -m "feat: add next preset (extends react, ignores .next/)"
```

---

## Task 12: Build the `nuxt` preset (TDD)

**Files:**
- Create: `packages/biome-config/tests/fixtures/nuxt/biome.json`
- Create: `packages/biome-config/tests/fixtures/nuxt/good.vue`
- Create: `packages/biome-config/tests/fixtures/nuxt/bad.vue`
- Create: `packages/biome-config/tests/fixtures/nuxt/bad.expected.txt`
- Create: `packages/biome-config/presets/nuxt.json`

- [ ] **Step 1: Write fixture `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": ["../../../presets/nuxt.json"]
}
```

- [ ] **Step 2: Write `good.vue`**

```vue
<script setup lang="ts">
const route = useRoute()
const title = computed(() => `Page: ${route.path}`)
</script>

<template>
  <h1>{{ title }}</h1>
</template>
```

> **Note:** `useRoute` and `computed` are Nuxt auto-imports. Biome doesn't know about Nuxt's auto-import system, so it treats them as undeclared. This is a documented gap — see GAPS.md. The preset disables `noUndeclaredVariables` for `.vue` files to compensate (the cost is also missing real undeclared-variable bugs in templates/scripts).

- [ ] **Step 3: Write `bad.vue`**

```vue
<script setup lang="ts">
const unused: any = 'foo'
debugger
</script>

<template>
  <div>placeholder</div>
</template>
```

- [ ] **Step 4: Write `bad.expected.txt`**

```
lint/suspicious/noExplicitAny
lint/suspicious/noDebugger
lint/correctness/noUnusedVariables
lint/style/useConst
```

- [ ] **Step 5: Write `presets/nuxt.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": ["./vue.json"],
  "files": {
    "ignore": [
      ".nuxt/**",
      ".output/**",
      ".data/**",
      "dist/**"
    ]
  },
  "overrides": [
    {
      "include": ["**/*.vue", "composables/**/*.ts", "server/**/*.ts", "pages/**/*.vue", "layouts/**/*.vue"],
      "linter": {
        "rules": {
          "correctness": {
            "noUndeclaredVariables": "off"
          }
        }
      }
    }
  ]
}
```

- [ ] **Step 6: Run the fixture test**

Run: `cd packages/biome-config && bun run tests/run-fixtures.ts`
Expected: `✓ all fixtures pass (7 presets)`

- [ ] **Step 7: Commit**

```bash
git add packages/biome-config/presets/nuxt.json packages/biome-config/tests/fixtures/nuxt/
git commit -m "feat: add nuxt preset (extends vue, handles auto-imports)"
```

---

## Task 13: Write the gap-filling extras

**Files:**
- Create: `packages/biome-config/extras/GAPS.md`
- Create: `packages/biome-config/extras/vue-tsconfig.json`
- Create: `packages/biome-config/extras/package-scripts.md`

- [ ] **Step 1: Write `extras/GAPS.md`**

```markdown
# Coverage Gaps

This package uses Biome alone (no oxlint, no eslint-plugin-vue, no @nuxt/eslint).
The following coverage is **lost** vs the legacy ESLint-based stack, with
documented mitigations.

## Vue templates — not linted

**Lost:** All template-level rules from eslint-plugin-vue, including:
- `vue/require-v-for-key`
- `vue/no-unused-template-refs`
- `vue/no-mutating-props`
- `vue/valid-v-for`
- `vue/no-v-html`
- ... and ~80 more template-context rules

**Mitigation:** Run `vue-tsc --noEmit` as part of CI. Templates are
type-checked, which catches a meaningful subset (missing refs, type
mismatches in v-bind, slot prop typing). See `vue-tsconfig.json` for a
recommended tsconfig and `package-scripts.md` for the script.

## Nuxt auto-imports — disabled `noUndeclaredVariables`

**Lost:** Real undeclared-variable bugs inside `.vue` files and
Nuxt-convention directories (`composables/`, `server/`, `pages/`,
`layouts/`) because the preset disables `noUndeclaredVariables` to
accommodate Nuxt's auto-import magic.

**Mitigation:** Rely on `vue-tsc --noEmit` and `tsc --noEmit` to catch
truly undefined identifiers via the type system rather than the linter.

## `@nuxt/eslint` project-aware rules — not ported

**Lost:**
- Auto-import declaration validation
- Route-definition shape checks (e.g., `definePageMeta` schema)
- Server-route convention enforcement
- `<NuxtLink>` vs `<a>` linting

**Mitigation:** None automated. Conventions enforced via PR review and
the project's own type definitions. Revisit if Biome ever adds Nuxt
plugin support.

## Vue `<script setup>` import-type rules — relaxed

**Lost (intentionally):** `useImportType` is `off` for `.vue` files
because Vue's `<script setup>` macros sometimes require runtime imports
of types.

**Mitigation:** None — accept the relaxation as a known cost.
```

- [ ] **Step 2: Write `extras/vue-tsconfig.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitOverride": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "jsx": "preserve",
    "types": ["vite/client"]
  },
  "include": ["**/*.ts", "**/*.tsx", "**/*.vue"],
  "exclude": ["node_modules", "dist", ".nuxt", ".output"]
}
```

- [ ] **Step 3: Write `extras/package-scripts.md`**

```markdown
# Recommended `package.json` scripts

Copy into your project's `package.json#scripts` after installing
`@fellwork/biome-config` and the relevant tools.

## Universal

```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "typecheck": "tsc --noEmit"
  }
}
```

## Vue / Nuxt projects (adds template type-checking)

```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "typecheck": "vue-tsc --noEmit"
  }
}
```

Required dev deps for Vue/Nuxt: `vue-tsc`, `typescript`.

## CI composite

```json
{
  "scripts": {
    "ci": "bun run lint && bun run typecheck"
  }
}
```
```

- [ ] **Step 4: Update `packages/biome-config/README.md` to link extras**

Append to README:

```markdown

## Documented Gaps

This package uses Biome alone — no oxlint, no eslint-plugin-vue, no @nuxt/eslint.
See [extras/GAPS.md](./extras/GAPS.md) for what's lost vs the legacy stack and
how to mitigate.

## Recommended Scripts

See [extras/package-scripts.md](./extras/package-scripts.md) for `package.json`
script snippets, including Vue/Nuxt template type-checking via `vue-tsc`.
```

- [ ] **Step 5: Commit**

```bash
git add packages/biome-config/extras/ packages/biome-config/README.md
git commit -m "docs: add gap-filling extras (GAPS.md, vue-tsconfig, scripts)"
```

---

## Task 14: Write the release script

**Files:**
- Create: `packages/biome-config/scripts/release.ts`
- Modify: `packages/biome-config/package.json` (add `bumpp` to devDependencies)

- [ ] **Step 1: Add `bumpp` as a devDependency**

Run from `packages/biome-config/`:

```bash
bun add -D bumpp
```

- [ ] **Step 2: Write `packages/biome-config/scripts/release.ts`**

```typescript
import { spawnSync } from 'node:child_process'

const bumpLevel = process.env.SEMVER_LEVEL
const isCanary = bumpLevel === 'canary'

if (!bumpLevel) {
  console.error('SEMVER_LEVEL env var is required (patch | minor | major | canary)')
  process.exit(1)
}

if (!['patch', 'minor', 'major', 'canary'].includes(bumpLevel)) {
  console.error(`unknown SEMVER_LEVEL: ${bumpLevel}`)
  process.exit(1)
}

function run(cmd: string, args: string[]) {
  console.log(`$ ${cmd} ${args.join(' ')}`)
  const result = spawnSync(cmd, args, { stdio: 'inherit' })
  if (result.status !== 0) {
    console.error(`command failed: ${cmd} ${args.join(' ')}`)
    process.exit(result.status ?? 1)
  }
}

if (isCanary) {
  run('bunx', ['bumpp', '--preid', 'canary', 'prerelease', '--commit', '--tag', '--push'])
  run('bun', ['publish', '--tag', 'canary'])
} else {
  run('bunx', ['bumpp', bumpLevel, '--commit', '--tag', '--push'])
  run('bun', ['publish'])
}
```

- [ ] **Step 3: Verify the script's argument parsing locally (dry-run)**

Run: `cd packages/biome-config && SEMVER_LEVEL=invalid bun run scripts/release.ts`
Expected: `unknown SEMVER_LEVEL: invalid` exit 1.

Run: `cd packages/biome-config && bun run scripts/release.ts`
Expected: `SEMVER_LEVEL env var is required` exit 1.

> Do NOT run with a valid level — that would actually publish.

- [ ] **Step 4: Commit**

```bash
git add packages/biome-config/scripts/release.ts packages/biome-config/package.json bun.lockb
git commit -m "feat: add release script (bumpp + bun publish)"
```

---

## Task 15: Write the CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install proto
        uses: moonrepo/setup-toolchain@v0
        with:
          auto-install: true

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run CI tasks
        run: moon run :ci
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add PR verification workflow"
```

- [ ] **Step 3: Push and verify on a throwaway branch**

```bash
git checkout -b ci-smoke-test
git push -u origin ci-smoke-test
gh pr create --title "ci: smoke test" --body "Verifies the CI workflow runs end-to-end. Do not merge."
```

Wait for the workflow to complete:

Run: `gh pr checks --watch`
Expected: `verify` job passes.

If it fails, debug from the workflow logs. Common issues:
- `setup-toolchain` not finding `.prototools` — confirm the file is at repo root.
- `bun install --frozen-lockfile` failing — confirm `bun.lockb` is committed.
- `moon run :ci` failing — reproduce locally with `moon run :ci`, fix, push again.

Once it passes, close the PR (do not merge):

```bash
gh pr close ci-smoke-test --delete-branch
git checkout main
```

---

## Task 16: Write the release workflow

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Write `.github/workflows/release.yml`**

```yaml
name: Release

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
    runs-on: ubuntu-latest
    steps:
      - name: Determine bump level from PR labels
        id: bump
        env:
          LABELS: ${{ toJson(github.event.pull_request.labels.*.name) }}
        run: |
          level=""
          for label in $(echo "$LABELS" | jq -r '.[]'); do
            case "$label" in
              semver:patch)  level="patch" ;;
              semver:minor)  level="minor" ;;
              semver:major)  level="major" ;;
              semver:canary) level="canary" ;;
            esac
          done
          if [ -z "$level" ]; then
            echo "no semver:* label on merged PR; skipping release"
            echo "skip=true" >> "$GITHUB_OUTPUT"
          else
            echo "level=$level" >> "$GITHUB_OUTPUT"
            echo "skip=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Checkout
        if: steps.bump.outputs.skip == 'false'
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Configure git author
        if: steps.bump.outputs.skip == 'false'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Install proto + tools
        if: steps.bump.outputs.skip == 'false'
        uses: moonrepo/setup-toolchain@v0
        with:
          auto-install: true

      - name: Install dependencies
        if: steps.bump.outputs.skip == 'false'
        run: bun install --frozen-lockfile

      - name: Release
        if: steps.bump.outputs.skip == 'false'
        env:
          SEMVER_LEVEL: ${{ steps.bump.outputs.level }}
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: moon run biome-config:release

      - name: Create GitHub Release
        if: steps.bump.outputs.skip == 'false' && steps.bump.outputs.level != 'canary'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          tag=$(git describe --tags --abbrev=0)
          gh release create "$tag" --generate-notes
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add label-driven release workflow"
```

- [ ] **Step 3: Set up the four required PR labels in the GitHub repo**

Run:

```bash
gh label create "semver:patch"  --description "Triggers a patch release on merge"  --color "0E8A16"
gh label create "semver:minor"  --description "Triggers a minor release on merge"  --color "FBCA04"
gh label create "semver:major"  --description "Triggers a major release on merge"  --color "D93F0B"
gh label create "semver:canary" --description "Triggers a canary release on merge" --color "5319E7"
```

If any label already exists, the command errors — that's fine, ignore and continue.

---

## Task 17: Write the root README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the root README**

```markdown
# fellwork-lint

Shared lint and format configuration for Fellwork projects.

## Packages

- [`@fellwork/biome-config`](./packages/biome-config) — Biome shared configurations (presets: `base`, `lib`, `node`, `react`, `vue`, `next`, `nuxt`).

## Toolchain

- **bun** — runtime, package manager, publisher
- **moon** — task orchestrator
- **proto** — pinned tool versions (see `.prototools`)
- **biome** — linter + formatter under test
- **bumpp** — semver bumping
- **GitHub Packages** — private registry under the `@fellwork` scope

## Local development

Install proto (https://moonrepo.dev/proto), then:

```bash
proto use            # installs pinned tool versions
bun install
moon run :ci         # runs lint + fixture tests across all packages
```

## Releasing

Releases are CI-driven. To cut a release, add **one** of these labels to your PR:

- `semver:patch` — bug fix to existing rule's pattern
- `semver:minor` — adding a rule, new preset, or non-breaking change
- `semver:major` — removing a rule, breaking preset reshape, or peer-dep bump
- `semver:canary` — pre-release, publishes with `--tag canary`

Merging a labeled PR triggers `.github/workflows/release.yml` which bumps the
version, publishes to GitHub Packages, and creates a GitHub Release with
auto-generated release notes from the commit log.

PRs without a `semver:*` label merge silently with no release. Use this for
docs-only or test-only changes.

## Recommended branch protection on `main`

In GitHub repo settings, configure:
- Require `verify` (the CI workflow's job) to pass before merging
- Require 1 review
- Require all conversations resolved
- Disallow direct pushes — all changes via PR

## License

MIT — see [LICENSE](./LICENSE).
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add root README"
```

---

## Task 18: End-to-end smoke test (local consumer)

Verify the package shape is correct by consuming the preset from a throwaway local project.

- [ ] **Step 1: Pack the package**

Run: `cd packages/biome-config && bun pm pack`
Expected: produces `fellwork-biome-config-0.0.0.tgz` in the package directory.

- [ ] **Step 2: Create a throwaway consumer**

Run:

```bash
mkdir -p /tmp/biome-consumer-smoke
cd /tmp/biome-consumer-smoke
bun init -y
bun add -D /c/git/fellwork/lint/packages/biome-config/fellwork-biome-config-0.0.0.tgz @biomejs/biome
```

- [ ] **Step 3: Configure the consumer's `biome.json`**

Create `/tmp/biome-consumer-smoke/biome.json`:

```json
{ "extends": ["@fellwork/biome-config/node"] }
```

- [ ] **Step 4: Add a deliberately bad file**

Create `/tmp/biome-consumer-smoke/index.ts`:

```typescript
let unused: any = 1
console.log(unused)
```

- [ ] **Step 5: Run biome and verify the consumer experience**

Run: `bunx biome check index.ts`
Expected: errors reporting `noExplicitAny`, `useConst`, `noConsoleLog`.

- [ ] **Step 6: Clean up**

```bash
cd c:/git/fellwork/lint
rm packages/biome-config/fellwork-biome-config-0.0.0.tgz
rm -rf /tmp/biome-consumer-smoke
```

- [ ] **Step 7: No commit needed for this task** — it's a smoke test that produces no artifacts. If anything failed, fix the package and re-run before proceeding.

---

## Task 19: First real release (v0.1.0)

The package was scaffolded with `version: "0.0.0"` in Task 4. Letting `bumpp minor` apply on the first release produces the desired `0.1.0` cleanly — no manual version juggling needed.

- [ ] **Step 1: Create a trivial release-trigger PR**

```bash
git checkout -b release/v0.1.0
```

Add a one-line note to the package README to give the PR a non-empty diff:

Edit `packages/biome-config/README.md` and append:

```markdown

## Status

v0.1.0 — initial release.
```

Then:

```bash
git add packages/biome-config/README.md
git commit -m "docs: mark v0.1.0 as initial release"
git push -u origin release/v0.1.0
gh pr create --title "release: v0.1.0" --body "First release. Label semver:minor takes the package from 0.0.0 to 0.1.0." --label "semver:minor"
```

- [ ] **Step 2: Wait for CI to pass**

Run: `gh pr checks --watch`
Expected: `verify` job passes.

- [ ] **Step 3: Merge the PR**

```bash
gh pr merge --squash --delete-branch
```

- [ ] **Step 4: Watch the release workflow**

Run: `gh run watch`
Expected: the `release` workflow runs, bumps the version, publishes to GitHub Packages, creates a GitHub Release.

- [ ] **Step 5: Verify on GitHub Packages**

Visit `https://github.com/fellwork/lint/packages` and confirm `@fellwork/biome-config` appears at the published version.

- [ ] **Step 6: Smoke-test the published package from a real consumer**

Pick the smallest Fellwork project (likely [foreman/](../../../../foreman/) or [scribe/](../../../../scribe/)). In a scratch branch on that project:

```bash
bun add -D @fellwork/biome-config @biomejs/biome
```

Create `biome.json`:

```json
{ "extends": ["@fellwork/biome-config/node"] }
```

Run: `bunx biome check .`

If results look reasonable, the package is functional. Don't merge that scratch branch — full per-project migration is out of scope for this plan (see "Out of Scope" below).

---

## Done Criteria

The following must all be true to consider this plan complete:

- [ ] `moon run :ci` passes locally with no failures.
- [ ] `.github/workflows/ci.yml` passes on a real PR.
- [ ] `.github/workflows/release.yml` has successfully published at least one version to GitHub Packages.
- [ ] All seven presets (`base`, `lib`, `node`, `react`, `vue`, `next`, `nuxt`) have fixtures with at least one `good.*` and one `bad.*` file.
- [ ] `packages/biome-config/extras/GAPS.md` exists and accurately describes coverage gaps.
- [ ] At least one Fellwork project has been smoke-tested against the published package (Task 19, Step 6).
- [ ] Branch protection on `main` is configured per the README's recommendations.

## Out of Scope (Deferred)

Per the spec's "Migration Path" and "Open Questions Deferred to Implementation":

- Migrating each Fellwork project off the legacy `@fellwork/eslint-config-*` and `@fellwork/prettier-config` packages.
- Cutting v1.0 (waits for ~30 days of preset stability post-first-consumer).
- Archiving the legacy [eslint/](../../../../eslint/) and [prettier-config/](../../../../prettier-config/) repos.
- A `format-only` preset (Biome formatter on, lint rules off) — defer until requested.
- Custom plugins for Vue templates or Nuxt conventions — explicitly out of scope per spec.
