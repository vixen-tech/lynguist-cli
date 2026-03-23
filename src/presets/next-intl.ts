import type { Preset } from './types.js'

export const nextIntlPreset: Preset = {
    name: 'next-intl',
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    namespaceHooks: [
        { functionName: 'useTranslations', namespaceArgIndex: 0 },
        { functionName: 'getTranslations', namespaceArgIndex: 0 },
    ],
    memberMethods: ['rich', 'markup', 'raw'],
}
