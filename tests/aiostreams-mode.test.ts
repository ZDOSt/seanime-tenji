import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { formatBytes } from "../src/lib/player/format-bytes.ts"
import {
    AIOSTREAMS_SEARCH_ID_KEY,
    aioMergeSearchId,
    aioModeFromSearchId,
    aioModeLabel,
    aioOrderedModes,
    aioOtherMode,
    aioSearchIdFromMode,
    aioSwitchLabel,
} from "../src/lib/player/aiostreams-mode.ts"

describe("AIOStreams ID mode helpers", () => {
    it("mirrors the plugin's own default (unset means IMDb)", () => {
        assert.equal(aioModeFromSearchId("kitsuId"), "kitsu")
        assert.equal(aioModeFromSearchId("imdbId"), "imdb")
        // the plugin does `$getUserPreference("searchId") ?? "imdbId"`
        assert.equal(aioModeFromSearchId(undefined), "imdb")
        assert.equal(aioModeFromSearchId(null), "imdb")
        assert.equal(aioModeFromSearchId(""), "imdb")
        assert.equal(aioModeFromSearchId("somethingElse"), "imdb")
    })

    it("maps modes back to the plugin's search IDs", () => {
        assert.equal(aioSearchIdFromMode("kitsu"), "kitsuId")
        assert.equal(aioSearchIdFromMode("imdb"), "imdbId")
    })

    it("labels the modes the way the plugin names them", () => {
        assert.equal(aioModeLabel("kitsu"), "Kitsu")
        assert.equal(aioModeLabel("imdb"), "IMDb")
    })

    it("puts the configured mode first and keeps both tabs", () => {
        assert.deepEqual(aioOrderedModes("kitsu"), ["kitsu", "imdb"])
        assert.deepEqual(aioOrderedModes("imdb"), ["imdb", "kitsu"])
    })

    it("toggles to the other mode", () => {
        assert.equal(aioOtherMode("kitsu"), "imdb")
        assert.equal(aioOtherMode("imdb"), "kitsu")
    })

    it("keeps the rest of the user config when switching", () => {
        const current = { manifestUrl: "https://example/manifest.json", playerMode: "builtin", searchId: "kitsuId" }
        const next = aioMergeSearchId(current, "imdb")
        assert.equal(next[AIOSTREAMS_SEARCH_ID_KEY], "imdbId")
        assert.equal(next.manifestUrl, current.manifestUrl)
        assert.equal(next.playerMode, "builtin")
        // the original object must not be mutated
        assert.equal(current.searchId, "kitsuId")
    })

    it("switching with no saved values still produces the mode", () => {
        assert.deepEqual(aioMergeSearchId(undefined, "kitsu"), { [AIOSTREAMS_SEARCH_ID_KEY]: "kitsuId" })
        assert.deepEqual(aioMergeSearchId(null, "imdb"), { [AIOSTREAMS_SEARCH_ID_KEY]: "imdbId" })
    })

    it("shows a switching hint on the active tab only", () => {
        assert.equal(aioSwitchLabel("kitsu", false, true), "Kitsu")
        assert.equal(aioSwitchLabel("kitsu", true, true), "Kitsu · switching…")
        assert.equal(aioSwitchLabel("imdb", true, false), "IMDb")
    })
})

describe("file size on result cards", () => {
    it("formats sizes the way the desktop panel does", () => {
        assert.equal(formatBytes(1_556_778_000), "1.45 GB")
        assert.equal(formatBytes(242 * 1024 * 1024), "242 MB")
        assert.equal(formatBytes(1024), "1.00 KB")
        assert.equal(formatBytes(900), "900 B")
        assert.equal(formatBytes(2 * 1024 ** 4), "2.00 TB")
    })

    it("stays silent when there is no usable size", () => {
        assert.equal(formatBytes(null), null)
        assert.equal(formatBytes(undefined), null)
        assert.equal(formatBytes(0), null)
        assert.equal(formatBytes(-5), null)
        assert.equal(formatBytes(Number.NaN), null)
    })
})
