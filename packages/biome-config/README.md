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
