import { scan } from '@/scanner/index.js'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const fixturesDir = path.resolve(__dirname, '../fixtures/next-intl')

describe('scan — next-intl integration', () => {
    it('scans a directory and collects all translation keys', async () => {
        const result = await scan({
            sourceDir: fixturesDir,
            preset: 'next-intl',
        })

        expect(result.scannedFiles).toBe(7)

        // BasicComponent: 2, ServerComponent: 2, NestedKeys: 3,
        // MultipleNamespaces: 4, NoNamespace: 2, RichText: 4, ObjectNamespace: 3 = 20
        expect(result.keys).toHaveLength(20)
    })

    it('returns correct namespaces across files', async () => {
        const result = await scan({
            sourceDir: fixturesDir,
            preset: 'next-intl',
        })

        const namespaces = [...new Set(result.keys.map(k => k.namespace))]
        expect(namespaces).toEqual(
            expect.arrayContaining([
                'Dashboard',
                'Settings',
                'Profile',
                'Header',
                'Footer',
                'Marketing',
                'home',
                'metadata.home',
                undefined,
            ]),
        )
    })

    it('includes relative file paths in results', async () => {
        const result = await scan({
            sourceDir: fixturesDir,
            preset: 'next-intl',
        })

        const files = [...new Set(result.keys.map(k => k.file))]
        expect(files.every(f => !path.isAbsolute(f))).toBe(true)
        expect(files).toEqual(expect.arrayContaining(['BasicComponent.tsx', 'ServerComponent.tsx']))
    })

    it('throws on unknown preset', async () => {
        await expect(scan({ sourceDir: fixturesDir, preset: 'nonexistent' })).rejects.toThrow(
            'Unknown preset "nonexistent"',
        )
    })
})
