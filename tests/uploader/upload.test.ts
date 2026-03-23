import type { LynguistConfig } from '@/config'
import type { Preset } from '@/presets/types'
import { flattenJson, upload } from '@/uploader'
import fs from 'node:fs/promises'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const tmpDir = path.resolve(__dirname, '../.tmp-upload-test')

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

beforeEach(async () => {
    await fs.mkdir(tmpDir, { recursive: true })
})

afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
    vi.restoreAllMocks()
    delete process.env.LYNGUIST_API_TOKEN
    delete process.env.LYNGUIST_TIMEOUT
})

describe('flattenJson', () => {
    it('flattens nested objects into dot notation', () => {
        const result = flattenJson({
            Home: { title: 'Welcome', subtitle: 'Hello' },
            Nav: { about: 'About Us' },
        })

        expect(result).toEqual({
            'Home.title': 'Welcome',
            'Home.subtitle': 'Hello',
            'Nav.about': 'About Us',
        })
    })

    it('flattens deeply nested objects', () => {
        const result = flattenJson({
            metadata: {
                home: { title: 'Home Title', description: 'Home Desc' },
                about: { title: 'About Title' },
            },
        })

        expect(result).toEqual({
            'metadata.home.title': 'Home Title',
            'metadata.home.description': 'Home Desc',
            'metadata.about.title': 'About Title',
        })
    })

    it('converts empty strings to null', () => {
        const result = flattenJson({ key: '' })

        expect(result).toEqual({ key: null })
    })

    it('preserves non-empty string values', () => {
        const result = flattenJson({ key: 'value' })

        expect(result).toEqual({ key: 'value' })
    })

    it('converts null values to null', () => {
        const result = flattenJson({ key: null })

        expect(result).toEqual({ key: null })
    })

    it('handles flat objects without nesting', () => {
        const result = flattenJson({ greeting: 'Hello', farewell: 'Goodbye' })

        expect(result).toEqual({ greeting: 'Hello', farewell: 'Goodbye' })
    })

    it('uses prefix when provided', () => {
        const result = flattenJson({ title: 'Home' }, 'Home')

        expect(result).toEqual({ 'Home.title': 'Home' })
    })
})

describe('upload – token resolution', () => {
    it('uses config apiKey first', async () => {
        await fs.writeFile(path.join(tmpDir, 'en.json'), JSON.stringify({ key: 'value' }))
        await fs.writeFile(path.join(tmpDir, 'fr.json'), JSON.stringify({ key: 'valeur' }))

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))

        await upload(makeConfig(), singleFilePreset)

        expect(fetchSpy).toHaveBeenCalledOnce()

        const [, options] = fetchSpy.mock.calls[0]

        expect((options?.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token')
    })

    it('falls back to LYNGUIST_API_TOKEN env var', async () => {
        process.env.LYNGUIST_API_TOKEN = 'env-token'

        await fs.writeFile(path.join(tmpDir, 'en.json'), JSON.stringify({ key: 'value' }))
        await fs.writeFile(path.join(tmpDir, 'fr.json'), JSON.stringify({ key: 'valeur' }))

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))

        await upload(makeConfig({ lynguist: {} }), singleFilePreset)

        const [, options] = fetchSpy.mock.calls[0]

        expect((options?.headers as Record<string, string>)['Authorization']).toBe('Bearer env-token')
    })

    it('throws when no token is available', async () => {
        await expect(upload(makeConfig({ lynguist: {} }), singleFilePreset)).rejects.toThrow('No API token found')
    })
})

describe('upload – payload shape', () => {
    it('builds correct payload for single-file strategy', async () => {
        await fs.writeFile(
            path.join(tmpDir, 'en.json'),
            JSON.stringify({ Home: { title: 'Welcome' }, Nav: { about: 'About' } }),
        )
        await fs.writeFile(
            path.join(tmpDir, 'fr.json'),
            JSON.stringify({ Home: { title: 'Bienvenue' }, Nav: { about: 'À propos' } }),
        )

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))

        const result = await upload(makeConfig(), singleFilePreset)

        expect(result.success).toBe(true)
        expect(result.localesUploaded).toEqual(['en', 'fr'])
        expect(result.keysPerLocale).toBe(2)

        const [url, options] = fetchSpy.mock.calls[0]

        expect(url).toBe('https://lynguist.com/api/translations')

        const body = JSON.parse(options?.body as string)

        expect(body.translations.en).toEqual({ 'Home.title': 'Welcome', 'Nav.about': 'About' })
        expect(body.translations.fr).toEqual({ 'Home.title': 'Bienvenue', 'Nav.about': 'À propos' })
    })

    it('builds correct payload for namespace-files strategy', async () => {
        await fs.mkdir(path.join(tmpDir, 'en'), { recursive: true })
        await fs.writeFile(path.join(tmpDir, 'en', 'home.json'), JSON.stringify({ title: 'Welcome' }))
        await fs.writeFile(path.join(tmpDir, 'en', 'nav.json'), JSON.stringify({ about: 'About' }))

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))

        await upload(makeConfig({ locales: ['en'] }), namespaceFilesPreset)

        const body = JSON.parse((fetchSpy.mock.calls[0][1]?.body as string))

        expect(body.translations.en).toEqual({ 'home.title': 'Welcome', 'nav.about': 'About' })
    })

    it('converts empty strings to null in payload', async () => {
        await fs.writeFile(path.join(tmpDir, 'en.json'), JSON.stringify({ key: '', translated: 'Hello' }))

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))

        await upload(makeConfig({ locales: ['en'] }), singleFilePreset)

        const body = JSON.parse((fetchSpy.mock.calls[0][1]?.body as string))

        expect(body.translations.en.key).toBeNull()
        expect(body.translations.en.translated).toBe('Hello')
    })
})

describe('upload – timeout', () => {
    it('uses LYNGUIST_TIMEOUT env var when set', async () => {
        process.env.LYNGUIST_TIMEOUT = '30000'

        await fs.writeFile(path.join(tmpDir, 'en.json'), JSON.stringify({ key: 'value' }))

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))

        await upload(makeConfig({ locales: ['en'] }), singleFilePreset)

        const [, options] = fetchSpy.mock.calls[0]
        const signal = options?.signal as AbortSignal

        expect(signal).toBeDefined()
    })

    it('throws on non-ok response', async () => {
        await fs.writeFile(path.join(tmpDir, 'en.json'), JSON.stringify({ key: 'value' }))

        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Unauthorized', { status: 401 }))

        await expect(upload(makeConfig({ locales: ['en'] }), singleFilePreset)).rejects.toThrow('Upload failed (401)')
    })
})

describe('upload – edge cases', () => {
    it('throws if no locales configured', async () => {
        await expect(upload(makeConfig({ locales: [] }), singleFilePreset)).rejects.toThrow('No locales configured')
    })

    it('handles missing translation files gracefully', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))

        const result = await upload(makeConfig({ locales: ['en'] }), singleFilePreset)

        expect(result.success).toBe(true)
        expect(result.keysPerLocale).toBe(0)

        const body = JSON.parse((fetchSpy.mock.calls[0][1]?.body as string))

        expect(body.translations.en).toEqual({})
    })
})
