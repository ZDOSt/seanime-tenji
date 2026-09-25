import { sendWsMessage, subscribeWsMessage, type WebsocketMessage } from "@/api/components/websocket-hub"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import type { Anime_Entry, Anime_Episode, ExtensionRepo_PluginEpisodeTabExtensionItem } from "@/api/generated/types"
import { useServerQuery } from "@/api/client/requests"
import { useQueryClient } from "@tanstack/react-query"
import { useGetExtensionUserConfig, useSaveExtensionUserConfig } from "@/api/hooks/extensions.hooks"
import {
    AIOSTREAMS_EXTENSION_ID,
    AIOSTREAMS_SEARCH_ID_KEY,
    type AioStreamsIdMode,
    aioMergeSearchId,
    aioModeFromSearchId,
    aioOrderedModes,
} from "@/lib/player/aiostreams-mode"
import { getPlayerPreferences } from "@/lib/player/player-preferences"
import { openExternalPlayerURL } from "@/lib/player/external-players"
import { useStartOnlineStreamPlayback } from "@/lib/player"
import type { MobilePlaybackSource } from "@/lib/player/types"
import React from "react"
import { toast } from "@/lib/utils/toast"

export type AioStreamsResult = {
    infoHash?: string | null
    url?: string | null
    externalUrl?: string | null
    seeders?: number | null
    size?: number | null
    name?: string | null
    description?: string | null
    service?: string | null
    filename?: string | null
    folderName?: string | null
    cached?: boolean | null
    resolution?: string | null
    type: string
    magnetLink?: string | null
    fileIdx?: number | null
    bingeGroup?: string | null
}

type PluginState = {
    results?: AioStreamsResult[]
    loading?: boolean
    error?: string | null
    episodeInfo?: string
    sessionId?: string
    requestId?: string | null
}

const EXTENSION_ID = AIOSTREAMS_EXTENSION_ID

/**
 * How long to wait for the plugin's first usable state before giving up.
 * The plugin queries debrid providers for cached links; if nothing arrives
 * within this window the request is aborted so the picker never spins forever.
 */
export const AIOSTREAMS_REQUEST_TIMEOUT_MS = 45_000

/**
 * Saving the ID mode reloads the plugin server-side, so the re-selection can arrive before it is
 * listening again. These are the retry delays used when the plugin has not answered by then.
 */
const SWITCH_SETTLE_MS = 900
const SWITCH_RETRY_MS = 1_800
/** ~11 s of patience: the plugin is restarted by the setting change, which takes a moment. */
const SWITCH_MAX_ATTEMPTS = 6

function isObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value)
}

type PluginServerEvent = {
    extensionId?: unknown
    type?: unknown
    payload?: unknown
}

function visitPluginServerEvents(message: WebsocketMessage, visit: (event: PluginServerEvent) => void) {
    if (message.type !== "plugin" || !isObject(message.payload)) return

    const pluginEvent = message.payload as PluginServerEvent
    if (pluginEvent.type === "plugin:batch-events" && isObject(pluginEvent.payload)) {
        const events = pluginEvent.payload.events
        if (Array.isArray(events)) {
            for (const event of events) {
                if (isObject(event)) visit(event as PluginServerEvent)
            }
        }
        return
    }

    visit(pluginEvent)
}

