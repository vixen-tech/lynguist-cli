import type { LynguistConfig } from '@/config'
import { download, groupByNamespace, unflattenJson } from '@/downloader'
import type { Preset } from '@/presets/types'
import fs from 'node:fs/promises'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const tmpDir = path.resolve(__dirname, '../.tmp-download-test')

function makeConfig(overrides: Partial<LynguistConfig> = {}): LynguistConfig {
    return {
        sourceDir: 'src',
        preset: 'test',
        locales: ['en', 'fr'],
        translationsDir: tmpDir,
        lynguist: { apiKey: 'test-token' },
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

function mockFetchResponse(translations: Record<string, Record<string, string | null>>, status = 200) {
    return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ translations }), {
            status,
            headers: { 'Content-Type': 'application/json' },
        }),
    )
}

beforeEach(async () => {
    await fs.mkdir(tmpDir, { recursive: true })
})

afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
    vi.restoreAllMocks()
    delete process.env.LYNGUIST_API_TOKEN
    delete process.env.LYNGUIST_TIMEOUT
})

describe('unflattenJson', () => {
    it('converts dot-notation keys to nested objects', () => {
        const result = unflattenJson({
            'Home.title': 'Welcome',
            'Home.subtitle': 'Hello',
            'Nav.about': 'About Us',
        })

        expect(result).toEqual({
            Home: { title: 'Welcome', subtitle: 'Hello' },
            Nav: { about: 'About Us' },
        })
    })

    it('handles deeply nested keys', () => {
        const result = unflattenJson({
            'metadata.home.title': 'Home Title',
            'metadata.home.description': 'Home Desc',
            'metadata.about.title': 'About Title',
        })

        expect(result).toEqual({
            metadata: {
                home: { title: 'Home Title', description: 'Home Desc' },
                about: { title: 'About Title' },
            },
        })
    })

    it('preserves null values', () => {
        const result = unflattenJson({
            'Home.title': null,
            'Nav.about': 'About',
        })

        expect(result).toEqual({
            Home: { title: null },
            Nav: { about: 'About' },
        })
    })

    it('handles flat keys without dots', () => {
        const result = unflattenJson({ greeting: 'Hello', farewell: 'Goodbye' })

        expect(result).toEqual({ greeting: 'Hello', farewell: 'Goodbye' })
    })

    it('handles empty input', () => {
        const result = unflattenJson({})

        expect(result).toEqual({})
    })
})

describe('groupByNamespace', () => {
    it('groups keys by first dot segment', () => {
        const result = groupByNamespace({
            'Home.title': 'Welcome',
            'Home.subtitle': 'Hello',
            'Nav.about': 'About',
        })

        expect(result.get('Home')).toEqual({
            title: 'Welcome',
            subtitle: 'Hello',
        })
        expect(result.get('Nav')).toEqual({
            about: 'About',
        })
    })

    it('preserves null values', () => {
        const result = groupByNamespace({
            'Home.title': null,
            'Home.subtitle': 'Hello',
        })

        expect(result.get('Home')).toEqual({
            title: null,
            subtitle: 'Hello',
        })
    })

    it('handles nested keys within namespace', () => {
        const result = groupByNamespace({
            'Home.section.title': 'Title',
            'Home.section.description': 'Desc',
        })

        expect(result.get('Home')).toEqual({
            'section.title': 'Title',
            'section.description': 'Desc',
        })
    })

    it('ignores keys without a dot', () => {
        const result = groupByNamespace({
            greeting: 'Hello',
            'Nav.about': 'About',
        })

        expect(result.size).toBe(1)
        expect(result.get('Nav')).toEqual({ about: 'About' })
    })
})

