# Lynguist CLI

CLI tool for extracting, managing, and optionally syncing translation keys with [Lynguist.com](https://lynguist.com).

Scans your source code for translation function calls using AST parsing, merges new keys into your JSON translation files, and syncs with the Lynguist API.

## Installation

```bash
npm install @vixen-tech/lynguist-cli --save-dev
```
```bash
pnpm add -D @vixen-tech/lynguist-cli
```
```bash
yarn add -D @vixen-tech/lynguist-cli
```

## Configuration

Create a `lynguist.config.js` (or `.json`) in your project root:

```js
export default {
    sourceDir: './src',
    translationsDir: './lang',
    locales: ['en', 'fr'],
    preset: 'next-intl',
    lynguist: {
        apiKey: process.env.LYNGUIST_API_TOKEN,
    },
}
```

The API token can also be set via the `LYNGUIST_API_TOKEN` environment variable in a `.env` or `.env.local` file.

### Options

| Option            | Description                                          | Default            |
|-------------------|------------------------------------------------------|--------------------|
| `sourceDir`       | Directory to scan for translation keys               | — (required)       |
| `translationsDir` | Directory for translation JSON files                 | `lang`             |
| `locales`         | Array of locale codes                                | — (required)       |
| `preset`          | Framework preset to use                              | — (required)       |
| `extensions`      | File extensions to scan (overrides preset)           | —                  |
| `excludedDirs`    | Directories to skip during scan                      | `['node_modules']` |
| `functions`       | Custom translation function names (overrides preset) | —                  |
| `lynguist.apiKey` | API token for Lynguist.com                           | —                  |

## Presets

| Preset          | Framework            | Translation functions                                           | Namespace source                                  |
|-----------------|----------------------|-----------------------------------------------------------------|---------------------------------------------------|
| `next-intl`     | Next.js              | `t()`, `useTranslations()`, `getTranslations()`                 | `useTranslations('Ns')` / `getTranslations('Ns')` |
| `react-i18next` | React / React Native | `t()`, `useTranslation()`                                       | `useTranslation('ns')`                            |
| `react-intl`    | React                | `formatMessage()`, `intl.formatMessage()`, `<FormattedMessage>` | id prefix                                         |
| `vue-i18n`      | Vue / Nuxt           | `$t()`, `t()`                                                   | `useI18n()` scope                                 |
| `svelte-i18n`   | Svelte / SvelteKit   | `$_()`, `$t()`, `$format()`                                     | flat keys                                         |

## Commands

### `npx lynguist scan`

Extract translation keys from source files.

```bash
npx lynguist scan                  # print found keys
npx lynguist scan --write          # write keys to translation files
npx lynguist scan --write --prune  # also remove unused keys
```

### `npx lynguist merge`

Scan and write keys to translation files (shortcut for `scan --write`).

```bash
npx lynguist merge
npx lynguist merge --prune
```

### `npx lynguist upload`

Upload local translation files to Lynguist.com.

```bash
npx lynguist upload
```

### `npx lynguist download`

Download translations from Lynguist.com and write them to disk, overwriting local files.

```bash
npx lynguist download
```

### `npx lynguist sync`

Scan, merge, and upload in one step.

```bash
npx lynguist sync
npx lynguist sync --prune
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LYNGUIST_API_TOKEN` | API token (fallback if not in config) | — |
| `LYNGUIST_TIMEOUT` | Request timeout in ms | `120000` |

## Programmatic Usage

```ts
import { scan, merge, upload, download, getPreset } from '@vixen-tech/lynguist-cli'
```

## License

MIT
