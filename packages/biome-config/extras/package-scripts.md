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
