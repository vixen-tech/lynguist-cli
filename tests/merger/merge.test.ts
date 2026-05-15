import type { LynguistConfig } from '@/config'
import { merge } from '@/merger'
import type { Preset } from '@/presets/types'
import type { ExtractionResult } from '@/scanner/types'
import fs from 'node:fs/promises'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const tmpDir = path.resolve(__dirname, '../.tmp-merge-test')

function makeConfig(overrides: Partial<LynguistConfig> = {}): LynguistConfig {
    return {
        sourceDir: 'src',
        preset: 'test',
        locales: ['en', 'fr'],
        translationsDir: tmpDir,
        ...overrides,
    }
}

const singleFilePreset: Preset = {
    name: 'test-single',
    extensions: ['.ts'],
    fileStrategy: 'single-file',
}

const namespaceFilesPreset: Preset = {
    name: 'test-ns',
    extensions: ['.ts'],
    fileStrategy: 'namespace-files',
}

function key(k: string, ns?: string): ExtractionResult {
    return { key: k, namespace: ns, file: 'test.ts', line: 1 }
}

beforeEach(async () => {
    await fs.mkdir(tmpDir, { recursive: true })
})

afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('merge – single-file strategy', () => {
    it('creates locale files with namespaced keys', async () => {
        const keys = [key('title', 'Home'), key('subtitle', 'Home'), key('label', 'Nav')]

        const result = await merge(keys, makeConfig(), singleFilePreset)

        expect(result.added).toBe(6) // 3 keys × 2 locales
        expect(result.filesWritten).toHaveLength(2)

        const en = JSON.parse(await fs.readFile(path.join(tmpDir, 'en.json'), 'utf-8'))

        expect(en).toEqual({
            Home: { subtitle: null, title: null },
            Nav: { label: null },
        })
    })

    it('creates locale files with non-namespaced keys', async () => {
        const keys = [key('greeting'), key('farewell')]

        const result = await merge(keys, makeConfig(), singleFilePreset)

        expect(result.added).toBe(4) // 2 keys × 2 locales

        const en = JSON.parse(await fs.readFile(path.join(tmpDir, 'en.json'), 'utf-8'))

        expect(en).toEqual({ farewell: null, greeting: null })
    })

    it('preserves existing non-empty values', async () => {
        await fs.writeFile(path.join(tmpDir, 'en.json'), JSON.stringify({ Home: { title: 'Welcome' } }))

        const keys = [key('title', 'Home'), key('subtitle', 'Home')]

        const result = await merge(keys, makeConfig({ locales: ['en'] }), singleFilePreset)

        expect(result.added).toBe(1)
        expect(result.preserved).toBe(1)

        const en = JSON.parse(await fs.readFile(path.join(tmpDir, 'en.json'), 'utf-8'))

        expect(en.Home.title).toBe('Welcome')
        expect(en.Home.subtitle).toBeNull()
    })

    it('keeps stale keys by default (no prune)', async () => {
        await fs.writeFile(path.join(tmpDir, 'en.json'), JSON.stringify({ Home: { title: 'Welcome', old: 'Stale' } }))

        const keys = [key('title', 'Home')]

        const result = await merge(keys, makeConfig({ locales: ['en'] }), singleFilePreset)

        const en = JSON.parse(await fs.readFile(path.join(tmpDir, 'en.json'), 'utf-8'))

        expect(en.Home.old).toBe('Stale')
        expect(result.pruned).toBe(0)
    })

    it('removes stale keys with prune: true', async () => {
        await fs.writeFile(path.join(tmpDir, 'en.json'), JSON.stringify({ Home: { title: 'Welcome', old: 'Stale' } }))

        const keys = [key('title', 'Home')]

        const result = await merge(keys, makeConfig({ locales: ['en'] }), singleFilePreset, { prune: true })

        const en = JSON.parse(await fs.readFile(path.join(tmpDir, 'en.json'), 'utf-8'))

        expect(en.Home.old).toBeUndefined()
        expect(result.pruned).toBe(1)
    })

    it('sorts keys alphabetically', async () => {
        const keys = [key('zebra', 'B'), key('apple', 'A'), key('mango', 'B')]

        await merge(keys, makeConfig({ locales: ['en'] }), singleFilePreset)

        const raw = await fs.readFile(path.join(tmpDir, 'en.json'), 'utf-8')
        const topLevelKeys = Object.keys(JSON.parse(raw))

        expect(topLevelKeys).toEqual(['A', 'B'])

        const b = JSON.parse(raw).B

        expect(Object.keys(b)).toEqual(['mango', 'zebra'])
    })

    it('handles mixed namespaced and non-namespaced keys', async () => {
        const keys = [key('global_key'), key('title', 'Home')]

        await merge(keys, makeConfig({ locales: ['en'] }), singleFilePreset)

        const en = JSON.parse(await fs.readFile(path.join(tmpDir, 'en.json'), 'utf-8'))

        expect(en).toEqual({
            Home: { title: null },
            global_key: null,
        })
    })

    it('nests dotted namespaces into deep objects', async () => {
        const keys = [
            key('title', 'metadata.home'),
            key('description', 'metadata.home'),
            key('title', 'metadata.about'),
            key('titleTemplate', 'metadata'),
            key('title', 'home'),
        ]

        await merge(keys, makeConfig({ locales: ['en'] }), singleFilePreset)

        const en = JSON.parse(await fs.readFile(path.join(tmpDir, 'en.json'), 'utf-8'))

        expect(en).toEqual({
            home: { title: null },
            metadata: {
                about: { title: null },
                home: { description: null, title: null },
                titleTemplate: null,
            },
        })
    })

    it('preserves existing values in dotted namespaces', async () => {
        await fs.writeFile(
            path.join(tmpDir, 'en.json'),
            JSON.stringify({
                metadata: {
                    home: { title: 'Existing Title', description: 'Existing Desc' },
                    titleTemplate: '%s • Site',
                },
            }),
        )

        const keys = [key('title', 'metadata.home'), key('seoKeywords', 'metadata.home'), key('titleTemplate', 'metadata')]

        const result = await merge(keys, makeConfig({ locales: ['en'] }), singleFilePreset)

        const en = JSON.parse(await fs.readFile(path.join(tmpDir, 'en.json'), 'utf-8'))

        expect(en.metadata.home.title).toBe('Existing Title')
        expect(en.metadata.home.seoKeywords).toBeNull()
        expect(en.metadata.titleTemplate).toBe('%s • Site')
        expect(result.added).toBe(1) // seoKeywords
        expect(result.preserved).toBe(3) // title, description (stale but kept), titleTemplate
    })

    it('throws if no locales configured', async () => {
        await expect(merge([], makeConfig({ locales: [] }), singleFilePreset)).rejects.toThrow('No locales configured')
    })
})

