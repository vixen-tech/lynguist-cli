import type { LynguistConfig } from '@/config'
import type { Preset } from '@/presets/types'
import type { ExtractionResult } from '@/scanner/types'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { MergeOptions, MergeResult } from './types.js'

type JsonObject = Record<string, unknown>

async function readJsonFile(filePath: string): Promise<JsonObject> {
    try {
        const content = await fs.readFile(filePath, 'utf-8')

        return JSON.parse(content)
    } catch {
        return {}
    }
}

async function writeJsonFile(filePath: string, data: JsonObject): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true })

    const sortedData = sortKeys(data)

    await fs.writeFile(filePath, JSON.stringify(sortedData, null, 4) + '\n')
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

function setNested(obj: JsonObject, segments: string[], value: unknown): void {
    let current = obj

    for (let i = 0; i < segments.length - 1; i++) {
        const seg = segments[i]

        if (typeof current[seg] !== 'object' || current[seg] === null) {
            current[seg] = {}
        }

        current = current[seg] as JsonObject
    }

    current[segments[segments.length - 1]] = value
}

function getNested(obj: JsonObject, segments: string[]): unknown {
    let current: unknown = obj

    for (const seg of segments) {
        if (typeof current !== 'object' || current === null) return undefined

        current = (current as JsonObject)[seg]
    }

    return current
}

function collectLeafPaths(obj: JsonObject, prefix: string[] = []): string[][] {
    const paths: string[][] = []

    for (const key of Object.keys(obj)) {
        const value = obj[key]
        const segments = [...prefix, key]

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            paths.push(...collectLeafPaths(value as JsonObject, segments))
        } else {
            paths.push(segments)
        }
    }

    return paths
}

function groupKeysByNamespace(keys: ExtractionResult[]): Map<string | undefined, Set<string>> {
    const grouped = new Map<string | undefined, Set<string>>()

    for (const key of keys) {
        const ns = key.namespace
        let set = grouped.get(ns)

        if (!set) {
            set = new Set()
            grouped.set(ns, set)
        }

        set.add(key.key)
    }

    return grouped
}

function mergeSingleFile(
    existing: JsonObject,
    keys: ExtractionResult[],
    prune: boolean,
): { data: JsonObject; added: number; preserved: number; pruned: number } {
    const data: JsonObject = {}
    let added = 0
    let preserved = 0
    let pruned = 0

    // Build full dot-paths from scanned keys
    const scannedPaths = new Set<string>()

    for (const key of keys) {
        const fullPath = key.namespace ? `${key.namespace}.${key.key}` : key.key

        scannedPaths.add(fullPath)
    }

    // Add/preserve scanned keys
    for (const pathStr of scannedPaths) {
        const segments = pathStr.split('.')
        const existingValue = getNested(existing, segments)

        if (existingValue !== undefined && existingValue !== null && existingValue !== '' && typeof existingValue !== 'object') {
            setNested(data, segments, existingValue)
            preserved++
        } else if (existingValue === null || existingValue === '') {
            setNested(data, segments, null)
            preserved++
        } else {
            setNested(data, segments, null)
            added++
        }
    }

    // Handle existing keys not in scanned set
    const existingLeafPaths = collectLeafPaths(existing)

    for (const segments of existingLeafPaths) {
        const pathStr = segments.join('.')

        if (scannedPaths.has(pathStr)) continue

        if (!prune) {
            // Don't overwrite an object created by scanned keys with a scalar
            const current = getNested(data, segments)

            if (typeof current === 'object' && current !== null) continue

            setNested(data, segments, getNested(existing, segments))
            preserved++
        } else {
            pruned++
        }
    }

    return { data, added, preserved, pruned }
}

function mergeFlat(
    existing: JsonObject,
    keys: Set<string>,
    prune: boolean,
): { data: JsonObject; added: number; preserved: number; pruned: number } {
    const data: JsonObject = {}
    let added = 0
    let preserved = 0
    let pruned = 0

    for (const key of keys) {
        const existingValue = existing[key]

        if (existingValue !== undefined && existingValue !== null && existingValue !== '') {
            data[key] = existingValue
            preserved++
        } else if (existingValue === null || existingValue === '') {
            data[key] = null
            preserved++
        } else {
            data[key] = null
            added++
        }
    }

    if (!prune) {
        for (const key of Object.keys(existing)) {
            if (!keys.has(key)) {
                data[key] = existing[key]
                preserved++
            }
        }
    } else {
        for (const key of Object.keys(existing)) {
            if (!keys.has(key)) {
                pruned++
            }
        }
    }

    return { data, added, preserved, pruned }
}

export async function merge(
    keys: ExtractionResult[],
    config: LynguistConfig,
    preset: Preset,
    options: MergeOptions = {},
): Promise<MergeResult> {
    const translationsDir = config.translationsDir ?? 'lang'
    const locales = config.locales ?? []
    const prune = options.prune ?? false

    if (locales.length === 0) {
        throw new Error('No locales configured. Add `locales` to your Lynguist config.')
    }

    const result: MergeResult = { added: 0, preserved: 0, pruned: 0, filesWritten: [] }
    const grouped = groupKeysByNamespace(keys)

    for (const locale of locales) {
        if ((config.fileStrategy ?? preset.fileStrategy) === 'single-file') {
            const filePath = path.resolve(translationsDir, `${locale}.json`)
            const existing = await readJsonFile(filePath)
            const merged = mergeSingleFile(existing, keys, prune)

            await writeJsonFile(filePath, merged.data)

            result.added += merged.added
            result.preserved += merged.preserved
            result.pruned += merged.pruned
            result.filesWritten.push(filePath)
        } else {
            const allNamespaces = new Set<string>()

            for (const ns of grouped.keys()) {
                allNamespaces.add(ns ?? 'default')
            }

            if (!prune) {
                try {
                    const localeDir = path.resolve(translationsDir, locale)
                    const entries = await fs.readdir(localeDir)

                    for (const entry of entries) {
                        if (entry.endsWith('.json')) {
                            allNamespaces.add(entry.replace('.json', ''))
                        }
                    }
                } catch {
                    // Directory doesn't exist yet
                }
            }

            for (const ns of allNamespaces) {
                const filePath = path.resolve(translationsDir, locale, `${ns}.json`)
                const existing = await readJsonFile(filePath)

                const originalNs = ns === 'default' ? undefined : ns
                const scannedKeys = grouped.get(originalNs) ?? new Set<string>()
                const merged = mergeFlat(existing, scannedKeys, prune)

                await writeJsonFile(filePath, merged.data)

                result.added += merged.added
                result.preserved += merged.preserved
                result.pruned += merged.pruned
                result.filesWritten.push(filePath)
            }
        }
    }

    return result
}

export type { MergeOptions, MergeResult } from './types.js'
