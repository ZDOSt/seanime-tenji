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
}

const EXTENSION_ID = "aiostreams-plugin"

function isObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value)
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
    const requestToken = React.useRef(0)
    const startOnlinePlayback = useStartOnlineStreamPlayback()

    React.useEffect(() => {
        const handleMessage = (message: WebsocketMessage) => {
            if (message.type !== "plugin" || !isObject(message.payload)) return
            if (message.payload.extensionId !== EXTENSION_ID || message.payload.type !== "webview:sync-state") return
            const payload = message.payload.payload
            if (!isObject(payload) || payload.key !== "state" || !isObject(payload.value)) return
            const state = payload.value as PluginState
            const requested = requestToken.current
            if (!requested || !open) return
            if (state.sessionId && state.sessionId !== String(requested)) {
                // The plugin's session ID is independent of the local request token.
                // Loading/results are still authoritative for the currently open picker.
            }
            if (Array.isArray(state.results)) setResults(state.results)
            if (typeof state.loading === "boolean") setLoading(state.loading)
            if (typeof state.error === "string" || state.error === null) setError(state.error ?? null)
        }
        return subscribeWsMessage(handleMessage)
    }, [open])

    const request = React.useCallback((episode: Anime_Episode): boolean => {
        if (!pluginAvailable || !entry.media) return false
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
                },
            },
        })
        if (!sent) return false
        requestToken.current = Date.now()
        pendingEpisode.current = episode
        setTitle(`${entry.media.title?.userPreferred ?? "AIOStreams"} · Episode ${episode.episodeNumber}`)
        setResults([])
        setError(null)
        setLoading(true)
        setOpen(true)
        return true
    }, [entry.media, pluginAvailable])

    const close = React.useCallback(() => {
        setOpen(false)
        setLoading(false)
        requestToken.current = 0
        pendingEpisode.current = null
    }, [])

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
