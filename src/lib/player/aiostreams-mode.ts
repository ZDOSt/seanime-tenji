/**
 * Kitsu / IMDb mode switching for the AIOStreams plugin (Tenji).
 *
 * The plugin resolves one media ID per request, chosen by its own "Preferred Media ID" user config
 * (`searchId`). Some anime resolve badly through Kitsu — a sequel whose season shares its IMDb/TVDB
 * entry comes back as the previous season — which is why the ID used to have to be changed by hand
 * in the Extensions page, per anime.
 *
 * The tabs simply do that change for you: the plugin is never modified, its setting is switched and
 * the episode is selected again, so it re-queries with the other ID. One ID at a time, exactly as
 * before.
 */

export type AioStreamsIdMode = "kitsu" | "imdb"

export const AIOSTREAMS_EXTENSION_ID = "aiostreams-plugin"

/** The plugin's user-config key for the ID preference. */
export const AIOSTREAMS_SEARCH_ID_KEY = "searchId"

/** Mirrors the plugin's own default (`$getUserPreference("searchId") ?? "imdbId"`). */
export function aioModeFromSearchId(searchId: string | null | undefined): AioStreamsIdMode {
    return searchId === "kitsuId" ? "kitsu" : "imdb"
}

export function aioSearchIdFromMode(mode: AioStreamsIdMode): string {
    return mode === "kitsu" ? "kitsuId" : "imdbId"
}

export function aioModeLabel(mode: AioStreamsIdMode): string {
    return mode === "kitsu" ? "Kitsu" : "IMDb"
}

/** The configured mode first, so the tab order matches the user's own default. */
export function aioOrderedModes(defaultMode: AioStreamsIdMode): AioStreamsIdMode[] {
    return defaultMode === "kitsu" ? ["kitsu", "imdb"] : ["imdb", "kitsu"]
}

export function aioOtherMode(mode: AioStreamsIdMode): AioStreamsIdMode {
    return mode === "kitsu" ? "imdb" : "kitsu"
}

/**
 * The plugin requires the complete value map, so the current one is preserved and only the ID
 * preference is replaced.
 */
export function aioMergeSearchId(
    currentValues: Record<string, string> | null | undefined,
    mode: AioStreamsIdMode,
): Record<string, string> {
    return {
        ...(currentValues ?? {}),
        [AIOSTREAMS_SEARCH_ID_KEY]: aioSearchIdFromMode(mode),
    }
}

/** Title shown on the switch row while the plugin is re-running the search. */
export function aioSwitchLabel(mode: AioStreamsIdMode, switching: boolean, active: boolean): string {
    if (switching && active) return `${aioModeLabel(mode)} · switching…`
    return aioModeLabel(mode)
}
