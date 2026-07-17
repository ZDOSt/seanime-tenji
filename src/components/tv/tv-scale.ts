import { Dimensions } from "react-native"

const BASE_WIDTH = 1920
const BASE_HEIGHT = 1080

const { width, height } = Dimensions.get("window")
const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT)

export function tvSize(size: number) {
    return Math.round(size * scale)
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
}
