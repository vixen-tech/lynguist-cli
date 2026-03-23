import type { LynguistConfig } from '@/config'

export function resolveToken(config: LynguistConfig): string {
    if (config.lynguist?.apiKey) return config.lynguist.apiKey

    const envToken = process.env.LYNGUIST_API_TOKEN

    if (envToken) return envToken

    throw new Error(
        'No API token found. Set `lynguist.apiKey` in your config or the LYNGUIST_API_TOKEN environment variable.',
    )
}

export function resolveTimeout(): number {
    const envTimeout = process.env.LYNGUIST_TIMEOUT

    if (envTimeout) {
        const parsed = Number(envTimeout)

        if (!Number.isNaN(parsed) && parsed > 0) return parsed
    }

    return 120_000
}
