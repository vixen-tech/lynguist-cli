import { getPreset } from '@/presets/index.js'
import fg from 'fast-glob'
import fs from 'node:fs/promises'
import path from 'node:path'
import { extractFromCode } from './extract.js'
import type { ScanOptions, ScanResult } from './types.js'

export async function scan(options: ScanOptions): Promise<ScanResult> {
    const preset = getPreset(options.preset)
    const extensions = options.extensions ?? preset.extensions

    const excludedDirs = options.excludedDirs ?? ['node_modules']
    const pattern = `**/*{${extensions.join(',')}}`
    const files = await fg(pattern, {
        cwd: options.sourceDir,
        absolute: true,
        ignore: excludedDirs.map(dir => `**/${dir}/**`),
    })

    const allKeys = []

    for (const file of files) {
        const code = await fs.readFile(file, 'utf-8')
        const relativePath = path.relative(options.sourceDir, file)

        try {
            const keys = extractFromCode(code, relativePath, preset)
            allKeys.push(...keys)
        } catch (err) {
            console.warn(`[lynguist] Failed to parse ${relativePath}, skipping`)
        }
    }

    return {
        keys: allKeys,
        scannedFiles: files.length,
    }
}

export { extractFromCode } from './extract.js'
export type { ExtractionResult, ScanOptions, ScanResult } from './types.js'