export function useAioStreamsPluginController(entry: Anime_Entry) {
    const { data: tabs } = useServerQuery<ExtensionRepo_PluginEpisodeTabExtensionItem[]>({
        endpoint: API_ENDPOINTS.EXTENSIONS.ListAnimeEntryEpisodeTabExtensions.endpoint,
        method: API_ENDPOINTS.EXTENSIONS.ListAnimeEntryEpisodeTabExtensions.methods[0],
        queryKey: [API_ENDPOINTS.EXTENSIONS.ListAnimeEntryEpisodeTabExtensions.key],
        enabled: true,
        staleTime: 30_000,
    })
    // The plugin is restarted whenever its config is saved (that is how the ID mode is switched),
    // so its episode tab disappears from this list for a moment. Once it has been seen, treat it as
    // available for the rest of the session: otherwise the UI claims AIOStreams is gone mid-switch.
    const seenAvailableRef = React.useRef(false)
    if (tabs?.some(tab => tab.id === EXTENSION_ID)) seenAvailableRef.current = true
    const pluginAvailable = !!tabs?.some(tab => tab.id === EXTENSION_ID) || seenAvailableRef.current
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [results, setResults] = React.useState<AioStreamsResult[]>([])
    const [error, setError] = React.useState<string | null>(null)
    const [title, setTitle] = React.useState("AIOStreams")
    const pendingEpisode = React.useRef<Anime_Episode | null>(null)
    const requestToken = React.useRef<string | null>(null)
    const requestTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const startOnlinePlayback = useStartOnlineStreamPlayback()
    const queryClient = useQueryClient()

    // The plugin's own "Preferred Media ID" setting decides which ID it queries. The tabs below
    // change it the same way the Extensions page does, then ask for the episode again.
    const { data: userConfig } = useGetExtensionUserConfig(EXTENSION_ID)
    const { mutate: saveUserConfig, isPending: savingUserConfig } = useSaveExtensionUserConfig({ muteSuccessToast: true })
    const [switching, setSwitching] = React.useState(false)
    const [pendingMode, setPendingMode] = React.useState<AioStreamsIdMode | null>(null)
    const switchingRef = React.useRef(false)
    // When the episode was last re-asked; only a *meaningful* answer newer than this ends the switch.
    const rerunAtRef = React.useRef(0)
    // A state counts as an answer only if the plugin finished a search with something to show
    // (results or an error). Right after a restart the plugin re-syncs its webview state with an
    // empty list — treating that as an answer cancelled the retries and left the sheet empty.
    const answeredAtRef = React.useRef(0)

    const clearRequestTimeout = React.useCallback(() => {
        if (requestTimeout.current !== null) {
            clearTimeout(requestTimeout.current)
            requestTimeout.current = null
        }
    }, [])

    React.useEffect(() => {
        const handleMessage = (message: WebsocketMessage) => {
            visitPluginServerEvents(message, event => {
                if (event.extensionId !== EXTENSION_ID || event.type !== "webview:sync-state") return
                const payload = event.payload
                if (!isObject(payload) || payload.key !== "state" || !isObject(payload.value)) return
                const state = payload.value as PluginState
                const finished = typeof state.loading === "boolean" && !state.loading
                const hasAnswer = finished && ((state.results?.length ?? 0) > 0 || !!state.error)
                if (hasAnswer) {
                    answeredAtRef.current = Date.now()
                    if (switchingRef.current && answeredAtRef.current > rerunAtRef.current) {
                        switchingRef.current = false
                        setSwitching(false)
                    }
                }
                const requested = requestToken.current
                if (!requested) return
                // Official AIOStreams builds do not include request IDs. Accept
                // those states for compatibility, but enforce matching IDs when
                // a custom build provides one.
                if (state.requestId && state.requestId !== requested) return
                // While switching, ignore anything that is not an answer: the plugin restarts and
                // re-syncs an empty state, which used to blank the sheet mid-switch.
                if (switchingRef.current && !hasAnswer) return
                // The request settled: stop the timeout clock.
                if (typeof state.loading === "boolean" && !state.loading) clearRequestTimeout()
                if (Array.isArray(state.results)) setResults(state.results)
                if (typeof state.loading === "boolean") setLoading(state.loading)
                if (typeof state.error === "string" || state.error === null) setError(state.error ?? null)
            })
        }
        const unsubscribe = subscribeWsMessage(handleMessage)
        return () => {
            unsubscribe()
            clearRequestTimeout()
        }
    }, [clearRequestTimeout])

    /**
     * The plugin resolves the anime for a selected episode like this:
     *
     *   if (episode?.baseAnime) anime = episode.baseAnime
     *   else if (mediaId) anime = (await ctx.anime.getAnimeEntry(mediaId))?.media ?? $anilist.getAnime(mediaId)
     *   if (!anime) { toast.error("AIOStreams: Could not identify anime"); return }
     *
     * Right after it is restarted (which is what switching the ID does) those caches are cold, so the
     * fallback can come back empty and the plugin silently never searches. Sending the base anime we
     * already have takes the first branch and removes that dependency.
     */
    const withBaseAnime = React.useCallback((episode: Anime_Episode): Anime_Episode => {
        const media = entry.media
        if (!media || (episode as any)?.baseAnime) return episode
        return { ...episode, baseAnime: media } as Anime_Episode
    }, [entry.media])

    const request = React.useCallback((episode: Anime_Episode, options?: { skipAvailabilityCheck?: boolean }): boolean => {
        if (!entry.media) return false
        // The switch path re-asks while the plugin is reloading, so it must not be gated on the
        // plugin still being listed as an episode-tab extension.
        if (!pluginAvailable && !options?.skipAvailabilityCheck) return false
        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
        requestToken.current = requestId
        pendingEpisode.current = episode
        setTitle(`${entry.media.title?.userPreferred ?? "AIOStreams"} · Episode ${episode.episodeNumber}`)
        setResults([])
        setError(null)
        setLoading(true)
        setOpen(true)

        const sent = sendWsMessage({
            type: "plugin",
            payload: {
                extensionId: EXTENSION_ID,
                type: "anime:entry-episode-tab:select-episode",
                payload: {
                    mediaId: entry.media.id,
                    episodeNumber: episode.episodeNumber,
                    aniDbEpisode: episode.aniDBEpisode,
                    episode: withBaseAnime(episode),
                    requestId,
                },
            },
        })
        if (!sent) {
            setOpen(false)
            setLoading(false)
            requestToken.current = null
            pendingEpisode.current = null
            return false
        }

        if (options?.skipAvailabilityCheck) rerunAtRef.current = Date.now()

        // If the plugin never answers, stop waiting and surface an error
        // instead of leaving the picker spinning forever.
        clearRequestTimeout()
        requestTimeout.current = setTimeout(() => {
            if (requestToken.current !== requestId) return
            const message = `AIOStreams did not respond within ${Math.round(AIOSTREAMS_REQUEST_TIMEOUT_MS / 1000)} seconds. Please try again.`
            requestToken.current = null
            pendingEpisode.current = null
            setOpen(false)
            setLoading(false)
            setError(message)
            toast.error(message)
        }, AIOSTREAMS_REQUEST_TIMEOUT_MS)
        return true
    }, [entry.media, pluginAvailable, clearRequestTimeout, withBaseAnime])

    const configuredMode = aioModeFromSearchId(
        (userConfig?.savedUserConfig?.values as Record<string, string> | undefined)?.[AIOSTREAMS_SEARCH_ID_KEY],
    )
    const configValues = userConfig?.savedUserConfig?.values as Record<string, string> | undefined
    const configVersion = userConfig?.userConfig?.version ?? 1
    const activeMode = pendingMode ?? configuredMode
    const modes = aioOrderedModes(configuredMode)

    // The tab keeps showing the mode being switched to until the plugin's own config confirms it,
    // so it cannot snap back to the old one while the plugin is restarting.
    React.useEffect(() => {
        if (pendingMode && configuredMode === pendingMode) setPendingMode(null)
    }, [configuredMode, pendingMode])

    /**
     * Switches the plugin to the other media ID and asks for the same episode again, so the results
     * come back for the ID that resolves this anime correctly.
     */
    const switchMode = React.useCallback((mode: AioStreamsIdMode) => {
        if (switchingRef.current || savingUserConfig) return
        if (mode === configuredMode) return

        const episode = pendingEpisode.current
        // Retries keep going until the plugin actually answers the *new* mode; an empty state from
        // its restart must not count.
        const settled = () => answeredAtRef.current > rerunAtRef.current

        switchingRef.current = true
        setSwitching(true)
        setPendingMode(mode)

        saveUserConfig({
            id: EXTENSION_ID,
            version: configVersion,
            values: aioMergeSearchId(configValues, mode),
        }, {
            onSettled: () => {
                // the plugin has been restarted by the save: refresh its config so the tab shows
                // the mode the plugin now reports, not the stale one
                void queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.EXTENSIONS.GetExtensionUserConfig.key, EXTENSION_ID] })
                if (!episode) {
                    switchingRef.current = false
                    setSwitching(false)
                    return
                }
                // Keep re-asking until the plugin answers for the new mode. The first attempts
                // usually land while it is still restarting, so a single re-ask was not enough.
                let attempt = 0
                const rerun = () => {
                    if (settled()) return
                    if (attempt >= SWITCH_MAX_ATTEMPTS) {
                        switchingRef.current = false
                        setSwitching(false)
                        const message = "The AIOStreams plugin did not answer after switching the ID. Please try again."
                        setLoading(false)
                        setError(message)
                        toast.error(message)
                        return
                    }
                    attempt += 1
                    request(episode, { skipAvailabilityCheck: true })
                    setTimeout(rerun, SWITCH_RETRY_MS)
                }
                setTimeout(rerun, SWITCH_SETTLE_MS)
            },
        })
    }, [configuredMode, configValues, configVersion, request, saveUserConfig, savingUserConfig])

    const close = React.useCallback(() => {
        switchingRef.current = false
        setSwitching(false)
        setPendingMode(null)
        clearRequestTimeout()
        setOpen(false)
        setLoading(false)
        requestToken.current = null
        pendingEpisode.current = null
    }, [clearRequestTimeout])

    const select = React.useCallback((result: AioStreamsResult, onP2P?: (result: AioStreamsResult, episode: Anime_Episode) => void) => {
        const episode = pendingEpisode.current
        const media = entry.media
        if (!episode || !media) return
        if (result.type === "p2p") {
            if (onP2P) onP2P(result, episode)
            else toast.error("AIOStreams torrent playback is unavailable")
            return
        }
        if (!result.url) {
            toast.error("AIOStreams returned no playable URL")
            return
        }
        const source: MobilePlaybackSource = {
            id: `aiostreams-${media.id}-${episode.episodeNumber}-${Date.now()}`,
            streamKind: "http",
            url: result.url,
            mediaId: media.id,
            episodeNumber: episode.episodeNumber,
            media,
            episode,
            entryListData: entry.listData ?? undefined,
            entryView: "torrentstream",
            continuityKind: "external_player",
        }
        close()
        const prefs = getPlayerPreferences()
        if (prefs.externalPlayerTemplate) {
            void openExternalPlayerURL(prefs.externalPlayerTemplate, result.url).then(opened => {
                if (!opened) startOnlinePlayback(source)
            })
        } else {
            startOnlinePlayback(source)
        }
    }, [close, entry.listData, entry.media, startOnlinePlayback])

    return {
        available: pluginAvailable,
        open,
        loading,
        results,
        error,
        title,
        request,
        close,
        select,
        // Kitsu / IMDb tabs
        mode: activeMode,
        modes,
        switching: switching || savingUserConfig,
        switchMode,
    }
}
