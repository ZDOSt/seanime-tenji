/**
 * Playback telemetry helpers.
 *
 * The native (mpv) player reports watch progress through the same continuity endpoint the
 * web player uses. Those reports are fire-and-forget, so the cadence is the only thing
 * keeping a long playback session from turning into a request flood.
 */

/** Minimum time between two continuity reports for one playback session. */
export const CONTINUITY_REPORT_INTERVAL_MS = 15_000

/**
 * Whether a continuity report may be sent at `nowMs`.
 *
 * A `null` timestamp means nothing has been reported yet, which is exactly the
 * session-start case and must always be allowed. A clock that moved backwards must not
 * stall reporting forever, so it is treated as "enough time has passed".
 */
export function shouldReportContinuityProgress(
    lastReportedAtMs: number | null,
    nowMs: number,
    intervalMs: number = CONTINUITY_REPORT_INTERVAL_MS,
): boolean {
    if (lastReportedAtMs === null) return true
    if (!Number.isFinite(lastReportedAtMs) || !Number.isFinite(nowMs)) return true
    if (nowMs < lastReportedAtMs) return true
    return nowMs - lastReportedAtMs >= intervalMs
}
