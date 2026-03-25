# Changelog

## 1.0.1 [2026-03-25]

### Added

- `fileStrategy` config option to override the preset's default file layout strategy. Set `fileStrategy: 'single-file'` to produce `{locale}.json` files or `fileStrategy: 'namespace-files'` for `{locale}/{namespace}.json`, regardless of what the preset defines. This is useful for presets like `react-i18next` that default to `namespace-files` when you prefer a single file per locale.

## 1.0.0 [2026-03-24]

First release.
