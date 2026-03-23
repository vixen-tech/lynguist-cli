import type { Preset } from './types.js'

function extractScript(code: string, filename: string): string {
    if (!filename.endsWith('.svelte')) return code

    const blocks: string[] = []
    let match: RegExpExecArray | null

    // Extract <script> blocks
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi
    while ((match = scriptRegex.exec(code)) !== null) {
        blocks.push(match[1])
    }

    // Extract expressions from template area (outside <script> and <style>)
    const template = code
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')

    // Match {expr} expressions, excluding Svelte control flow ({#if}, {:else}, {/if}, {@html})
    const exprRegex = /\{([^{}#/:@][^{}]*)\}/g
    while ((match = exprRegex.exec(template)) !== null) {
        blocks.push(match[1].trim() + ';')
    }

    return blocks.join('\n')
}

export const svelteI18nPreset: Preset = {
    name: 'svelte-i18n',
    extensions: ['.svelte', '.ts', '.js'],
    fileStrategy: 'single-file',
    globalFunctions: ['$_', '$t', '$format'],
    extractScript,
}
