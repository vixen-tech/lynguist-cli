#!/usr/bin/env node
import { loadConfig } from '@/config'
import { scan } from '@/scanner'
import cac from 'cac'

const cli = cac('lynguist')

cli.command('scan', 'Extract translation keys from source files').action(async () => {
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

    for (const key of result.keys) {
        const ns = key.namespace ? `${key.namespace}.` : ''

        console.log(`  ${ns}${key.key}  (${key.file}:${key.line})`)
    }
})

cli.help()
cli.version('0.1.0')
cli.parse()
