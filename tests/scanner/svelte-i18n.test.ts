import { svelteI18nPreset } from '@/presets/svelte-i18n.js'
import { extractFromCode } from '@/scanner/extract.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const fixturesDir = path.resolve(__dirname, '../fixtures/svelte-i18n')

async function readFixture(name: string): Promise<string> {
    return fs.readFile(path.join(fixturesDir, name), 'utf-8')
}

describe('extractFromCode — svelte-i18n preset', () => {
    it('extracts $_() calls from <script> and template', async () => {
        const code = await readFixture('BasicComponent.svelte')
        const results = extractFromCode(code, 'BasicComponent.svelte', svelteI18nPreset)

        expect(results).toHaveLength(3)
        expect(results).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ key: 'hello', namespace: undefined }),
                expect.objectContaining({ key: 'goodbye', namespace: undefined }),
                expect.objectContaining({ key: 'title', namespace: undefined }),
            ]),
        )
    })

    it('extracts $_(), $t(), and $format() calls', async () => {
        const code = await readFixture('MultipleStores.svelte')
        const results = extractFromCode(code, 'MultipleStores.svelte', svelteI18nPreset)

        expect(results).toHaveLength(3)
        expect(results.map(r => r.key)).toEqual(['store.underscore', 'store.t', 'store.format'])
        expect(results.every(r => r.namespace === undefined)).toBe(true)
    })

    it('extracts from plain .ts files', async () => {
        const code = await readFixture('PlainScript.ts')
        const results = extractFromCode(code, 'PlainScript.ts', svelteI18nPreset)

        expect(results).toHaveLength(3)
        expect(results.map(r => r.key)).toEqual(['nav.home', 'nav.about', 'nav.contact'])
    })
})
