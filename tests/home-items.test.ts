import assert from "node:assert/strict"
import test from "node:test"
import type { Models_HomeItem } from "../src/api/generated/types.ts"
import {
    DEFAULT_TV_HOME_ITEMS,
    getHomeItemStringArrayOption,
    getHomeItemStringOption,
    normalizeTVHomeItems,
} from "../src/lib/home/home-items.ts"

function item(overrides: Partial<Models_HomeItem> = {}): Models_HomeItem {
    return {
        id: "item",
        type: "anime-carousel",
        schemaVersion: 3,
        ...overrides,
    }
}

test("TV normalization preserves supported server order", () => {
    const result = normalizeTVHomeItems([
        item({ id: "title", type: "centered-title", schemaVersion: 1 }),
        item({ id: "manga", type: "manga-carousel", schemaVersion: 1 }),
        item({ id: "recent", type: "aired-recently", schemaVersion: 1 }),
    ])

    assert.deepEqual(result.map(entry => entry.id), ["title", "recent"])
})

test("stale schema versions keep the item but discard incompatible options", () => {
    const result = normalizeTVHomeItems([
        item({
            type: "anime-library",
            schemaVersion: 1,
            options: { statuses: ["CURRENT"] },
        }),
    ])

    assert.equal(result[0]?.type, "anime-library")
    assert.equal(result[0]?.schemaVersion, 2)
    assert.equal(result[0]?.options, undefined)
})

test("empty or unsupported layouts use the TV fallback", () => {
    assert.deepEqual(normalizeTVHomeItems([]), DEFAULT_TV_HOME_ITEMS)
    assert.deepEqual(normalizeTVHomeItems([
        item({ type: "manga-library", schemaVersion: 2 }),
        null,
        { id: "missing-schema", type: "anime-carousel" },
    ]), [{
        id: "missing-schema",
        type: "anime-carousel",
        schemaVersion: 3,
        options: undefined,
    }])
})

test("option helpers trim strings and discard invalid array entries", () => {
    const homeItem = item({
        options: {
            name: "  Trending  ",
            genres: ["Action", "", 42, "  Sci-Fi  "],
        },
    })

    assert.equal(getHomeItemStringOption(homeItem, "name"), "Trending")
    assert.deepEqual(getHomeItemStringArrayOption(homeItem, "genres"), ["Action", "Sci-Fi"])
    assert.equal(getHomeItemStringOption(homeItem, "missing"), undefined)
})
