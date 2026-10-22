import assert from "node:assert/strict"
import test from "node:test"
import {
    getContinueWatchingBadge,
    getContinueWatchingMetaMap,
    type AnimeLibraryCollectionWithContinueWatchingMeta,
} from "../src/lib/continue-watching-meta.ts"

const NOW = 1_761_100_000
const DAY = 86400

test("a promoted show shows a new episode badge", () => {
    assert.deepEqual(
        getContinueWatchingBadge({ promoted: true, airsAt: NOW + 3 * DAY, nextEpisode: 11 }, NOW),
        { label: "New episode", emphasized: true },
    )
})

test("promotion wins over a future airing", () => {
    const badge = getContinueWatchingBadge({ promoted: true, airsAt: NOW + 3600, nextEpisode: 11 }, NOW)
    assert.equal(badge?.label, "New episode")
    assert.equal(badge?.emphasized, true)
})

test("a future airing shows the days left", () => {
    assert.deepEqual(
        getContinueWatchingBadge({ promoted: false, airsAt: NOW + 3 * DAY, nextEpisode: 4 }, NOW),
        { label: "Airs in 3d", emphasized: false },
    )
})

test("an episode airing within a day is today", () => {
    assert.equal(
        getContinueWatchingBadge({ promoted: false, airsAt: NOW + 12 * 3600, nextEpisode: 4 }, NOW)?.label,
        "Airs today",
    )
})

test("a past airing without promotion shows no badge", () => {
    assert.equal(getContinueWatchingBadge({ promoted: false, airsAt: NOW - 60, nextEpisode: 4 }, NOW), null)
})

test("missing or empty meta shows no badge (old server)", () => {
    assert.equal(getContinueWatchingBadge(undefined, NOW), null)
    assert.equal(getContinueWatchingBadge(null, NOW), null)
    assert.equal(getContinueWatchingBadge({}, NOW), null)
    assert.equal(getContinueWatchingBadge({ nextEpisode: 4 }, NOW), null)
})

test("a collection without continueWatchingMeta yields an empty map", () => {
    const withEmptyMeta: AnimeLibraryCollectionWithContinueWatchingMeta = { lists: [], continueWatchingMeta: {} }

    assert.deepEqual(getContinueWatchingMetaMap(undefined), {})
    assert.deepEqual(getContinueWatchingMetaMap({ lists: [] }), {})
    assert.deepEqual(getContinueWatchingMetaMap(withEmptyMeta), {})
})

test("the meta map is keyed by media id", () => {
    const collection: AnimeLibraryCollectionWithContinueWatchingMeta = {
        lists: [],
        continueWatchingMeta: {
            159309: { promoted: true, nextEpisode: 11 },
        },
    }

    assert.deepEqual(getContinueWatchingMetaMap(collection)["159309"], { promoted: true, nextEpisode: 11 })
})
