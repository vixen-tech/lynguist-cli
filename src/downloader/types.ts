export interface DownloadResult {
    success: boolean
    localesDownloaded: string[]
    keysPerLocale: number
    filesWritten: string[]
}
