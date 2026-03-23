export interface MergeOptions {
    prune?: boolean
}

export interface MergeResult {
    added: number
    preserved: number
    pruned: number
    filesWritten: string[]
}
