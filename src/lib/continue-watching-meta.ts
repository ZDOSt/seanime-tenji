import type { Anime_LibraryCollection } from "@/api/generated/types"

/**
 * Additive per-show info attached to the library collection response by newer servers.
 * Old servers omit `continueWatchingMeta` entirely, so everything here is optional.
 */
export type ContinueWatchingMeta = {
    /** A new episode became available and the user is caught up. */
    promoted?: boolean
    /** Unix seconds at which the next episode airs. */
    airsAt?: number
    /** Episode number the Continue Watching row points at. */
    nextEpisode?: number
}

export type ContinueWatchingMetaMap = Record<string, ContinueWatchingMeta | null | undefined>

export type AnimeLibraryCollectionWithContinueWatchingMeta = Anime_LibraryCollection & {
    continueWatchingMeta?: ContinueWatchingMetaMap | null
}

const EMPTY_CONTINUE_WATCHING_META: ContinueWatchingMetaMap = {}

/**
 * Reads the additive map from a collection response, tolerating servers that do not send it yet.
 * The returned object is stable for a missing field so it is safe to use as a memo dependency.
 */
export function getContinueWatchingMetaMap(
    collection: Anime_LibraryCollection | null | undefined,
): ContinueWatchingMetaMap {
    const meta = (collection as AnimeLibraryCollectionWithContinueWatchingMeta | null | undefined)?.continueWatchingMeta

    if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
        return EMPTY_CONTINUE_WATCHING_META
    }

    return meta
}

export type ContinueWatchingBadge = {
    label: string
    /** `true` for an episode that just became available; `false` for a future airing. */
    emphasized: boolean
}

const SECONDS_PER_DAY = 86400

/**
 * Derives the Continue Watching badge for one show.
 * Promoted wins over a scheduled airing; past airings and missing meta show nothing.
 */
export function getContinueWatchingBadge(
    meta: ContinueWatchingMeta | null | undefined,
    nowSeconds: number = Date.now() / 1000,
): ContinueWatchingBadge | null {
    if (!meta) return null

    if (meta.promoted === true) {
        return { label: "New episode", emphasized: true }
    }

    const airsAt = meta.airsAt
    if (typeof airsAt !== "number" || !Number.isFinite(airsAt)) return null

    const secondsUntilAir = airsAt - nowSeconds
    if (secondsUntilAir <= 0) return null

    const daysUntilAir = secondsUntilAir / SECONDS_PER_DAY

    return {
        label: daysUntilAir < 1 ? "Airs today" : `Airs in ${Math.round(daysUntilAir)}d`,
        emphasized: false,
    }
}
