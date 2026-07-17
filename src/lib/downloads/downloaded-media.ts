import type { AL_BaseAnime, AL_BaseManga } from "@/api/generated/types"

export type DownloadedMedia = {
    mediaId: number
    title: string
    coverImageUrl?: string
    downloadedCount: number
}

export function downloadedAnimeMedia(item: DownloadedMedia): AL_BaseAnime {
    return {
        id: item.mediaId,
        type: "ANIME",
        title: { userPreferred: item.title },
        coverImage: {
            extraLarge: item.coverImageUrl,
            large: item.coverImageUrl,
            medium: item.coverImageUrl,
        },
    }
}

export function downloadedMangaMedia(item: DownloadedMedia): AL_BaseManga {
    return {
        id: item.mediaId,
        type: "MANGA",
        title: { userPreferred: item.title },
        coverImage: {
            extraLarge: item.coverImageUrl,
            large: item.coverImageUrl,
            medium: item.coverImageUrl,
        },
    }
}
