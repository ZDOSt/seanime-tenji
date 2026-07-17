import { atom } from "jotai"
import type { AnimeEntryLaunchView } from "@/lib/player/types"

export type AnimeEntryPlaybackIntentKind =
    | "play-local-episode"
    | "torrentstream-auto-select"
    | "torrentstream-previous-batch"
    | "debridstream-auto-select"
    | "debridstream-previous-batch"
    | "onlinestream-play"

export type AnimeEntryPlaybackIntent = {
    id: string
    mediaId: number
    episodeNumber: number
    kind: AnimeEntryPlaybackIntentKind
}

export const animeEntryPlaybackIntentAtom = atom<AnimeEntryPlaybackIntent | null>(null)

export type TVReturnFocus = {
    mediaId: number
    episodeNumber: number
    view?: AnimeEntryLaunchView
}

export const tvReturnFocusAtom = atom<TVReturnFocus | null>(null)

export function createAnimeEntryPlaybackIntent(intent: Omit<AnimeEntryPlaybackIntent, "id">): AnimeEntryPlaybackIntent {
    return {
        ...intent,
        id: `${intent.kind}-${intent.mediaId}-${intent.episodeNumber}-${Date.now()}`,
    }
}
