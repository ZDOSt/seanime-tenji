import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { runInNewContext } from "node:vm"
import ts from "typescript"

// Exercise the real controller with only its native/UI dependencies stubbed.
// This is a protocol regression test, not a substitute for device playback QA.
function loadModule(path: string, dependencies: Record<string, unknown> = {}) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8")
    const { outputText } = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    })
    const module = { exports: {} as any }
    runInNewContext(outputText, {
        module,
        exports: module.exports,
        // The controller arms a 45 s timeout. Expose the host timers so tests
        // can swap them for node:test mock timers when exercising the timeout.
        setTimeout,
        clearTimeout,
        require: (name: string) => {
            assert.ok(Object.hasOwn(dependencies, name), `Missing test dependency: ${name}`)
            return dependencies[name]
        },
    }, { filename: path })
    return module.exports
}

const defaults = loadModule("../src/lib/default-playback-source.ts")
const views = loadModule("../src/components/features/media/anime-entry-view-utils.ts", {
    "@/lib/default-playback-source": defaults,
})

function status(source: string) {
    return { settings: { library: { defaultPlaybackSource: source } } }
}

test("mobile and TV select plugin streams without enabling torrent/debrid services", () => {
    for (const source of ["ext:aiostreams-plugin", "episodeTab:aiostreams-plugin"]) {
        for (const hasLibrary of [false, true]) {
            const view = views.defaultEntryView(status(source), hasLibrary)
            assert.equal(view, "torrentstream")
            assert.equal(views.tvEntryView(view), "torrentstream")
        }
    }
})

test("other sources keep their existing default and fallback behavior", () => {
    assert.equal(views.defaultEntryView(status("library"), false), "library")
    assert.equal(views.defaultEntryView(status("ext:unrelated-plugin"), false), "library")
    assert.equal(views.defaultEntryView(null, true), "library")
    assert.equal(views.defaultEntryView({ ...status("debridstream"), debridSettings: { enabled: true } }, true), "torrentstream")
    assert.equal(views.defaultEntryView({ ...status("torrentstream"), torrentstreamSettings: { enabled: true } }, true), "torrentstream")
    assert.equal(views.defaultEntryView({ settings: { library: { defaultPlaybackSource: "onlinestream", enableOnlinestream: true } } }, true), "onlinestream")
})

const EXTENSION_ID = "aiostreams-plugin"
const stateEvent = (value: unknown, extensionId = EXTENSION_ID, key = "state") => ({
    extensionId, type: "webview:sync-state", payload: { key, value },
})
const batch = (events: unknown[]) => ({
    type: "plugin", payload: { extensionId: EXTENSION_ID, type: "plugin:batch-events", payload: { events } },
})

function controllerHarness() {
    const states: any[] = []
    const sent: any[] = []
    let listener: ((message: unknown) => void) | undefined
    let connected = true
    const react = {
        useState(value: unknown) {
            const index = states.push(value) - 1
            return [value, (next: unknown) => { states[index] = next }]
        },
        useRef: (current: unknown) => ({ current }),
        useEffect: (effect: () => void) => effect(),
        useCallback: (callback: unknown) => callback,
    }
    const api = { EXTENSIONS: { ListAnimeEntryEpisodeTabExtensions: { endpoint: "/tabs", methods: ["GET"], key: "tabs" } } }
    const module = loadModule("../src/components/features/aiostreams/use-aiostreams-plugin-controller.ts", {
        react,
        "@/api/components/websocket-hub": {
            subscribeWsMessage: (next: typeof listener) => { listener = next; return () => { listener = undefined } },
            sendWsMessage: (message: unknown) => { sent.push(message); return connected },
        },
        "@/api/generated/endpoints": { API_ENDPOINTS: api },
        "@/api/client/requests": { useServerQuery: () => ({ data: [{ id: EXTENSION_ID }] }) },
        "@/lib/player/player-preferences": { getPlayerPreferences: () => ({}) },
        "@/lib/player/external-players": { openExternalPlayerURL: () => assert.fail("Unexpected player launch") },
        "@/lib/player": { useStartOnlineStreamPlayback: () => () => assert.fail("Unexpected player launch") },
        "@/lib/utils/toast": { toast: { error: () => {} } },
    })
    const controller = module.useAioStreamsPluginController({ mediaId: 123, media: { id: 123, title: { userPreferred: "Example season 4" } } })
    return {
        controller, sent,
        disconnect: () => { connected = false },
        receive: (message: unknown) => listener?.(message),
        get open() { return states[0] },
        get loading() { return states[1] },
        get results() { return states[2] },
        get error() { return states[3] },
    }
}

