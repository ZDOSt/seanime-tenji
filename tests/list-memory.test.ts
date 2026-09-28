import assert from "node:assert/strict"
import { beforeEach, describe, it } from "node:test"
import {
    LIST_MEMORY_TTL_MS,
    __resetListMemory,
    forgetListPosition,
    recallListPosition,
    rememberListPosition,
} from "../src/lib/ui/list-memory.ts"

describe("list position memory", () => {
    beforeEach(() => __resetListMemory())

    it("remembers the anime the user opened", () => {
        rememberListPosition("library", { mediaId: 42, offset: 1200 })
        const entry = recallListPosition("library")
        assert.equal(entry?.mediaId, 42)
        assert.equal(entry?.offset, 1200)
    })

    it("merges patches instead of dropping what it already knew", () => {
        rememberListPosition("library", { mediaId: 42 })
        rememberListPosition("library", { offset: 800 })
        const entry = recallListPosition("library")!
        assert.equal(entry.mediaId, 42, "the anime id survives a scroll update")
        assert.equal(entry.offset, 800)
    })

    it("keeps one horizontal offset per row", () => {
        rememberListPosition("library", { rowOffsets: { "continue-watching": 300 } })
        rememberListPosition("library", { rowOffsets: { "my-lists": 40 } })
        assert.deepEqual(recallListPosition("library")?.rowOffsets, { "continue-watching": 300, "my-lists": 40 })
    })

    it("is scoped per list, so screens do not fight", () => {
        rememberListPosition("library", { mediaId: 1 })
        rememberListPosition("my-lists", { mediaId: 2 })
        assert.equal(recallListPosition("library")?.mediaId, 1)
        assert.equal(recallListPosition("my-lists")?.mediaId, 2)
    })

    it("expires stale positions so a new day starts at the top", () => {
        rememberListPosition("library", { mediaId: 7 }, 1_000)
        assert.equal(recallListPosition("library", 1_000 + LIST_MEMORY_TTL_MS + 1), null)
        assert.equal(recallListPosition("library", 1_000), null, "the expired entry is dropped")
    })

    it("can be forgotten explicitly", () => {
        rememberListPosition("library", { mediaId: 9 })
        forgetListPosition("library")
        assert.equal(recallListPosition("library"), null)
    })
})
