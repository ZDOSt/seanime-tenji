import type { EditAnilistListEntry_Variables } from "@/api/generated/endpoint.types"
import type {
    AL_FuzzyDateInput,
    AL_MediaListStatus,
    Anime_Entry,
    Manga_Entry,
} from "@/api/generated/types"

export type ListForm = {
    status: AL_MediaListStatus
    score: string
    progress: string
    startedAt: Date | null
    completedAt: Date | null
}

export const LIST_STATUS: Array<{ value: AL_MediaListStatus; label: string }> = [
    { value: "CURRENT", label: "Watching" },
    { value: "PLANNING", label: "Planning" },
    { value: "PAUSED", label: "Paused" },
    { value: "COMPLETED", label: "Completed" },
    { value: "DROPPED", label: "Dropped" },
    { value: "REPEATING", label: "Rewatching" },
]

export function parseListDate(value?: string) {
    if (!value) return null
    const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|T)/)
    if (!match) return null

    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const parsed = new Date(year, month - 1, day)

    if (
        parsed.getFullYear() !== year
        || parsed.getMonth() !== month - 1
        || parsed.getDate() !== day
    ) {
        return null
    }

    return parsed
}

export function fuzzyDate(value: Date | null): AL_FuzzyDateInput | undefined {
    if (!value) return undefined
    return {
        day: value.getDate(),
        month: value.getMonth() + 1,
        year: value.getFullYear(),
    }
}

export function listForm(entry?: Anime_Entry | Manga_Entry, notReleased = false): ListForm {
    return {
        status: notReleased ? "PLANNING" : (entry?.listData?.status ?? "PLANNING"),
        score: entry?.listData?.score ? String(entry.listData.score / 10) : "",
        progress: entry?.listData?.progress ? String(entry.listData.progress) : "",
        startedAt: parseListDate(entry?.listData?.startedAt),
        completedAt: parseListDate(entry?.listData?.completedAt),
    }
}

export function maxListProgress(entry: Anime_Entry | Manga_Entry | undefined, type: "anime" | "manga") {
    if (type === "anime") {
        const media = entry?.media as Anime_Entry["media"]
        return media?.nextAiringEpisode?.episode
            ? media.nextAiringEpisode.episode - 1
            : media?.episodes
    }

    return (entry?.media as Manga_Entry["media"])?.chapters
}

export function listPayload(
    entry: Anime_Entry | Manga_Entry,
    type: "anime" | "manga",
    form: ListForm,
    max?: number,
): EditAnilistListEntry_Variables {
    const rawScore = Number.parseFloat(form.score)
    const rawProgress = Number.parseInt(form.progress, 10)
    const score = Number.isNaN(rawScore)
        ? 0
        : Math.min(Math.max(Math.round(rawScore * 10), 0), 100)
    const progress = Number.isNaN(rawProgress)
        ? 0
        : Math.min(Math.max(rawProgress, 0), max ?? Number.MAX_SAFE_INTEGER)

    return {
        mediaId: entry.mediaId,
        type,
        status: form.status,
        score,
        progress,
        startedAt: fuzzyDate(form.startedAt),
        completedAt: fuzzyDate(form.completedAt),
    }
}

export function dateInput(value: Date | null) {
    if (!value) return ""
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, "0")
    const day = String(value.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}
