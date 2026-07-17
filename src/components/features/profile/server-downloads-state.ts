import type { TorrentClient_Torrent } from "@/api/generated/types"

export type DownloadQueueViewState = "loading" | "error" | "empty" | "content"

type DownloadQueueViewStateInput = {
    hasData: boolean
    isError: boolean
    isRefetchError: boolean
    isSuccess: boolean
    itemCount: number
}

export function getDownloadQueueViewState({
    hasData,
    isError,
    isRefetchError,
    isSuccess,
    itemCount,
}: DownloadQueueViewStateInput): DownloadQueueViewState {
    if (!hasData) {
        if (isError || isRefetchError) return "error"
        return isSuccess ? "empty" : "loading"
    }

    if (isRefetchError && itemCount === 0) {
        return "error"
    }

    return itemCount === 0 ? "empty" : "content"
}

export function shouldShowQueueRefreshWarning(viewState: DownloadQueueViewState, isRefetchError: boolean): boolean {
    return viewState === "content" && isRefetchError
}

export function keepTorrent(torrent: Pick<TorrentClient_Torrent, "progress" | "status">): boolean {
    const isComplete = torrent.progress >= 1
    const isPaused = torrent.status === "paused" || torrent.status === "stopped"
    return !(isComplete && isPaused)
}
