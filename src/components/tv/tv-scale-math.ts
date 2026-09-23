/**
 * Pure helpers behind the TV layout scale.
 *
 * Kept free of React Native imports so the rules can be unit-tested with the repo's
 * plain-Node test runner (`node --test tests/*.test.ts`).
 */

export const TV_BASE_WIDTH = 1920
export const TV_BASE_HEIGHT = 1080

/** A transient or wrong window measurement must never collapse the UI to nothing. */
export const TV_MIN_SCALE = 0.4
export const TV_MAX_SCALE = 2.5

export function computeTvScale(width: number, height: number, fallback: number): number {
    if (!(width > 0) || !(height > 0)) return fallback

    const next = Math.min(width / TV_BASE_WIDTH, height / TV_BASE_HEIGHT)
    if (!Number.isFinite(next) || next <= 0) return fallback

    return Math.min(TV_MAX_SCALE, Math.max(TV_MIN_SCALE, next))
}
