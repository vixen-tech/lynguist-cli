#!/usr/bin/env node
import { loadConfig } from '@/config'
import { merge } from '@/merger'
import { getPreset } from '@/presets'
import { scan } from '@/scanner'
import { upload } from '@/uploader'
import cac from 'cac'

const cli = cac('lynguist')

function printKeys(keys: { key: string; namespace?: string; file: string; line: number }[]) {
    for (const key of keys) {
        const ns = key.namespace ? `${key.namespace}.` : ''

        console.log(`  ${ns}${key.key}  (${key.file}:${key.line})`)
    }
}

async function scanAndMerge(options: { write?: boolean; prune?: boolean }) {
    const config = await loadConfig()

    const result = await scan({
        sourceDir: config.sourceDir,
        preset: config.preset,
        extensions: config.extensions,
        excludedDirs: config.excludedDirs,
        functions: config.functions,
    })

    console.log(`Scanned ${result.scannedFiles} files`)
    console.log(`Found ${result.keys.length} translation keys:\n`)

    printKeys(result.keys)

    if (options.write) {
        const preset = getPreset(config.preset)
        const mergeResult = await merge(result.keys, config, preset, { prune: options.prune })

        console.log()
        console.log(`Wrote ${mergeResult.filesWritten.length} file(s)`)
        console.log(`  Added: ${mergeResult.added}`)
        console.log(`  Preserved: ${mergeResult.preserved}`)

        if (options.prune) {
            console.log(`  Pruned: ${mergeResult.pruned}`)
        }
    }
}

cli.command('scan', 'Extract translation keys from source files')
    .option('--write', 'Write keys to translation files')
    .option('--prune', 'Remove keys not found in source (requires --write)')
    .action(async (options: { write?: boolean; prune?: boolean }) => {
        if (options.prune && !options.write) {
            console.error('--prune requires --write')

            process.exit(1)
        }

        await scanAndMerge({ write: options.write, prune: options.prune })
    })

cli.command('merge', 'Scan and write keys to translation files')
    .option('--prune', 'Remove keys not found in source')
    .action(async (options: { prune?: boolean }) => {
        await scanAndMerge({ write: true, prune: options.prune })
    })

cli.command('upload', 'Upload translation files to Lynguist.com')
    .action(async () => {
        const config = await loadConfig()
        const preset = getPreset(config.preset)

        console.log('Uploading translations...')

        const result = await upload(config, preset)

        console.log(`Uploaded ${result.keysPerLocale} keys for ${result.localesUploaded.length} locale(s): ${result.localesUploaded.join(', ')}`)
    })

cli.command('sync', 'Scan, merge, and upload translations')
    .option('--prune', 'Remove keys not found in source')
    .action(async (options: { prune?: boolean }) => {
        await scanAndMerge({ write: true, prune: options.prune })

        const config = await loadConfig()
        const preset = getPreset(config.preset)

        console.log('\nUploading translations...')

        const result = await upload(config, preset)

        console.log(`Uploaded ${result.keysPerLocale} keys for ${result.localesUploaded.length} locale(s): ${result.localesUploaded.join(', ')}`)
    })

cli.help()
cli.version('0.1.0')
cli.parse()
