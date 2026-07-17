import { tvSize } from "@/components/tv/tv-scale"
import { Ionicons } from "@/lib/icons/Ionicons"
import { scoreBg, scoreColor } from "@/lib/media-metadata"
import * as React from "react"
import { Text, View } from "react-native"

type Props = {
    score?: number
    kind: "audience" | "user"
    compact?: boolean
}

export const TVScoreBadge = React.memo(function TVScoreBadge({
    score,
    kind,
    compact,
}: Props) {
    if (!score) return null

    const size = tvSize(compact ? 14 : 18)
    const textSize = tvSize(compact ? 16 : 20)
    const color = kind === "audience" ? scoreColor(score) : "#ffffff"

    return (
        <View
            style={{
                minHeight: tvSize(compact ? 34 : 42),
                paddingHorizontal: tvSize(compact ? 12 : 14),
                borderRadius: tvSize(compact ? 99 : 99),
                backgroundColor: kind === "user" ? scoreBg(score) : "rgba(0,0,0,0.4)",
                flexDirection: "row",
                alignItems: "center",
                gap: tvSize(compact ? 4 : 7),
            }}
        >
            <Ionicons
                name={kind === "audience" ? "heart" : (score > 82 ? "star" : "star-outline")}
                size={size}
                color={color}
            />
            <Text className="font-bold" style={{ color, fontSize: textSize }}>
                {kind === "audience" ? (score / 10).toFixed(1) : score / 10}
            </Text>
        </View>
    )
})
