/**
 * Remembers where the user was in a list, so opening a show and coming back does not dump them at
 * the top of the screen.
 *
 * Two things are stored on purpose:
 *  - the **anime id** they opened, which is what really matters ("put me back on that show"), and
 *  - the scroll **offset**, used as a fallback when the show is no longer in the list (AniList
 *    reorders rows, an episode finishes, etc.).
 *
 * Kept module-level rather than in component state because the list is remounted when the screen
 * refetches (and even keyed by connectivity), which is the whole reason the position was lost.
 */

export type ListPosition = {
    /** The card the user opened, if any. */
    mediaId?: number
    /** Scroll offset to fall back to. */
    offset?: number
    /** Where each horizontal row was scrolled (one entry per row id). */
    rowOffsets?: Record<string, number>
    /** ms since epoch, used to expire stale entries. */
    at: number
}

const store = new Map<string, ListPosition>()

/** Positions older than this are ignored (a fresh start the next day feels right). */
export const LIST_MEMORY_TTL_MS = 12 * 60 * 60 * 1000

export function rememberListPosition(key: string, patch: Partial<Omit<ListPosition, "at">>, now = Date.now()): void {
    const previous = store.get(key)
    store.set(key, {
        mediaId: patch.mediaId ?? previous?.mediaId,
        offset: patch.offset ?? previous?.offset,
        rowOffsets: patch.rowOffsets ? { ...previous?.rowOffsets, ...patch.rowOffsets } : previous?.rowOffsets,
        at: now,
    })
}

export function recallListPosition(key: string, now = Date.now()): ListPosition | null {
    const entry = store.get(key)
    if (!entry) return null
    if (now - entry.at > LIST_MEMORY_TTL_MS) {
        store.delete(key)
        return null
    }
    return entry
}

export function forgetListPosition(key: string): void {
    store.delete(key)
}

/** Clears everything — used by tests only. */
export function __resetListMemory(): void {
    store.clear()
}
