import { vueI18nPreset } from '@/presets/vue-i18n.js'
import { extractFromCode } from '@/scanner/extract.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const fixturesDir = path.resolve(__dirname, '../fixtures/vue-i18n')

async function readFixture(name: string): Promise<string> {
    return fs.readFile(path.join(fixturesDir, name), 'utf-8')
}

describe('extractFromCode — vue-i18n preset', () => {
    it('extracts from <script setup> with useI18n', async () => {
        const code = await readFixture('CompositionApi.vue')
        const results = extractFromCode(code, 'CompositionApi.vue', vueI18nPreset)

        expect(results).toHaveLength(2)
        expect(results).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ key: 'page.title', namespace: undefined }),
                expect.objectContaining({ key: 'page.description', namespace: undefined }),
            ]),
        )
    })

    it('extracts from <script> with setup() function', async () => {
        const code = await readFixture('ScriptBlock.vue')
        const results = extractFromCode(code, 'ScriptBlock.vue', vueI18nPreset)

        expect(results).toHaveLength(2)
        expect(results.map(r => r.key)).toEqual(['setup.title', 'setup.subtitle'])
    })

    it('extracts from plain .ts files with useI18n', async () => {
        const code = await readFixture('PlainScript.ts')
        const results = extractFromCode(code, 'PlainScript.ts', vueI18nPreset)

        expect(results).toHaveLength(3)
        expect(results.map(r => r.key)).toEqual(['actions.save', 'actions.cancel', 'actions.delete'])
    })

    it('extracts $t() global function calls', async () => {
        const code = await readFixture('GlobalFunction.ts')
        const results = extractFromCode(code, 'GlobalFunction.ts', vueI18nPreset)

        expect(results).toHaveLength(2)
        expect(results.map(r => r.key)).toEqual(['global.hello', 'global.world'])
        expect(results.every(r => r.namespace === undefined)).toBe(true)
    })
})
