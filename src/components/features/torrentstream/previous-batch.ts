export type BatchAction = "start" | "pick-file"

export function batchAction(autoFile: boolean, fileIndex: number | null): BatchAction {
    if (autoFile || fileIndex !== null) return "start"
    return "pick-file"
}
