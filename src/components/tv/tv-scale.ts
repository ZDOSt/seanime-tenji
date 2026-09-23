import * as React from "react"
import { Dimensions, useWindowDimensions } from "react-native"

const BASE_WIDTH = 1920
const BASE_HEIGHT = 1080

// Guard rails: a transient or incorrect window measurement must never collapse the
// TV UI to nothing (or blow it up past the screen). This replaces a single snapshot
// taken at import time, which kept the whole UI sized for a stale window — the cause
// of the player overlays getting squashed into a stripe / half screen.
const MIN_SCALE = 0.4
const MAX_SCALE = 2.5

function computeScale(width: number, height: number, fallback: number): number {
    if (!(width > 0) || !(height > 0)) return fallback

    const next = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT)
    if (!Number.isFinite(next) || next <= 0) return fallback

    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, next))
}

const initialWindow = Dimensions.get("window")
let scale = computeScale(initialWindow.width, initialWindow.height, 1)

Dimensions.addEventListener("change", ({ window }) => {
    scale = computeScale(window.width, window.height, scale)
})

export function tvSize(size: number) {
    return Math.round(size * scale)
}

export function getTvScale() {
    return scale
}

/**
 * Keeps the module scale in sync with the live window and re-renders the caller on
 * window changes, so every `tvSize()` in the tree picks up the current measurement.
 */
export function useTvScale() {
    const { width, height } = useWindowDimensions()

    return React.useMemo(() => {
        scale = computeScale(width, height, scale)
        return scale
    }, [width, height])
}

export const TV = {
    navHeight: tvSize(64),
    navTop: tvSize(22),
    navInset: tvSize(108),
    gutter: tvSize(64),
    sectionGap: tvSize(38),
    cardGap: tvSize(22),
    radius: tvSize(18),
    focusBorder: Math.max(2, tvSize(4)),
    // Media cards need a little more visual weight than compact controls.
    cardFocusBorder: Math.max(2, tvSize(5)),
    // Matches --color-brand-400, the existing pressed-link border.
    focusColor: "rgb(159, 146, 255)",
}
