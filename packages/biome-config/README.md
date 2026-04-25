# @fellwork/biome-config

Shared Biome configurations for Fellwork projects.

> **Status:** v0.1.1 — published to the npm public registry.

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

## Documented Gaps

This package uses Biome alone — no oxlint, no eslint-plugin-vue, no @nuxt/eslint.
See [extras/GAPS.md](./extras/GAPS.md) for what's lost vs the legacy stack and
how to mitigate.

## Recommended Scripts

See [extras/package-scripts.md](./extras/package-scripts.md) for `package.json`
script snippets, including Vue/Nuxt template type-checking via `vue-tsc`.
