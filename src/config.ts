import fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export interface LynguistConfig {
    sourceDir: string
    translationsDir?: string
    locales?: string[]
    defaultLocale?: string
    preset: string
    extensions?: string[]
    excludedDirs?: string[]
    functions?: string[]
    fileStrategy?: 'single-file' | 'namespace-files'
    lynguist?: {
        apiKey?: string
    }
}

const CONFIG_FILES = ['lynguist.config.js', 'lynguist.config.json']

export async function loadConfig(cwd: string = process.cwd()): Promise<LynguistConfig> {
    for (const file of CONFIG_FILES) {
        const filePath = path.resolve(cwd, file)

        if (!fs.existsSync(filePath)) continue

        if (file.endsWith('.json')) {
            const content = await readFile(filePath, 'utf-8')

            return JSON.parse(content)
        }

        try {
            const mod = await import(pathToFileURL(filePath).href)

            return mod.default ?? mod
        } catch {
            throw new Error(`Failed to load ${file}.`)
        }
    }

    throw new Error('No config file found. Create a lynguist.config.js (or .json) in your project root.')
}
