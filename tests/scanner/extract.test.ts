import { nextIntlPreset } from '@/presets/next-intl.js'
import { extractFromCode } from '@/scanner/extract.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

const fixturesDir = path.resolve(__dirname, '../fixtures/next-intl')

async function readFixture(name: string): Promise<string> {
    return fs.readFile(path.join(fixturesDir, name), 'utf-8')
}

describe('extractFromCode — next-intl preset', () => {
    it('extracts basic useTranslations + t() calls', async () => {
        const code = await readFixture('BasicComponent.tsx')
        const results = extractFromCode(code, 'BasicComponent.tsx', nextIntlPreset)

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

    it('extracts getTranslations (async/await) calls', async () => {
        const code = await readFixture('ServerComponent.tsx')
        const results = extractFromCode(code, 'ServerComponent.tsx', nextIntlPreset)

        expect(results).toHaveLength(2)
        expect(results).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ key: 'page_title', namespace: 'Settings' }),
                expect.objectContaining({ key: 'description', namespace: 'Settings' }),
            ]),
        )
    })

    it('extracts nested dot-notation keys', async () => {
        const code = await readFixture('NestedKeys.tsx')
        const results = extractFromCode(code, 'NestedKeys.tsx', nextIntlPreset)

        expect(results).toHaveLength(3)
        expect(results.map(r => r.key)).toEqual(['user.profile.name', 'user.profile.email', 'user.settings.theme'])
        expect(results.every(r => r.namespace === 'Profile')).toBe(true)
    })

    it('handles multiple namespaces in one file', async () => {
        const code = await readFixture('MultipleNamespaces.tsx')
        const results = extractFromCode(code, 'MultipleNamespaces.tsx', nextIntlPreset)

        expect(results).toHaveLength(4)

        const headerKeys = results.filter(r => r.namespace === 'Header')
        const footerKeys = results.filter(r => r.namespace === 'Footer')

        expect(headerKeys).toHaveLength(2)
        expect(footerKeys).toHaveLength(2)

        expect(headerKeys.map(r => r.key)).toEqual(expect.arrayContaining(['logo', 'nav.home']))
        expect(footerKeys.map(r => r.key)).toEqual(expect.arrayContaining(['copyright', 'privacy_link']))
    })

    it('handles useTranslations() with no namespace argument', async () => {
        const code = await readFixture('NoNamespace.tsx')
        const results = extractFromCode(code, 'NoNamespace.tsx', nextIntlPreset)

        expect(results).toHaveLength(2)
        expect(results.every(r => r.namespace === undefined)).toBe(true)
        expect(results.map(r => r.key)).toEqual(['global_title', 'global_subtitle'])
    })

    it('extracts t.rich(), t.markup(), t.raw() member method calls', async () => {
        const code = await readFixture('RichText.tsx')
        const results = extractFromCode(code, 'RichText.tsx', nextIntlPreset)

        expect(results).toHaveLength(4)
        expect(results.map(r => r.key)).toEqual(['hero_title', 'terms_html', 'raw_content', 'plain_text'])
        expect(results.every(r => r.namespace === 'Marketing')).toBe(true)
    })

    it('skips non-string-literal arguments with a warning', () => {
        const code = `
      import { useTranslations } from 'next-intl';

      function Component() {
        const t = useTranslations('Test');
        const key = 'dynamic';
        return <p>{t(key)}</p>;
      }
    `

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const results = extractFromCode(code, 'Dynamic.tsx', nextIntlPreset)

        expect(results).toHaveLength(0)
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping non-string-literal'))
        warnSpy.mockRestore()
    })

    it('extracts template literal usage with a warning', () => {
        const code = `
      import { useTranslations } from 'next-intl';

      function Component() {
        const t = useTranslations('Test');
        const name = 'world';
        return <p>{t(\`hello_\${name}\`)}</p>;
      }
    `

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const results = extractFromCode(code, 'TemplateLiteral.tsx', nextIntlPreset)

        expect(results).toHaveLength(0)
        expect(warnSpy).toHaveBeenCalled()
        warnSpy.mockRestore()
    })
})
