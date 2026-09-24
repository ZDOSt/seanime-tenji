/**
 * Pure rules for handing a stream URL to an external player (Android/TV, iOS).
 *
 * Kept free of React Native and native-module imports so the rules can be unit-tested with
 * the repo's plain-Node test runner (`node --test tests/*.test.ts`) — the external handoff
 * cannot be exercised in this container, so at least its decisions are covered.
 *
 * Background: on the TV build, pressing play with an external player configured opened mpv
 * and then nothing loaded. The handoff passed the stream URL straight to the player with no
 * way to tell whether it was ever playable there. These rules add that check.
 */

export type HandoffVerdict =
    /** Hand the URL to the external player. */
    | "handoff"
    /** The URL points at this device's own loopback while the server lives elsewhere. */
    | "blocked-loopback"
    /** No external player configured. */
    | "no-template"
    /** The stream only plays with HTTP headers (referer etc.) that another app cannot receive. */
    | "blocked-headers"
    /** Nothing usable to hand over. */
    | "empty-url"

export type HandoffProbe = {
    /** HTTP status, or null when the request never completed. */
    status: number | null
    /** True when the player is guaranteed to fail (no credentials on its side). */
    blocked: boolean
}

/** Extracts `package=` from an `intent://…#Intent;package=…;end` template. */
export function getExternalPlayerPackageName(template: string): string | null {
    const match = /(?:^|;)package=([^;]+)/.exec(template)
    return match?.[1] ?? null
}

/**
 * Build the final URL for `Linking.openURL` (iOS and any non-Android target).
 *
 * intent:// URLs cannot contain the scheme of the embedded URL twice, so the `http(s)://`
 * prefix is stripped and the `scheme=` hint is corrected to match the stream.
 */
export function getExternalPlayerURL(template: string, streamUrl: string): string {
    let result = template.includes("{url}")
        ? template.replace("{url}", streamUrl)
        : streamUrl

    if (template.startsWith("intent://")) {
        const scheme = streamUrl.startsWith("https://") ? "https" : "http"
        result = result
            .replace("intent://http://", "intent://")
            .replace("intent://https://", "intent://")
            .replace("scheme=http;", `scheme=${scheme};`)
    }

    return result
}

/** True for URLs that only resolve on the device that runs the server. */
export function isLoopbackUrl(url: string): boolean {
    // the host is either a bracketed IPv6 literal or everything up to the port/path
    const match = /^https?:\/\/(\[[^\]]+\]|[^/:?#]+)/i.exec(url.trim())
    if (!match) return false

    const host = match[1].toLowerCase()
    return host === "localhost"
        || host === "127.0.0.1"
        || host === "::1"
        || host === "[::1]"
        || host.endsWith(".localhost")
}

export function decideExternalHandoff(params: {
    url: string | null | undefined
    template: string | null | undefined
    /** True when this device also runs the Seanime server (offline/loopback playback). */
    serverIsLocal: boolean
    /**
     * Streams that only play with extra request headers (e.g. a referer for an HLS source).
     * Android intents carry no headers, so such a URL opens a player that shows nothing —
     * no video, no sound, no error — which is exactly the reported symptom.
     */
    headers?: Record<string, string> | null
}): HandoffVerdict {
    const url = params.url?.trim() ?? ""
    const template = params.template?.trim() ?? ""

    if (!url) return "empty-url"
    if (!template) return "no-template"
    if (!params.serverIsLocal && isLoopbackUrl(url)) return "blocked-loopback"
    if (hasRequiredHeaders(params.headers)) return "blocked-headers"

    return "handoff"
}

/** True when the stream needs headers a foreign app cannot receive. */
export function hasRequiredHeaders(headers: Record<string, string> | null | undefined): boolean {
    if (!headers) return false
    return Object.keys(headers).length > 0
}

/** The external player has no credentials of its own, so these can never be played there. */
export function isAuthFailure(status: number | null | undefined): boolean {
    return status === 401 || status === 403
}

/** A probe answer that means "the URL is reachable" (includes redirects). */
export function isProbeOk(status: number | null | undefined): boolean {
    if (typeof status !== "number") return false
    return status >= 200 && status < 400
}

export function classifyProbe(status: number | null): HandoffProbe {
    return { status, blocked: isAuthFailure(status) }
}

/** Masks the HMAC token so handoff logs can be pasted around safely. */
export function maskStreamUrl(url: string): string {
    return url.replace(/([?&]token=)[^&]*/gi, "$1<redacted>")
}
