import type { ExtractionResult } from '@/scanner/types.js'

export interface NamespaceHook {
    functionName: string
    namespaceArgIndex: number
}

export interface Preset {
    name: string
    extensions: string[]

    /** How translation files are laid out on disk */
    fileStrategy: 'single-file' | 'namespace-files'

    /** If provided, the preset handles its own extraction logic */
    extract?: (code: string, filename: string) => ExtractionResult[]

    /** Hooks that create a scoped translator: useTranslations('Ns') → t */
    namespaceHooks?: NamespaceHook[]

    /** Direct global translation functions: $_('key'), $t('key') */
    globalFunctions?: string[]

    /** Member methods on translator: t.rich(), t.raw() */
    memberMethods?: string[]

    /** Custom script extraction for SFC files (Vue, Svelte) */
    extractScript?: (code: string, filename: string) => string
}
