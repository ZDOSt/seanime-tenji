import type {
    AL_BaseAnime,
    AL_BaseManga,
    Anime_EntryLibraryData,
    Anime_EntryListData,
    Anime_NakamaEntryLibraryData,
} from "@/api/generated/types"

type BaseMedia = AL_BaseAnime | AL_BaseManga

export function mediaTitle(media?: BaseMedia) {
    return media?.title?.userPreferred
        ?? media?.title?.english
        ?? media?.title?.romaji
        ?? "Untitled"
}

export function altTitle(media?: BaseMedia) {
    const preferred = media?.title?.userPreferred
    const english = media?.title?.english
    const romaji = media?.title?.romaji

    if (preferred?.toLowerCase() === english?.toLowerCase()) {
        return romaji === preferred ? undefined : romaji
    }
    if (preferred?.toLowerCase() === romaji?.toLowerCase()) {
        return english === preferred ? undefined : english
    }

    return undefined
}

export function cleanHtml(value?: string, breaks = false) {
    if (!value) return ""

    const clean = value
        .replace(/<br\s*\/?>/gi, breaks ? "\n" : " ")
        .replace(/<[^>]*>/g, "")
        .replace(/&quot;/g, "\"")
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, "&")

    if (!breaks) return clean.replace(/\s+/g, " ").trim()

    return clean
        .replace(/[^\S\r\n]+/g, " ")
        .replace(/ *\n */g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}

export function animeCount(media: AL_BaseAnime) {
    const next = media.nextAiringEpisode?.episode
    return next ? Math.max(0, next - 1) : (media.episodes ?? 0)
}

export function animeCardStats(
    media: AL_BaseAnime,
    list?: Anime_EntryListData,
    library?: Anime_EntryLibraryData,
    nakama?: Anime_NakamaEntryLibraryData,
    showUnwatched = true,
) {
    const progress = list?.progress ?? 0
    const files = nakama?.mainFileCount ?? library?.mainFileCount ?? 0
    const libraryUnwatched = nakama?.unwatchedCount ?? library?.unwatchedCount ?? 0
    const streamUnwatched = Math.max(0, animeCount(media) - progress)
    const unwatched = files > 0 ? libraryUnwatched : streamUnwatched
    const active = list?.status === "CURRENT" || list?.status === "REPEATING"

    return {
        progress,
        total: media.episodes,
        files,
        unwatched: showUnwatched && active ? unwatched : 0,
    }
}

export function scoreColor(score: number) {
    if (score < 60) return "#fca5a5"
    if (score < 70) return "#fde68a"
    if (score < 82) return "#86efac"
    return "#a5b4fc"
}

export function scoreBg(score: number) {
    if (score < 30) return "#ef4444"
    if (score < 60) return "#92400e"
    if (score < 70) return "#3f6212"
    if (score < 82) return "#065f46"
    return "#4f46e5"
}

const ANIME_STATUS: Record<string, string> = {
    CURRENT: "Watching",
    PLANNING: "Planning",
    COMPLETED: "Completed",
    DROPPED: "Dropped",
    PAUSED: "Paused",
    REPEATING: "Rewatching",
}

export function listStatus(status?: string) {
    return status ? ANIME_STATUS[status] : undefined
}

export function startLabel(media?: BaseMedia) {
    const start = media?.startDate
    if (!start?.year) return undefined

    const date = new Date(start.year, (start.month ?? 1) - 1)
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
    }).format(date)
}
