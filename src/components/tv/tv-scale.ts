import * as React from "react"
import { Dimensions, useWindowDimensions } from "react-native"
import { computeTvScale } from "@/components/tv/tv-scale-math"

// Guard rails: a transient or incorrect window measurement must never collapse the
// TV UI to nothing (or blow it up past the screen). This replaces a single snapshot
// taken at import time, which kept the whole UI sized for a stale window — the cause
// of the player overlays getting squashed into a stripe / half screen.
const initialWindow = Dimensions.get("window")
let scale = computeTvScale(initialWindow.width, initialWindow.height, 1)

Dimensions.addEventListener("change", ({ window }) => {
    scale = computeTvScale(window.width, window.height, scale)
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
        scale = computeTvScale(width, height, scale)
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
