import type { Status } from "@/api/generated/types"
import type { AnimeEntryView } from "@/components/features/media/anime-entry-view-switcher"
import { getDefaultPlaybackSource, isPluginPlaybackSource } from "@/lib/default-playback-source"

type ServerStatus = Status | null | undefined

export function tvEntryView(view: AnimeEntryView): AnimeEntryView {
    return view === "downloaded" ? "library" : view
}

export function autoEntryView(
    status: ServerStatus,
    hasLibrary: boolean,
): AnimeEntryView {
    if (hasLibrary) return "library"
    if (status?.debridSettings?.enabled) return "torrentstream"
    if (status?.torrentstreamSettings?.enabled) return "torrentstream"
    if (status?.settings?.library?.enableOnlinestream) return "onlinestream"
    return "library"
}

export function defaultEntryView(
    status: ServerStatus,
    hasLibrary: boolean,
): AnimeEntryView {
    const source = getDefaultPlaybackSource(status)

    if (!isPluginPlaybackSource(source)) {
        if (source === "library") return "library"
        if (source === "debridstream" && status?.debridSettings?.enabled) {
            return "torrentstream"
        }
        if (source === "torrentstream" && status?.torrentstreamSettings?.enabled) return "torrentstream"
        if (source === "onlinestream" && status?.settings?.library?.enableOnlinestream) return "onlinestream"
    }

    return autoEntryView(status, hasLibrary)
}