test("batched plugin response clears loading and preserves every result in native order", () => {
    const h = controllerHarness()
    const episode = { episodeNumber: 21, aniDBEpisode: "21", baseAnime: { id: 123 } }
    assert.equal(h.controller.request(episode), true)
    assert.equal(h.loading, true)
    assert.equal(h.sent[0].payload.payload.episode, episode)
    assert.equal(h.sent[0].payload.payload.episodeNumber, 21)
    const results = [{ name: "B", url: "https://example.com/b", type: "http" }, { name: "A", type: "p2p" }, { name: "B", url: "https://example.com/b", type: "http" }]
    // The response arrives immediately, before React rerenders the opened sheet.
    h.receive(batch([
        { extensionId: EXTENSION_ID, type: "webview:sidebar", payload: {} },
        stateEvent({ loading: true, results: [] }),
        stateEvent({ loading: false, results, error: null }),
    ]))
    assert.equal(h.loading, false)
    assert.equal(h.results, results)
    assert.equal(h.error, null)
})

test("single official plugin states without request IDs remain supported", () => {
    const h = controllerHarness()
    h.controller.request({ episodeNumber: 1 })
    h.receive({ type: "plugin", payload: stateEvent({ loading: false, results: [], error: "Example provider failure" }) })
    assert.equal(h.loading, false)
    assert.equal(h.error, "Example provider failure")
})

test("optional request IDs are enforced and unrelated/malformed events are ignored", () => {
    const h = controllerHarness()
    h.controller.request({ episodeNumber: 1 })
    h.receive(batch([null, false, [], stateEvent({ loading: false }, "unrelated-plugin"), stateEvent({ loading: false }, EXTENSION_ID, "preferences"), stateEvent({ loading: false, requestId: "different-request" })]))
    h.receive({ type: "plugin", payload: { type: "plugin:batch-events", payload: { events: null } } })
    h.receive({ type: "unrelated", payload: stateEvent({ loading: false }) })
    assert.equal(h.loading, true)
    h.receive(batch([stateEvent({ loading: false, requestId: h.sent[0].payload.payload.requestId })]))
    assert.equal(h.loading, false)
})

test("unsolicited and closed-picker updates cannot replace the current results", () => {
    const h = controllerHarness()
    h.receive(batch([stateEvent({ results: [{ name: "unsolicited" }] })]))
    assert.equal(h.results.length, 0)
    h.controller.request({ episodeNumber: 1 })
    h.controller.close()
    h.receive(batch([stateEvent({ results: [{ name: "late" }], loading: true })]))
    assert.equal(h.open, false)
    assert.equal(h.loading, false)
    assert.equal(h.results.length, 0)
})

test("a disconnected socket does not leave a plugin request loading", () => {
    const h = controllerHarness()
    h.disconnect()
    assert.equal(h.controller.request({ episodeNumber: 1 }), false)
    assert.equal(h.open, false)
    assert.equal(h.loading, false)
    h.receive(batch([stateEvent({ results: [{ name: "late" }] })]))
    assert.equal(h.results.length, 0)
})

test("a plugin request that never answers times out after 45 seconds", (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] })
    const h = controllerHarness()
    assert.equal(h.controller.request({ episodeNumber: 1 }), true)
    assert.equal(h.open, true)
    assert.equal(h.loading, true)
    t.mock.timers.tick(44_999)
    assert.equal(h.open, true)
    assert.equal(h.loading, true)
    t.mock.timers.tick(1)
    assert.equal(h.open, false)
    assert.equal(h.loading, false)
    assert.match(h.error ?? "", /45 seconds/)
})

test("a settled response cancels the timeout clock", (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] })
    const h = controllerHarness()
    h.controller.request({ episodeNumber: 1 })
    h.receive(batch([stateEvent({ loading: false, results: [{ name: "fast" }] })]))
    assert.equal(h.loading, false)
    // Advancing past the timeout window must not fire anything anymore.
    t.mock.timers.tick(60_000)
    assert.equal(h.open, true)
    assert.equal(h.loading, false)
    assert.equal(h.results.length, 1)
})
