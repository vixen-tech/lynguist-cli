/** A single extracted translation key */
export interface ExtractionResult {
    key: string
    namespace?: string
    file: string
    line: number
}

/** Options for the scan function */
export interface ScanOptions {
    sourceDir: string
    preset: string
    extensions?: string[]
    excludedDirs?: string[]
    functions?: string[]
}

/** Result of scanning a project */
export interface ScanResult {
    keys: ExtractionResult[]
    scannedFiles: number
}
