export { download } from '@/downloader'
export type { DownloadResult } from '@/downloader/types'
export { merge } from '@/merger'
export type { MergeOptions, MergeResult } from '@/merger/types'
export {
    getPreset,
    nextIntlPreset,
    reactI18nextPreset,
    reactIntlPreset,
    svelteI18nPreset,
    vueI18nPreset,
} from '@/presets'
export type { NamespaceHook, Preset } from '@/presets/types'
export { extractFromCode, scan } from '@/scanner'
export type { ExtractionResult, ScanOptions, ScanResult } from '@/scanner/types'
export { upload } from '@/uploader'
export type { UploadResult } from '@/uploader/types'
