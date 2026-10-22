import { getClientIdentity } from "@/api/client/client-identity"
import { useUpdateAnimeEntryProgress } from "@/api/hooks/anime_entries.hooks"
import { useUpdateContinuityWatchHistoryItem } from "@/api/hooks/continuity.hooks"
import { usePlaybackCancelManualTracking, usePlaybackStartManualTracking } from "@/api/hooks/playback_manager.hooks"
import { useIsServerConnected } from "@/lib/offline"
import { logger } from "@/lib/utils/logger"
import React from "react"
import { AppState, type AppStateStatus } from "react-native"
import { CONTINUITY_REPORT_INTERVAL_MS, shouldReportContinuityProgress } from "./continuity-report"
import type { MobilePlaybackSource, PlayerState } from "./types"

const log = logger("continuity-sync")

const COMPLETION_THRESHOLD = 0.85 // 85% watched = completed

export function useContinuitySync(
    source: MobilePlaybackSource | null,
    playerState: PlayerState,
) {
    const isConnected = useIsServerConnected()
    // Telemetry only: a failed report must never surface an error or interrupt playback.
    const { mutate: updateContinuity } = useUpdateContinuityWatchHistoryItem({ muteError: true })
    const { mutate: updateAnimeProgress } = useUpdateAnimeEntryProgress(source?.mediaId, source?.episodeNumber ?? 0, false)
    const { mutate: startManualTracking } = usePlaybackStartManualTracking()
    const { mutate: cancelManualTracking } = usePlaybackCancelManualTracking({})

    const hasSyncedCompletion = React.useRef(false)
    const lastReportedRef = React.useRef<{ sourceId: string; at: number } | null>(null)
    const latestRef = React.useRef({
        isConnected,
        source,
        currentTime: playerState.currentTime,
        duration: playerState.duration,
        updateContinuity,
    })
    latestRef.current = {
        isConnected,
        source,
        currentTime: playerState.currentTime,
        duration: playerState.duration,
        updateContinuity,
    }

    React.useEffect(() => {
        if (!isConnected || !source || source.serverStreamType || source.mediaId <= 0 || source.episodeNumber <= 0) return

        startManualTracking({
            mediaId: source.mediaId,
            episodeNumber: source.episodeNumber,
            clientId: getClientIdentity().clientId,
        })

        return () => {
            cancelManualTracking()
        }
    }, [cancelManualTracking, isConnected, source?.episodeNumber, source?.id, source?.mediaId, source?.serverStreamType, startManualTracking])

    const flushContinuity = React.useCallback(() => {
        const latest = latestRef.current
        if (!latest.isConnected || !latest.source || latest.duration <= 0) return false

        const activeSource = latest.source
        const now = Date.now()
        const lastReported = lastReportedRef.current
        // A different source starts a new playback session, so its start report is not
        // throttled by the previous session's last report.
        if (
            lastReported
            && lastReported.sourceId === activeSource.id
            && !shouldReportContinuityProgress(lastReported.at, now)
        ) return false
        lastReportedRef.current = { sourceId: activeSource.id, at: now }

        latest.updateContinuity({
            options: {
                currentTime: latest.currentTime,
                duration: latest.duration,
                mediaId: activeSource.mediaId,
                episodeNumber: activeSource.episodeNumber,
                filepath: activeSource.localFile?.path,
                kind: activeSource.continuityKind,
            },
        })
        return true
    }, [])

    const hasDuration = playerState.duration > 0

    // Reports on playback start (the first flush of a session), then once every
    // CONTINUITY_REPORT_INTERVAL_MS while playing. A source change is a new session, so its
    // first report is allowed immediately; everything else goes through the 15 s throttle.
    // The first report carries the player's position: 0 on a fresh start, the resume offset
    // otherwise (a literal 0 would clobber the server-side resume point).
    React.useEffect(() => {
        if (!isConnected || !source || playerState.paused || !hasDuration) return

        flushContinuity()

        const interval = setInterval(() => {
            flushContinuity()
        }, CONTINUITY_REPORT_INTERVAL_MS)

        return () => clearInterval(interval)
    }, [flushContinuity, hasDuration, isConnected, playerState.paused, source?.id])

    // Flush on pause
    React.useEffect(() => {
        if (playerState.paused && source && playerState.duration > 0) {
            flushContinuity()
        }
    }, [playerState.paused, source, playerState.duration, flushContinuity])

    // Flush on app background
    React.useEffect(() => {
        const handleAppState = (nextState: AppStateStatus) => {
            if (nextState === "background" || nextState === "inactive") {
                flushContinuity()
            }
        }

        const sub = AppState.addEventListener("change", handleAppState)
        return () => sub.remove()
    }, [flushContinuity])

    // Flush on unmount
    React.useEffect(() => {
        return () => {
            flushContinuity()
        }
    }, [flushContinuity])

    // Detect completion
    React.useEffect(() => {
        if (!source || playerState.duration <= 0 || hasSyncedCompletion.current) return

        const ratio = playerState.currentTime / playerState.duration

        if (ratio >= COMPLETION_THRESHOLD || playerState.eofReached) {
            hasSyncedCompletion.current = true
            log.info(`Episode completed (${Math.round(ratio * 100)}%), syncing progress`)

            updateAnimeProgress({
                mediaId: source.mediaId,
                malId: source.media?.idMal,
                episodeNumber: source.episodeNumber,
                totalEpisodes: source.media?.episodes || 0,
            })
        }
    }, [source, playerState.currentTime, playerState.duration, playerState.eofReached, updateAnimeProgress])

    // Reset completion flag when source changes
    React.useEffect(() => {
        hasSyncedCompletion.current = false
    }, [source?.id])

    return {
        flushContinuity,
    }
}
