import type { Preset } from './types.js'

function extractScript(code: string, filename: string): string {
    if (!filename.endsWith('.vue')) return code

    const blocks: string[] = []
    let match: RegExpExecArray | null

    // Extract <script> blocks
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi
    while ((match = scriptRegex.exec(code)) !== null) {
        blocks.push(match[1])
    }

    // Extract expressions from <template> blocks as synthetic JS
    const templateRegex = /<template\b[^>]*>([\s\S]*?)<\/template>/gi
    while ((match = templateRegex.exec(code)) !== null) {
        const template = match[1]

        // {{ expr }} mustache expressions
        const mustacheRegex = /\{\{\s*([\s\S]*?)\s*\}\}/g
        let expr: RegExpExecArray | null
        while ((expr = mustacheRegex.exec(template)) !== null) {
            blocks.push(expr[1] + ';')
        }

        // :attr="expr" and v-bind:attr="expr" bound attributes
        const bindRegex = /(?:v-bind)?:[\w.-]+="([^"]*)"/g
        while ((expr = bindRegex.exec(template)) !== null) {
            blocks.push(expr[1] + ';')
        }
    }

    return blocks.join('\n')
}

export const vueI18nPreset: Preset = {
    name: 'vue-i18n',
    extensions: ['.vue', '.ts', '.js'],
    namespaceHooks: [{ functionName: 'useI18n', namespaceArgIndex: 0 }],
    globalFunctions: ['$t'],
    extractScript,
}
