import { resolveTimeout, resolveToken } from '@/api'
import type { LynguistConfig } from '@/config'
import type { Preset } from '@/presets/types'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { UploadResult } from './types.js'

type JsonValue = string | number | boolean | null | JsonObject
type JsonObject = { [key: string]: JsonValue }

export function flattenJson(obj: JsonObject, prefix?: string): Record<string, string | null> {
    const result: Record<string, string | null> = {}

    for (const key of Object.keys(obj)) {
        const value = obj[key]
        const fullKey = prefix ? `${prefix}.${key}` : key

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            Object.assign(result, flattenJson(value as JsonObject, fullKey))
        } else if (typeof value === 'string' && value === '') {
            result[fullKey] = null
        } else if (typeof value === 'string') {
            result[fullKey] = value
        } else {
            result[fullKey] = value === null ? null : String(value)
        }
    }

    return result
}

async function readJsonFile(filePath: string): Promise<JsonObject> {
    try {
        const content = await fs.readFile(filePath, 'utf-8')

        return JSON.parse(content)
    } catch {
        return {}
    }
}

async function readLocaleTranslations(
    locale: string,
    translationsDir: string,
    preset: Preset,
    config: LynguistConfig,
): Promise<Record<string, string | null>> {
    if ((config.fileStrategy ?? preset.fileStrategy) === 'single-file') {
        const filePath = path.resolve(translationsDir, `${locale}.json`)
        const data = await readJsonFile(filePath)

        return flattenJson(data)
    }

    // namespace-files: read all JSON files in the locale directory
    const localeDir = path.resolve(translationsDir, locale)
    const result: Record<string, string | null> = {}

    try {
        const entries = await fs.readdir(localeDir)

        for (const entry of entries) {
            if (!entry.endsWith('.json')) continue

            const namespace = entry.replace('.json', '')
            const filePath = path.resolve(localeDir, entry)
            const data = await readJsonFile(filePath)
            const flattened = flattenJson(data, namespace)

            Object.assign(result, flattened)
        }
    } catch {
        // Directory doesn't exist yet
    }

    return result
}

export async function upload(config: LynguistConfig, preset: Preset): Promise<UploadResult> {
    const token = resolveToken(config)
    const timeout = resolveTimeout()
    const translationsDir = config.translationsDir ?? 'lang'
    const locales = config.locales ?? []

    if (locales.length === 0) {
        throw new Error('No locales configured. Add `locales` to your Lynguist config.')
    }

    const translations: Record<string, Record<string, string | null>> = {}
    let keysPerLocale = 0

    for (const locale of locales) {
        const localeData = await readLocaleTranslations(locale, translationsDir, preset, config)

        translations[locale] = localeData
        keysPerLocale = Object.keys(localeData).length
    }

    const response = await fetch('https://lynguist.com/api/translations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ translations }),
        signal: AbortSignal.timeout(timeout),
    })

    if (!response.ok) {
        const body = await response.text().catch(() => '')

        throw new Error(`Upload failed (${response.status}): ${body}`)
    }

    return {
        success: true,
        localesUploaded: locales,
        keysPerLocale,
    }
}

export type { UploadResult } from './types.js'
