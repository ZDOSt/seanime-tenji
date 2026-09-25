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

const modeHelpers = loadModule("../src/lib/player/aiostreams-mode.ts")

function controllerHarness(options?: { searchId?: string, pluginListed?: boolean, refreshesConfig?: boolean }) {
    const states: any[] = []
    // simulates the plugin's saved settings, refreshed after a save unless the test opts out
    const saved = { searchId: options && "searchId" in options ? options.searchId : "kitsuId" }
    const sent: any[] = []
    const savedConfigs: any[] = []
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
    const api = {
        EXTENSIONS: {
            ListAnimeEntryEpisodeTabExtensions: { endpoint: "/tabs", methods: ["GET"], key: "tabs" },
            GetExtensionUserConfig: { endpoint: "/user-config/{id}", methods: ["GET"], key: "ext-user-config" },
        },
    }
    const module = loadModule("../src/components/features/aiostreams/use-aiostreams-plugin-controller.ts", {
        react,
        "@/api/components/websocket-hub": {
            subscribeWsMessage: (next: typeof listener) => { listener = next; return () => { listener = undefined } },
            sendWsMessage: (message: unknown) => { sent.push(message); return connected },
        },
        "@/api/generated/endpoints": { API_ENDPOINTS: api },
        "@/api/client/requests": {
            // pluginListed: false models the moment the plugin is restarting after a config save
            useServerQuery: () => ({ data: options?.pluginListed === false ? [] : [{ id: EXTENSION_ID }] }),
        },
        "@/lib/player/player-preferences": { getPlayerPreferences: () => ({}) },
        "@/lib/player/external-players": { openExternalPlayerURL: () => assert.fail("Unexpected player launch") },
        "@/lib/player": { useStartOnlineStreamPlayback: () => () => assert.fail("Unexpected player launch") },
        "@/lib/utils/toast": { toast: { error: () => {} } },
        "@/lib/player/aiostreams-mode": modeHelpers,
        "@tanstack/react-query": {
            // the switch refreshes the plugin config once the save settles
            useQueryClient: () => ({ invalidateQueries: () => Promise.resolve() }),
        },
        "@/api/hooks/extensions.hooks": {
            useGetExtensionUserConfig: () => ({
                data: {
                    userConfig: { version: 3 },
                    savedUserConfig: { values: { searchId: saved.searchId, playerMode: "builtin" } },
                },
            }),
            // stands in for the save mutation: records the payload and settles immediately
            useSaveExtensionUserConfig: () => ({
                mutate: (variables: any, callbacks?: { onSettled?: () => void }) => {
                    savedConfigs.push(variables)
                    if (options?.refreshesConfig !== false) saved.searchId = variables.values.searchId
                    callbacks?.onSettled?.()
                },
                isPending: false,
            }),
        },
    })
    const controller = module.useAioStreamsPluginController({ mediaId: 123, media: { id: 123, title: { userPreferred: "Example season 4" } } })
    return {
        controller, sent, savedConfigs,
        disconnect: () => { connected = false },
        receive: (message: unknown) => listener?.(message),
        get open() { return states[0] },
        get loading() { return states[1] },
        get results() { return states[2] },
        get error() { return states[3] },
        // the controller's own extra state: switching / pending mode (indices after the four above)
        get switching() { return states[5] },
        get pendingMode() { return states[6] },
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

test("the ID tabs switch the plugin's Preferred Media ID and keep the rest of its config", () => {
    const h = controllerHarness({ searchId: "kitsuId" })
    const episode = { episodeNumber: 11, aniDBEpisode: "11", baseAnime: { id: 123 } }
    h.controller.request(episode)

    // the configured mode comes first, IMDb second
    assert.deepEqual([...h.controller.modes], ["kitsu", "imdb"])
    assert.equal(h.controller.mode, "kitsu")

    h.controller.switchMode("imdb")

    assert.equal(h.savedConfigs.length, 1)
    assert.equal(h.savedConfigs[0].id, "aiostreams-plugin")
    assert.equal(h.savedConfigs[0].version, 3)
    assert.equal(h.savedConfigs[0].values.searchId, "imdbId")
    // the rest of the user config survives the switch
    assert.equal(h.savedConfigs[0].values.playerMode, "builtin")
    // and the panel shows the new mode as pending while the plugin reloads
    assert.equal(h.switching, true)
    assert.equal(h.pendingMode, "imdb")

    // re-selecting the same mode is a no-op
    h.controller.switchMode("imdb")
    assert.equal(h.savedConfigs.length, 1)
})

test("an unset Preferred Media ID behaves like the plugin default (IMDb first)", () => {
    const h = controllerHarness({ searchId: undefined as any })
    assert.deepEqual([...h.controller.modes], ["imdb", "kitsu"])
    assert.equal(h.controller.mode, "imdb")
})

test("a switch still re-asks for the episode while the plugin is restarting", () => {
    // the plugin's episode tab disappears from the server list while it reloads: the re-ask must
    // not be blocked by that, otherwise the sheet is left with an empty list
    const h = controllerHarness({ searchId: "kitsuId", pluginListed: false })
    const episode = { episodeNumber: 11, aniDBEpisode: "11", baseAnime: { id: 123 } }

    assert.equal(h.controller.request(episode), false, "the normal path still waits for the plugin")
    assert.equal(h.controller.request(episode, { skipAvailabilityCheck: true }), true)
    assert.equal(h.sent.length, 1)
    assert.equal(h.sent[0].payload.payload.episodeNumber, 11)
})

test("an empty state pushed while the plugin restarts does not look like an answer", () => {
    // The harness cannot re-run the hook, so the controller never sees the refreshed config here —
    // which is exactly the "plugin has not switched yet" case. Both a restart's empty state and a
    // finished search from the old ID must be refused rather than shown as the new answer.
    const h = controllerHarness({ searchId: "kitsuId" })
    const episode = { episodeNumber: 11, aniDBEpisode: "11", baseAnime: { id: 123 } }
    h.controller.request(episode)
    h.controller.switchMode("imdb")
    assert.equal(h.switching, true)

    h.receive({ type: "plugin", payload: stateEvent({ loading: false, results: [] }) })
    assert.equal(h.switching, true, "an empty restart state is not an answer")

    h.receive({ type: "plugin", payload: stateEvent({ loading: false, results: [{ name: "old", url: "u", type: "http" }] }) })
    assert.equal(h.switching, true, "a search from the previous ID is not the new answer either")
    assert.equal(h.results.length, 0, "and its results are not shown")
})

test("a switch still re-asks for the episode while the plugin is restarting", () => {
    // the plugin's episode tab disappears from the server list while it reloads: the re-ask must
    // not be blocked by that, otherwise the sheet is left with an empty list
    const h = controllerHarness({ searchId: "kitsuId", pluginListed: false })
    const episode = { episodeNumber: 11, aniDBEpisode: "11", baseAnime: { id: 123 } }

    assert.equal(h.controller.request(episode), false, "the normal path still waits for the plugin")
    assert.equal(h.controller.request(episode, { skipAvailabilityCheck: true }), true)
    assert.equal(h.sent.length, 1)
    assert.equal(h.sent[0].payload.payload.episodeNumber, 11)
})

test("the request carries the base anime so the plugin never has to look it up", () => {
    // the plugin falls back to its own (cold, right after a restart) caches when the episode has no
    // baseAnime, and gives up silently — which is what left the sheet empty after switching IDs
    const h = controllerHarness()
    const episode = { episodeNumber: 11, aniDBEpisode: "11" }
    h.controller.request(episode)
    const sent = h.sent[0].payload.payload
    assert.deepEqual(sent.episode.baseAnime, { id: 123, title: { userPreferred: "Example season 4" } })
    assert.equal(sent.episodeNumber, 11)

    // an episode that already knows its anime is left untouched
    const withAnime = { episodeNumber: 12, aniDBEpisode: "12", baseAnime: { id: 999 } }
    h.controller.request(withAnime)
    assert.equal(h.sent[1].payload.payload.episode.baseAnime.id, 999)
})

test("the tab order does not swap under the user's finger when the mode changes", () => {
    const h = controllerHarness({ searchId: "kitsuId" })
    const episode = { episodeNumber: 11, aniDBEpisode: "11", baseAnime: { id: 123 } }
    h.controller.request(episode)
    assert.deepEqual([...h.controller.modes], ["kitsu", "imdb"])

    h.controller.switchMode("imdb")
    // even though the plugin now reports imdbId, the tabs stay where they were
    assert.deepEqual([...h.controller.modes], ["kitsu", "imdb"])
})

test("a stuck switch never makes the tabs unresponsive", () => {
    const h = controllerHarness({ searchId: "kitsuId" })
    const episode = { episodeNumber: 11, aniDBEpisode: "11", baseAnime: { id: 123 } }
    h.controller.request(episode)

    h.controller.switchMode("imdb")
    assert.equal(h.switching, true)
    // the user changes their mind while the plugin is still restarting: that must be accepted
    h.controller.switchMode("kitsu")
    assert.equal(h.savedConfigs.length, 2, "the second tap saves its own mode")
    assert.equal(h.savedConfigs[1].values.searchId, "kitsuId")
})

test("an answer from the previous ID is ignored while the plugin has not switched yet", () => {
    const h = controllerHarness({ searchId: "kitsuId", refreshesConfig: false })
    const episode = { episodeNumber: 11, aniDBEpisode: "11", baseAnime: { id: 123 } }
    h.controller.request(episode)
    h.controller.switchMode("imdb")

    // the plugin's saved config never refreshes here, so its answers still belong to kitsuId and must
    // not be shown as the IMDb answer
    h.receive({ type: "plugin", payload: stateEvent({ loading: false, results: [{ name: "old", url: "u", type: "http" }] }) })
    assert.equal(h.switching, true)
    assert.equal(h.results.length, 0, "the old mode's results are not shown")
})
