/**
 * Back-button escape hatch.
 *
 * The exit prompt is drawn inside the player's overlay layer, which could be invisible when
 * the UI was mis-sized — leaving force-closing the app as the only way out. Two quick BACK
 * presses therefore always leave the player, independent of any prompt/panel state.
 *
 * Pure helper so the timing rule is unit-testable.
 */

/** Two BACK presses inside this window always exit. */
export const DOUBLE_BACK_WINDOW_MS = 1500

/**
 * @param lastPressAt timestamp of the previous BACK press (0 = none yet)
 * @param now timestamp of this press
 * @returns true when this press completes a double press (and the caller should force-exit)
 */
export function isDoubleBackPress(lastPressAt: number, now: number, windowMs: number = DOUBLE_BACK_WINDOW_MS): boolean {
    if (!lastPressAt) return false
    if (!Number.isFinite(now)) return false

    const delta = now - lastPressAt
    return delta >= 0 && delta < windowMs
}
