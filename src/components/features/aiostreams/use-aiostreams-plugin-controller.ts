import { sendWsMessage, subscribeWsMessage, type WebsocketMessage } from "@/api/components/websocket-hub"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import type { Anime_Entry, Anime_Episode, ExtensionRepo_PluginEpisodeTabExtensionItem } from "@/api/generated/types"
import { useServerQuery } from "@/api/client/requests"
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

const EXTENSION_ID = "aiostreams-plugin"

/**
 * How long to wait for the plugin's first usable state before giving up.
 * The plugin queries debrid providers for cached links; if nothing arrives
 * within this window the request is aborted so the picker never spins forever.
 */
export const AIOSTREAMS_REQUEST_TIMEOUT_MS = 45_000

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
    const pluginAvailable = !!tabs?.some(tab => tab.id === EXTENSION_ID)
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [results, setResults] = React.useState<AioStreamsResult[]>([])
    const [error, setError] = React.useState<string | null>(null)
    const [title, setTitle] = React.useState("AIOStreams")
    const pendingEpisode = React.useRef<Anime_Episode | null>(null)
    const requestToken = React.useRef<string | null>(null)
    const requestTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const startOnlinePlayback = useStartOnlineStreamPlayback()

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
                const requested = requestToken.current
                if (!requested) return
                // Official AIOStreams builds do not include request IDs. Accept
                // those states for compatibility, but enforce matching IDs when
                // a custom build provides one.
                if (state.requestId && state.requestId !== requested) return
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

    const request = React.useCallback((episode: Anime_Episode): boolean => {
        if (!pluginAvailable || !entry.media) return false
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
                    episode,
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

        // If the plugin never answers, stop waiting and surface an error
        // instead of leaving the picker spinning forever.
        clearRequestTimeout()
        requestTimeout.current = setTimeout(() => {
            if (requestToken.current !== requestId) return
            requestToken.current = null
            pendingEpisode.current = null
            setOpen(false)
            setLoading(false)
            setError(`AIOStreams did not respond within ${Math.round(AIOSTREAMS_REQUEST_TIMEOUT_MS / 1000)} seconds. Please try again.`)
            toast.error(`AIOStreams did not respond within ${Math.round(AIOSTREAMS_REQUEST_TIMEOUT_MS / 1000)} seconds. Please try again.`)
        }, AIOSTREAMS_REQUEST_TIMEOUT_MS)
        return true
    }, [entry.media, pluginAvailable, clearRequestTimeout])

    const close = React.useCallback(() => {
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

    return { available: pluginAvailable, open, loading, results, error, title, request, close, select }
}
