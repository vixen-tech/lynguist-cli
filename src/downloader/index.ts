import { resolveTimeout, resolveToken } from '@/api'
import type { LynguistConfig } from '@/config'
import type { Preset } from '@/presets/types'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { DownloadResult } from './types.js'

type JsonValue = string | null | JsonObject
type JsonObject = { [key: string]: JsonValue }

export function unflattenJson(flat: Record<string, string | null>): JsonObject {
    const result: JsonObject = {}

    for (const key of Object.keys(flat)) {
        const segments = key.split('.')
        let current = result

        for (let i = 0; i < segments.length - 1; i++) {
            const seg = segments[i]

            if (typeof current[seg] !== 'object' || current[seg] === null || current[seg] === undefined) {
                current[seg] = {}
            }

            current = current[seg] as JsonObject
        }

        const value = flat[key]

        current[segments[segments.length - 1]] = value === null ? null : value
    }

    return result
}

export function groupByNamespace(
    flat: Record<string, string | null>,
): Map<string, Record<string, string | null>> {
    const groups = new Map<string, Record<string, string | null>>()

    for (const key of Object.keys(flat)) {
        const dotIndex = key.indexOf('.')

        if (dotIndex === -1) continue

        const namespace = key.substring(0, dotIndex)
        const rest = key.substring(dotIndex + 1)

        let group = groups.get(namespace)

        if (!group) {
            group = {}
            groups.set(namespace, group)
        }

        group[rest] = flat[key]
    }

    return groups
}

function sortKeys(obj: JsonObject): JsonObject {
    const sorted: JsonObject = {}

    for (const key of Object.keys(obj).sort()) {
        const value = obj[key]

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            sorted[key] = sortKeys(value as JsonObject)
        } else {
            sorted[key] = value
        }
    }

    return sorted
}

async function writeJsonFile(filePath: string, data: JsonObject): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true })

    const sortedData = sortKeys(data)

    await fs.writeFile(filePath, JSON.stringify(sortedData, null, 4) + '\n')
}

export async function download(config: LynguistConfig, preset: Preset): Promise<DownloadResult> {
    const token = resolveToken(config)
    const timeout = resolveTimeout()
    const translationsDir = config.translationsDir ?? 'lang'

    const response = await fetch('https://lynguist.com/api/translations', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(timeout),
    })

    if (!response.ok) {
        const body = await response.text().catch(() => '')

        throw new Error(`Download failed (${response.status}): ${body}`)
    }

    const data = (await response.json()) as { translations: Record<string, Record<string, string | null>> }
    const locales = Object.keys(data.translations)

    if (locales.length === 0) {
        throw new Error('No locales found in API response.')
    }

    const filesWritten: string[] = []
    let keysPerLocale = 0

    for (const locale of locales) {
        const flatTranslations = data.translations[locale]

        keysPerLocale = Object.keys(flatTranslations).length

        if ((config.fileStrategy ?? preset.fileStrategy) === 'single-file') {
            const nested = unflattenJson(flatTranslations)
            const filePath = path.resolve(translationsDir, `${locale}.json`)

            await writeJsonFile(filePath, nested)
            filesWritten.push(filePath)
        } else {
            const namespaces = groupByNamespace(flatTranslations)

            for (const [namespace, keys] of namespaces) {
                const nested = unflattenJson(keys)
                const filePath = path.resolve(translationsDir, locale, `${namespace}.json`)

                await writeJsonFile(filePath, nested)
                filesWritten.push(filePath)
            }
        }
    }

    return {
        success: true,
        localesDownloaded: locales,
        keysPerLocale,
        filesWritten,
    }
}

export type { DownloadResult } from './types.js'
