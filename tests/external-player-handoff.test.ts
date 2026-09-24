import assert from "node:assert/strict"
import test from "node:test"
import {
    classifyProbe,
    hasRequiredHeaders,
    decideExternalHandoff,
    getExternalPlayerPackageName,
    getExternalPlayerURL,
    isAuthFailure,
    isLoopbackUrl,
    isProbeOk,
    maskStreamUrl,
} from "../src/lib/player/external-player-url.ts"

/*
 * Rules behind the external-player handoff (Android TV: "mpv opens and nothing loads").
 *
 * The handoff cannot be exercised in this container (no device/emulator), so these cover the
 * decisions that decide whether a player is opened at all, and what URL it is given.
 */

const MPV = "intent://{url}#Intent;package=is.xyz.mpv;scheme=http;end"
const STREAM = "https://anime.example.com/api/v1/torrentstream/stream/Show%20S01E01.mkv?token=abc.def"

test("package is extracted from an intent template", () => {
    assert.equal(getExternalPlayerPackageName(MPV), "is.xyz.mpv")
    assert.equal(getExternalPlayerPackageName("vlc://{url}"), null)
})

test("intent URL keeps the embedded scheme in sync with the stream", () => {
    const https = getExternalPlayerURL(MPV, STREAM)
    assert.ok(!https.includes("intent://https://"), "the http(s) prefix is stripped")
    assert.ok(https.includes("scheme=https;"), "scheme hint follows the stream")
    assert.ok(https.startsWith("intent://anime.example.com/"), `unexpected form: ${https}`)

    const http = getExternalPlayerURL(MPV, "http://192.168.1.10:43211/api/v1/mediastream/file?path=x")
    assert.ok(http.includes("scheme=http;"))
})

test("non-intent templates are only substituted", () => {
    assert.equal(getExternalPlayerURL("vlc://{url}", STREAM), `vlc://${STREAM}`)
    assert.equal(getExternalPlayerURL("no-placeholder", STREAM), STREAM)
})

test("loopback URLs are recognised", () => {
    for (const url of [
        "http://127.0.0.1:43211/api/v1/mediastream/file?path=x",
        "http://localhost:43211/x",
        "https://[::1]:43211/x",
        "http://foo.localhost/x",
    ]) {
        assert.equal(isLoopbackUrl(url), true, url)
    }

    for (const url of [
        "https://anime.example.com/x",
        "http://192.168.1.10:43211/x",
        "https://10.0.0.5/x",
        "file:///storage/emulated/0/Download/x.mkv",
    ]) {
        assert.equal(isLoopbackUrl(url), false, url)
    }
})

test("handoff is skipped when the URL only exists on another device", () => {
    const loopback = "http://127.0.0.1:43211/api/v1/mediastream/file?path=x"

    assert.equal(
        decideExternalHandoff({ url: loopback, template: MPV, serverIsLocal: false }),
        "blocked-loopback",
        "a TV cannot reach the server's loopback interface",
    )
    assert.equal(
        decideExternalHandoff({ url: loopback, template: MPV, serverIsLocal: true }),
        "handoff",
        "when this device runs the server, loopback is correct",
    )
})

test("handoff verdicts for the simple cases", () => {
    assert.equal(decideExternalHandoff({ url: STREAM, template: null, serverIsLocal: false }), "no-template")
    assert.equal(decideExternalHandoff({ url: "  ", template: MPV, serverIsLocal: false }), "empty-url")
    assert.equal(decideExternalHandoff({ url: STREAM, template: MPV, serverIsLocal: false }), "handoff")
    // a downloaded file is handed over through the FileProvider path, not probed over HTTP
    assert.equal(
        decideExternalHandoff({ url: "file:///data/user/0/app/files/ep.mkv", template: MPV, serverIsLocal: false }),
        "handoff",
    )
})

test("a stream that needs request headers is never handed over", () => {
    // Android intents carry no headers: the player opens, shows nothing, and reports no error
    // (no video, no sound) — the exact symptom reported from the TV.
    assert.equal(hasRequiredHeaders(undefined), false)
    assert.equal(hasRequiredHeaders({}), false)
    assert.equal(hasRequiredHeaders({ Referer: "https://example.com" }), true)

    assert.equal(
        decideExternalHandoff({
            url: STREAM,
            template: MPV,
            serverIsLocal: false,
            headers: { Referer: "https://example.com" },
        }),
        "blocked-headers",
    )
    assert.equal(
        decideExternalHandoff({ url: STREAM, template: MPV, serverIsLocal: false, headers: {} }),
        "handoff",
        "an empty header map is not a blocker",
    )
})

test("an authenticated stream is never handed to a player without credentials", () => {
    assert.equal(isAuthFailure(401), true)
    assert.equal(isAuthFailure(403), true)
    assert.equal(isAuthFailure(404), false)
    assert.equal(isAuthFailure(null), false)

    assert.deepEqual(classifyProbe(401), { status: 401, blocked: true })
    assert.deepEqual(classifyProbe(206), { status: 206, blocked: false })
    assert.deepEqual(classifyProbe(null), { status: null, blocked: false })
})

test("probe answers are classified", () => {
    assert.equal(isProbeOk(200), true)
    assert.equal(isProbeOk(206), true)
    assert.equal(isProbeOk(302), true)
    assert.equal(isProbeOk(404), false)
    assert.equal(isProbeOk(500), false)
    assert.equal(isProbeOk(null), false)
})

test("handoff logs never leak the stream token", () => {
    const masked = maskStreamUrl(STREAM)
    assert.ok(!masked.includes("abc.def"), masked)
    assert.ok(masked.includes("token=<redacted>"), masked)
})
