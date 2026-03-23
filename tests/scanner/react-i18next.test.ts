import { reactI18nextPreset } from '@/presets/react-i18next.js'
import { extractFromCode } from '@/scanner/extract.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const fixturesDir = path.resolve(__dirname, '../fixtures/react-i18next')

async function readFixture(name: string): Promise<string> {
    return fs.readFile(path.join(fixturesDir, name), 'utf-8')
}

describe('extractFromCode — react-i18next preset', () => {
    it('extracts destructured { t } from useTranslation', async () => {
        const code = await readFixture('BasicComponent.tsx')
        const results = extractFromCode(code, 'BasicComponent.tsx', reactI18nextPreset)

        expect(results).toHaveLength(2)
        expect(results).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ key: 'title', namespace: 'Dashboard' }),
                expect.objectContaining({ key: 'welcome_message', namespace: 'Dashboard' }),
            ]),
        )

        for (const r of results) {
            expect(r.file).toBe('BasicComponent.tsx')
            expect(r.line).toBeGreaterThan(0)
        }
    })

    it('handles multiple namespaces with renamed destructuring', async () => {
        const code = await readFixture('MultipleNamespaces.tsx')
        const results = extractFromCode(code, 'MultipleNamespaces.tsx', reactI18nextPreset)

        expect(results).toHaveLength(4)

        const headerKeys = results.filter(r => r.namespace === 'Header')
        const footerKeys = results.filter(r => r.namespace === 'Footer')

        expect(headerKeys).toHaveLength(2)
        expect(footerKeys).toHaveLength(2)

        expect(headerKeys.map(r => r.key)).toEqual(expect.arrayContaining(['logo', 'nav.home']))
        expect(footerKeys.map(r => r.key)).toEqual(expect.arrayContaining(['copyright', 'privacy_link']))
    })

    it('handles useTranslation() with no namespace argument', async () => {
        const code = await readFixture('NoNamespace.tsx')
        const results = extractFromCode(code, 'NoNamespace.tsx', reactI18nextPreset)

        expect(results).toHaveLength(2)
        expect(results.every(r => r.namespace === undefined)).toBe(true)
        expect(results.map(r => r.key)).toEqual(['global_title', 'global_subtitle'])
    })

    it('extracts nested dot-notation keys', async () => {
        const code = await readFixture('NestedKeys.tsx')
        const results = extractFromCode(code, 'NestedKeys.tsx', reactI18nextPreset)

        expect(results).toHaveLength(3)
        expect(results.map(r => r.key)).toEqual(['user.profile.name', 'user.profile.email', 'user.settings.theme'])
        expect(results.every(r => r.namespace === 'Profile')).toBe(true)
    })
})
