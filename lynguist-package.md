## Package Architecture

**Core pipeline:** Scan → Extract → Merge → Upload

### 1. Scanner / Extractor

Use AST parsing (not regex) for reliable extraction. The parser used depends on the framework preset:

- **JS/TS/JSX/TSX** (React, Next.js): `@babel/parser` + `@babel/traverse`
- **Vue/Nuxt** (`.vue` SFCs): `@vue/compiler-sfc` to extract `<script>` block, then Babel for the JS/TS within
- **Svelte/SvelteKit** (`.svelte`): `svelte/compiler` to extract script, then Babel

For each file:

- Parse into an AST
- Find calls to translation functions (defined by the active preset)
- Collect structured results: `{ key, namespace, file, line }`

### 2. Preset System

Each preset defines:

1. **File extensions** to scan (`.tsx`, `.vue`, `.svelte`, etc.)
2. **Parser** to use for extracting the script AST
3. **Function patterns** to match (`t`, `$t`, `__`, etc.)
4. **Namespace resolution** logic (how namespaces are determined varies per library)

Built-in presets:

| Preset          | Framework          | Functions                                                       | Namespace source                                  |
| --------------- | ------------------ | --------------------------------------------------------------- | ------------------------------------------------- |
| `next-intl`     | Next.js            | `t()`, `useTranslations()`, `getTranslations()`                 | `useTranslations('Ns')` / `getTranslations('Ns')` |
| `react-i18next` | React              | `t()`, `useTranslation()`                                       | `useTranslation('ns')`                            |
| `react-intl`    | React              | `formatMessage()`, `intl.formatMessage()`, `<FormattedMessage>` | `defaultMessage` / id prefix                      |
| `vue-i18n`      | Vue / Nuxt         | `$t()`, `t()` (from `useI18n()`)                                | `useI18n({ messages })` scope                     |
| `svelte-i18n`   | Svelte / SvelteKit | `$_()`, `$t()`                                                  | flat keys                                         |

Users can also override function patterns in config for custom setups.

Start with `next-intl`, then add more presets incrementally.

### 3. Merger

- Load existing JSON translation files
- Add new keys (with empty string or a placeholder value)
- Optionally remove keys that are no longer found in source ("prune" mode)
- Preserve existing translations — never overwrite a filled-in value

The merger is framework-agnostic — it only works with JSON files.

### 4. Uploader

- HTTP client (plain `fetch` is fine, no need for axios in a CLI tool) to push to the Lynguist.com API
- Auth via API key from config or env var

The uploader is framework-agnostic.

### 5. CLI

Use `commander` or `cac` for the CLI. Commands like:

```
npx lynguist scan          # extract + merge into local JSON
npx lynguist upload        # push to Lynguist.com
npx lynguist sync          # scan + upload in one step
```

### 6. Config

A `lynguist.config.ts` (or `.js`/`.json`) in project root:

```ts
export default {
    sourceDir: './app',
    translationsDir: './messages',
    locales: ['en', 'fr'],
    defaultLocale: 'en',
    preset: 'next-intl', // or 'vue-i18n', 'react-i18next', etc.
    // functions: ['t', '$t'],     // custom override
    lynguist: {
        projectId: '...',
        apiKey: process.env.LYNGUIST_API_KEY,
    },
}
```

## Tech Stack for the Package

- **TypeScript** — publish both ESM and CJS
- **@babel/parser** + **@babel/traverse** — AST parsing for JS/TS/JSX/TSX
- **@vue/compiler-sfc** — Vue SFC parsing (optional peer dep)
- **svelte/compiler** — Svelte parsing (optional peer dep)
- **cac** or **commander** — CLI
- **glob/fast-glob** — file discovery
- **vitest** — testing

Vue and Svelte parsers should be optional peer dependencies so users only install what they need.

## Recommended Steps

1. **Scaffold the package** — `tsup` for building, `vitest` for tests
2. **Build the extractor first** — this is the hard/interesting part. Write tests against sample component files with various `t()` call patterns
3. **Build the preset system** — start with `next-intl`, structure it so adding presets is easy
4. **Build the merger** — straightforward JSON read/merge/write
5. **Build the CLI** — wire scanner + merger together
6. **Add Lynguist upload** — HTTP calls to their API
7. **Add more presets** — `react-i18next`, `vue-i18n`, `svelte-i18n`, etc.
8. **Publish** — `npx lynguist` should just work

## Key Design Decisions

- **AST vs Regex**: AST is more work upfront but handles edge cases (template literals, nested calls, multiline). Worth it.
- **Namespace handling**: varies per preset. `next-intl` namespaces come from `useTranslations('Namespace')`, `react-i18next` from `useTranslation('ns')`, `vue-i18n` from `useI18n()` scope, etc.
- **Nested keys**: `t('foo.bar.baz')` — support both flat and nested JSON via config, defaulting to match whatever the user already has.
- **Single package vs monorepo**: start as a single package with all presets built in. Split into `@lynguist/core` + `@lynguist/preset-*` later if bundle size becomes a concern.
- **Framework-specific parsers as optional peer deps**: keeps the install lightweight — users only pull in the parser they need.
