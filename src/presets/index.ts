import { nextIntlPreset } from './next-intl.js'
import { reactI18nextPreset } from './react-i18next.js'
import { reactIntlPreset } from './react-intl.js'
import { svelteI18nPreset } from './svelte-i18n.js'
import { vueI18nPreset } from './vue-i18n.js'
import type { Preset } from './types.js'

const presets: Map<string, Preset> = new Map([
    [nextIntlPreset.name, nextIntlPreset],
    [reactI18nextPreset.name, reactI18nextPreset],
    [reactIntlPreset.name, reactIntlPreset],
    [vueI18nPreset.name, vueI18nPreset],
    [svelteI18nPreset.name, svelteI18nPreset],
])

export function getPreset(name: string): Preset {
    const preset = presets.get(name)

    if (!preset) {
        const available = [...presets.keys()].join(', ')

        throw new Error(`Unknown preset "${name}". Available: ${available}`)
    }

    return preset
}

export { nextIntlPreset } from './next-intl.js'
export { reactI18nextPreset } from './react-i18next.js'
export { reactIntlPreset } from './react-intl.js'
export { svelteI18nPreset } from './svelte-i18n.js'
export { vueI18nPreset } from './vue-i18n.js'
export type { NamespaceHook, Preset } from './types.js'
