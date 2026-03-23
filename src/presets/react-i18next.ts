import type { Preset } from './types.js'

export const reactI18nextPreset: Preset = {
    name: 'react-i18next',
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    namespaceHooks: [{ functionName: 'useTranslation', namespaceArgIndex: 0 }],
}
