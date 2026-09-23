/**
 * Picture-in-Picture trust rules for the player.
 *
 * Background (Android TV 0.3.4): the native side *assumed* Picture-in-Picture whenever the
 * activity paused during playback, so Home / the TV's own overlays / a system dialog could
 * set the flag. JS then hid every TV player overlay while the video kept playing — the
 * "player locks up, BACK does nothing" report. At the same time the exit dialog could not be
 * seen because the window had been resized and the layout was still using the old scale.
 *
 * These rules are deliberately pure and independently stated so they can be unit-tested:
 *  - PiP is only believable when the OS actually shrank the window (it never shrinks the
 *    window for anything else).
 *  - Once the native view has answered a direct query, that answer wins over the push flag.
 */

export type PiPStateInput = {
    windowWidth: number
    windowHeight: number
    screenWidth: number
    screenHeight: number
    /** Flag from the native push event (`state.isPiPActive`). */
    jsFlag: boolean
    /** Answer from `isPictureInPictureActive()`, or null before the first poll. */
    nativeFlag: boolean | null
}

/** Fraction of the screen below which a window can only be a PiP window. */
export const WINDOW_SMALL_RATIO = 0.75

export function isWindowSmall(
    windowWidth: number,
    windowHeight: number,
    screenWidth: number,
    screenHeight: number,
): boolean {
    if (!(screenWidth > 0) || !(screenHeight > 0)) return false

    return windowWidth < screenWidth * WINDOW_SMALL_RATIO
        || windowHeight < screenHeight * WINDOW_SMALL_RATIO
}

/** The PiP state the UI should act on. */
export function resolvePiPActive(input: PiPStateInput): boolean {
    const small = isWindowSmall(input.windowWidth, input.windowHeight, input.screenWidth, input.screenHeight)
    if (!small) return false

    return input.nativeFlag === null ? input.jsFlag : input.nativeFlag
}

/** JS and native disagree about PiP (worth showing the diagnostics readout). */
export function isPiPFlagSuspect(jsFlag: boolean, nativeFlag: boolean | null): boolean {
    return jsFlag !== (nativeFlag === true)
}

/** The window is smaller than the screen but the OS says this is not PiP. */
export function isUiSquashed(windowSmall: boolean, nativeFlag: boolean | null): boolean {
    return windowSmall && nativeFlag !== true
}
