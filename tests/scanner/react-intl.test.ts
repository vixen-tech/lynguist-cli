import { reactIntlPreset } from '@/presets/react-intl.js'
import { extractFromCode } from '@/scanner/extract.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const fixturesDir = path.resolve(__dirname, '../fixtures/react-intl')

async function readFixture(name: string): Promise<string> {
    return fs.readFile(path.join(fixturesDir, name), 'utf-8')
}

describe('extractFromCode — react-intl preset', () => {
    it('extracts intl.formatMessage({ id }) calls', async () => {
        const code = await readFixture('FormatMessage.tsx')
        const results = extractFromCode(code, 'FormatMessage.tsx', reactIntlPreset)

        expect(results).toHaveLength(2)
        expect(results).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ key: 'page.title', namespace: undefined }),
                expect.objectContaining({ key: 'page.description', namespace: undefined }),
            ]),
        )

        for (const r of results) {
            expect(r.file).toBe('FormatMessage.tsx')
            expect(r.line).toBeGreaterThan(0)
        }
    })

    it('extracts <FormattedMessage id="..." /> from JSX', async () => {
        const code = await readFixture('FormattedMessageComponent.tsx')
        const results = extractFromCode(code, 'FormattedMessageComponent.tsx', reactIntlPreset)

        expect(results).toHaveLength(2)
        expect(results).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ key: 'hero.title', namespace: undefined }),
                expect.objectContaining({ key: 'hero.subtitle', namespace: undefined }),
            ]),
        )
    })

    it('extracts both formatMessage and FormattedMessage in the same file', async () => {
        const code = await readFixture('Combined.tsx')
        const results = extractFromCode(code, 'Combined.tsx', reactIntlPreset)

        expect(results).toHaveLength(3)
        expect(results.map(r => r.key)).toEqual(expect.arrayContaining(['nav.title', 'nav.description', 'nav.cta']))
        expect(results.every(r => r.namespace === undefined)).toBe(true)
    })

    it('extracts keys even with defaultMessage present', async () => {
        const code = await readFixture('DefaultMessage.tsx')
        const results = extractFromCode(code, 'DefaultMessage.tsx', reactIntlPreset)

        expect(results).toHaveLength(2)
        expect(results.map(r => r.key)).toEqual(expect.arrayContaining(['greeting', 'farewell']))
    })
})
