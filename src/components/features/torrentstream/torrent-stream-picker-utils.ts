import type {
    DebridClient_FilePreview,
    HibikeTorrent_AnimeTorrent,
    Torrentstream_FilePreview,
} from "@/api/generated/types"

export type StreamFilePreview = Torrentstream_FilePreview | DebridClient_FilePreview

export function getFileSelectionValue(file: StreamFilePreview): string {
    return "fileId" in file ? file.fileId : String(file.index)
}

export function isSameTorrent(
    first: HibikeTorrent_AnimeTorrent | null | undefined,
    second: HibikeTorrent_AnimeTorrent | null | undefined,
): boolean {
    if (!first || !second) return false

    return first.infoHash === second.infoHash
        && first.downloadUrl === second.downloadUrl
}
