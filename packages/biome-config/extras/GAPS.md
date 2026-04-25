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

## Vue `<script setup>` template bindings — false `noUnusedVariables` positives

**The issue:** Refs and computed values declared in `<script setup>` and used
**only** in `<template>` are flagged by Biome as unused. Biome doesn't parse
templates, so it has no way to know the binding is used.

**Workarounds (in order of preference):**

1. **`defineExpose({ binding })`** — exposes the binding from the component
   instance. Often unnecessary for child components but harmless and the
   cleanest way to silence the warning. This is what the package's own Vue
   and Nuxt fixtures use.

2. **Use the binding in script too** — e.g., a `watch()` or `watchEffect()`
   that observes the value. Idiomatic when there's a real reason to watch.

3. **Per-file `// biome-ignore lint/correctness/noUnusedVariables`** — local
   suppression. Use for individual cases, not as a default.

4. **Project-wide override** — add to your project's `biome.json`:
   ```json
   {
     "extends": ["@fellwork/biome-config/vue"],
     "overrides": [{
       "includes": ["**/*.vue"],
       "linter": { "rules": { "correctness": { "noUnusedVariables": "warn" } } }
     }]
   }
   ```
   Downgrades to warning for `.vue` files. Loses signal on real unused vars in script.

## Nuxt auto-imports — `noUndeclaredVariables` disabled

**The issue:** Nuxt auto-imports `useRoute`, `useFetch`, `definePageMeta`,
`computed`, `ref`, etc. into `.vue` files and Nuxt-convention dirs
(`composables/`, `server/`, `pages/`, `layouts/`). Biome doesn't know about
the auto-import system and would flag these as undeclared.

**Mitigation:** The `nuxt` preset disables `noUndeclaredVariables` for those
paths.

**Cost:** Real undeclared-variable bugs in `.vue` files and Nuxt-convention
dirs won't be caught. Rely on `vue-tsc --noEmit` and `tsc --noEmit` to catch
truly undefined identifiers via the type system rather than the linter.

## `@nuxt/eslint` project-aware rules — not ported

**Lost:**
- Auto-import declaration validation
- Route-definition shape checks (e.g., `definePageMeta` schema validation)
- Server-route convention enforcement
- `<NuxtLink>` vs `<a>` linting

**Mitigation:** None automated. Conventions enforced via PR review and the
project's own type definitions. Revisit if Biome ever adds Nuxt plugin support.

## Vue `<script setup>` import-type rules — relaxed

**Lost (intentionally):** `useImportType` is `off` for `.vue` files in the `vue`
preset because Vue's `<script setup>` macros (`defineProps<T>()`, etc.)
sometimes require runtime imports of types.

**Mitigation:** None — accept the relaxation as a known cost. If you have
non-macro code in `.vue` files where you'd like type-only imports enforced,
add a project-local override.
