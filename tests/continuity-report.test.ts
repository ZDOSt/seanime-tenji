import assert from "node:assert/strict"
import test from "node:test"
import {
    CONTINUITY_REPORT_INTERVAL_MS,
    shouldReportContinuityProgress,
} from "../src/lib/player/continuity-report.ts"

test("the first report of a playback session is always allowed", () => {
    assert.equal(shouldReportContinuityProgress(null, 0), true)
    assert.equal(shouldReportContinuityProgress(null, Date.now()), true)
})

test("reports are throttled to one per interval", () => {
    assert.equal(shouldReportContinuityProgress(1_000, 1_000 + CONTINUITY_REPORT_INTERVAL_MS - 1), false)
    assert.equal(shouldReportContinuityProgress(1_000, 1_000 + CONTINUITY_REPORT_INTERVAL_MS), true)
    assert.equal(shouldReportContinuityProgress(1_000, 1_000 + CONTINUITY_REPORT_INTERVAL_MS * 2), true)
})

test("a custom interval is honoured", () => {
    assert.equal(shouldReportContinuityProgress(0, 4_999, 5_000), false)
    assert.equal(shouldReportContinuityProgress(0, 5_000, 5_000), true)
})

test("a clock that moved backwards does not stall reporting", () => {
    assert.equal(shouldReportContinuityProgress(10_000, 5_000), true)
})

test("an invalid timestamp does not stall reporting", () => {
    assert.equal(shouldReportContinuityProgress(Number.NaN, 5_000), true)
    assert.equal(shouldReportContinuityProgress(1_000, Number.NaN), true)
})
