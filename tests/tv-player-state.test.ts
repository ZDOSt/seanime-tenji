import assert from "node:assert/strict"
import test from "node:test"
import { isDoubleBackPress } from "../src/lib/player/back-escape.ts"
import {
    WINDOW_SMALL_RATIO,
    isPiPFlagSuspect,
    isUiSquashed,
    isWindowSmall,
    resolvePiPActive,
    type PiPStateInput,
} from "../src/lib/player/pip-state.ts"
import { TV_MAX_SCALE, TV_MIN_SCALE, computeTvScale } from "../src/components/tv/tv-scale-math.ts"

/*
 * Rules behind the Android TV player fixes (v0.3.5).
 *
 * State names match the owner's report:
 *  - "blocked"   : video plays, UI is gone, BACK appears to do nothing
 *  - "half"      : window squeezed, exit dialog half visible
 */

const SCREEN = { screenWidth: 1920, screenHeight: 1080 }

function state(partial: Partial<PiPStateInput>): PiPStateInput {
    return {
        windowWidth: SCREEN.screenWidth,
        windowHeight: SCREEN.screenHeight,
        screenWidth: SCREEN.screenWidth,
        screenHeight: SCREEN.screenHeight,
        jsFlag: false,
        nativeFlag: null,
        ...partial,
    }
}

test("full-screen window is never treated as PiP, even when the push flag says so", () => {
    // This is the "blocked" state: the old code acted on jsFlag alone and hid every overlay.
    assert.equal(resolvePiPActive(state({ jsFlag: true, nativeFlag: null })), false)
    assert.equal(resolvePiPActive(state({ jsFlag: true, nativeFlag: false })), false)
})

test("a real PiP window is honoured", () => {
    const pip = state({
        windowWidth: 640,
        windowHeight: 360,
        jsFlag: true,
        nativeFlag: true,
    })
    assert.equal(isWindowSmall(pip.windowWidth, pip.windowHeight, pip.screenWidth, pip.screenHeight), true)
    assert.equal(resolvePiPActive(pip), true)
})

test("the native answer wins over a stale push flag", () => {
    const pip = state({ windowWidth: 640, windowHeight: 360, jsFlag: true, nativeFlag: false })
    assert.equal(resolvePiPActive(pip), false, "small window but native says not PiP")

    const leaving = state({ windowWidth: 640, windowHeight: 360, jsFlag: false, nativeFlag: true })
    assert.equal(resolvePiPActive(leaving), true, "native says PiP while the flag lags behind")
})

test("before the first native answer, a small window still trusts the flag (real PiP start)", () => {
    const pip = state({ windowWidth: 640, windowHeight: 360, jsFlag: true, nativeFlag: null })
    assert.equal(resolvePiPActive(pip), true)
})

test("squeezed window is detected for the diagnostics readout", () => {
    // The "half" state: the window is a fraction of the screen but the OS is not doing PiP.
    assert.equal(isUiSquashed(true, false), true)
    assert.equal(isUiSquashed(true, null), true)
    assert.equal(isUiSquashed(true, true), false, "real PiP is not a squeeze")
    assert.equal(isUiSquashed(false, false), false, "full window is not a squeeze")
})

test("flag disagreement is reported", () => {
    assert.equal(isPiPFlagSuspect(true, false), true)
    assert.equal(isPiPFlagSuspect(true, true), false)
    assert.equal(isPiPFlagSuspect(false, false), false)
    assert.equal(isPiPFlagSuspect(false, null), false, "no answer yet is not a disagreement")
})

test("window sanity check tolerates insets but not a shrunken window", () => {
    // Android TV with a slightly reduced window (insets) must not count as small.
    assert.equal(isWindowSmall(1900, 1060, 1920, 1080), false)
    assert.equal(isWindowSmall(1920, 800, 1920, 1080), true)
    assert.equal(isWindowSmall(1920, 1080 * WINDOW_SMALL_RATIO, 1920, 1080), false)
    // Unknown screen size must never produce a false positive.
    assert.equal(isWindowSmall(100, 100, 0, 0), false)
})

test("double BACK inside the window always exits, outside it does not", () => {
    assert.equal(isDoubleBackPress(0, 1000), false, "first press")
    assert.equal(isDoubleBackPress(1000, 1200), true, "quick second press")
    assert.equal(isDoubleBackPress(1000, 2600), false, "too slow, treated as a fresh press")
    assert.equal(isDoubleBackPress(1000, 999), false, "clock going backwards is not a double press")
    assert.equal(isDoubleBackPress(1000, Number.NaN), false)
})

test("TV layout scale stays sane when the window measurement is odd", () => {
    assert.equal(computeTvScale(1920, 1080, 1), 1)
    assert.equal(computeTvScale(3840, 2160, 1), 2, "4K window doubles the design size")
    assert.equal(computeTvScale(7680, 4320, 1), TV_MAX_SCALE, "clamped at the top")
    // A stripe-sized window (the blocked state) must not collapse every size to zero.
    assert.equal(computeTvScale(1920, 40, 1), TV_MIN_SCALE)
    assert.equal(computeTvScale(0, 0, 1), 1, "measurement missing keeps the previous scale")
    assert.equal(computeTvScale(Number.NaN, 1080, 0.8), 0.8)
    assert.equal(computeTvScale(-100, 1080, 0.8), 0.8)
})