describe('download – single-file strategy', () => {
    it('writes nested JSON files for each locale', async () => {
        mockFetchResponse({
            en: { 'Home.title': 'Welcome', 'Nav.about': 'About' },
            fr: { 'Home.title': 'Bienvenue', 'Nav.about': 'À propos' },
        })

        const result = await download(makeConfig(), singleFilePreset)

        expect(result.success).toBe(true)
        expect(result.localesDownloaded).toEqual(['en', 'fr'])
        expect(result.keysPerLocale).toBe(2)
        expect(result.filesWritten).toHaveLength(2)

        const enContent = JSON.parse(await fs.readFile(path.join(tmpDir, 'en.json'), 'utf-8'))

        expect(enContent).toEqual({
            Home: { title: 'Welcome' },
            Nav: { about: 'About' },
        })

        const frContent = JSON.parse(await fs.readFile(path.join(tmpDir, 'fr.json'), 'utf-8'))

        expect(frContent).toEqual({
            Home: { title: 'Bienvenue' },
            Nav: { about: 'À propos' },
        })
    })

    it('preserves null values in written files', async () => {
        mockFetchResponse({
            en: { 'Home.title': 'Welcome', 'Home.subtitle': null },
        })

        await download(makeConfig({ locales: ['en'] }), singleFilePreset)

        const content = JSON.parse(await fs.readFile(path.join(tmpDir, 'en.json'), 'utf-8'))

        expect(content.Home.subtitle).toBeNull()
    })

    it('sorts keys alphabetically', async () => {
        mockFetchResponse({
            en: { 'Zebra.name': 'Z', 'Apple.name': 'A', 'Mango.name': 'M' },
        })

        await download(makeConfig({ locales: ['en'] }), singleFilePreset)

        const raw = await fs.readFile(path.join(tmpDir, 'en.json'), 'utf-8')
        const keys = Object.keys(JSON.parse(raw))

        expect(keys).toEqual(['Apple', 'Mango', 'Zebra'])
    })

    it('overwrites existing files entirely', async () => {
        await fs.writeFile(
            path.join(tmpDir, 'en.json'),
            JSON.stringify({ Old: { key: 'should be gone' } }),
        )

        mockFetchResponse({
            en: { 'New.key': 'fresh' },
        })

        await download(makeConfig({ locales: ['en'] }), singleFilePreset)

        const content = JSON.parse(await fs.readFile(path.join(tmpDir, 'en.json'), 'utf-8'))

        expect(content).toEqual({ New: { key: 'fresh' } })
        expect(content.Old).toBeUndefined()
    })
})

describe('download – namespace-files strategy', () => {
    it('writes separate files per namespace', async () => {
        mockFetchResponse({
            en: { 'Home.title': 'Welcome', 'Nav.about': 'About' },
        })

        const result = await download(makeConfig({ locales: ['en'] }), namespaceFilesPreset)

        expect(result.success).toBe(true)
        expect(result.filesWritten).toHaveLength(2)

        const homeContent = JSON.parse(await fs.readFile(path.join(tmpDir, 'en', 'Home.json'), 'utf-8'))

        expect(homeContent).toEqual({ title: 'Welcome' })

        const navContent = JSON.parse(await fs.readFile(path.join(tmpDir, 'en', 'Nav.json'), 'utf-8'))

        expect(navContent).toEqual({ about: 'About' })
    })

    it('handles nested keys within namespaces', async () => {
        mockFetchResponse({
            en: { 'Home.section.title': 'Title', 'Home.section.description': 'Desc' },
        })

        await download(makeConfig({ locales: ['en'] }), namespaceFilesPreset)

        const content = JSON.parse(await fs.readFile(path.join(tmpDir, 'en', 'Home.json'), 'utf-8'))

        expect(content).toEqual({
            section: { title: 'Title', description: 'Desc' },
        })
    })
})

describe('download – error handling', () => {
    it('throws on non-ok response', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('Unauthorized', { status: 401 }),
        )

        await expect(download(makeConfig(), singleFilePreset)).rejects.toThrow('Download failed (401)')
    })

    it('throws when no locales in response', async () => {
        mockFetchResponse({})

        await expect(download(makeConfig(), singleFilePreset)).rejects.toThrow('No locales found')
    })

    it('throws when no token is available', async () => {
        await expect(download(makeConfig({ lynguist: {} }), singleFilePreset)).rejects.toThrow('No API token found')
    })
})

describe('download – API request', () => {
    it('sends correct GET request with auth header', async () => {
        const fetchSpy = mockFetchResponse({
            en: { 'Home.title': 'Welcome' },
        })

        await download(makeConfig({ locales: ['en'] }), singleFilePreset)

        expect(fetchSpy).toHaveBeenCalledOnce()

        const [url, options] = fetchSpy.mock.calls[0]

        expect(url).toBe('https://lynguist.com/api/translations')
        expect(options?.method).toBe('GET')
        expect((options?.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token')
    })

    it('uses LYNGUIST_TIMEOUT env var', async () => {
        process.env.LYNGUIST_TIMEOUT = '30000'

        const fetchSpy = mockFetchResponse({
            en: { 'Home.title': 'Welcome' },
        })

        await download(makeConfig({ locales: ['en'] }), singleFilePreset)

        const [, options] = fetchSpy.mock.calls[0]

        expect(options?.signal).toBeDefined()
    })
})