describe('merge – namespace-files strategy', () => {
    it('creates per-namespace files', async () => {
        const keys = [key('title', 'home'), key('label', 'nav')]

        const result = await merge(keys, makeConfig(), namespaceFilesPreset)

        expect(result.added).toBe(4) // 2 keys × 2 locales
        expect(result.filesWritten).toHaveLength(4) // 2 namespaces × 2 locales

        const enHome = JSON.parse(await fs.readFile(path.join(tmpDir, 'en', 'home.json'), 'utf-8'))

        expect(enHome).toEqual({ title: null })

        const frNav = JSON.parse(await fs.readFile(path.join(tmpDir, 'fr', 'nav.json'), 'utf-8'))

        expect(frNav).toEqual({ label: null })
    })

    it('puts non-namespaced keys in default.json', async () => {
        const keys = [key('greeting')]

        await merge(keys, makeConfig({ locales: ['en'] }), namespaceFilesPreset)

        const defaultFile = JSON.parse(await fs.readFile(path.join(tmpDir, 'en', 'default.json'), 'utf-8'))

        expect(defaultFile).toEqual({ greeting: null })
    })

    it('preserves existing values in namespace files', async () => {
        await fs.mkdir(path.join(tmpDir, 'en'), { recursive: true })
        await fs.writeFile(path.join(tmpDir, 'en', 'home.json'), JSON.stringify({ title: 'Welcome' }))

        const keys = [key('title', 'home'), key('subtitle', 'home')]

        const result = await merge(keys, makeConfig({ locales: ['en'] }), namespaceFilesPreset)

        const enHome = JSON.parse(await fs.readFile(path.join(tmpDir, 'en', 'home.json'), 'utf-8'))

        expect(enHome.title).toBe('Welcome')
        expect(enHome.subtitle).toBeNull()
        expect(result.added).toBe(1)
        expect(result.preserved).toBe(1)
    })

    it('prunes stale keys in namespace files', async () => {
        await fs.mkdir(path.join(tmpDir, 'en'), { recursive: true })
        await fs.writeFile(path.join(tmpDir, 'en', 'home.json'), JSON.stringify({ title: 'Welcome', old: 'Stale' }))

        const keys = [key('title', 'home')]

        const result = await merge(keys, makeConfig({ locales: ['en'] }), namespaceFilesPreset, { prune: true })

        const enHome = JSON.parse(await fs.readFile(path.join(tmpDir, 'en', 'home.json'), 'utf-8'))

        expect(enHome.old).toBeUndefined()
        expect(result.pruned).toBe(1)
    })

    it('respects config-level fileStrategy override to single-file', async () => {
        const keys = [key('greeting'), key('farewell')]

        const result = await merge(
            keys,
            makeConfig({ locales: ['en'], fileStrategy: 'single-file' }),
            namespaceFilesPreset,
        )

        expect(result.added).toBe(2)
        expect(result.filesWritten).toHaveLength(1)

        const en = JSON.parse(await fs.readFile(path.join(tmpDir, 'en.json'), 'utf-8'))

        expect(en).toEqual({ farewell: null, greeting: null })
    })

    it('keeps existing namespace files when not pruning', async () => {
        await fs.mkdir(path.join(tmpDir, 'en'), { recursive: true })
        await fs.writeFile(path.join(tmpDir, 'en', 'legacy.json'), JSON.stringify({ old_key: 'Old Value' }))

        const keys = [key('title', 'home')]

        await merge(keys, makeConfig({ locales: ['en'] }), namespaceFilesPreset)

        const legacy = JSON.parse(await fs.readFile(path.join(tmpDir, 'en', 'legacy.json'), 'utf-8'))

        expect(legacy.old_key).toBe('Old Value')
    })
})
