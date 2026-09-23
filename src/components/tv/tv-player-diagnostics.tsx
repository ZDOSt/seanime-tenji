import { tvSize } from "@/components/tv/tv-scale"
import { Platform, Text, View } from "react-native"

type Props = {
    lines: string[]
}

/**
 * Player diagnostics readout.
 *
 * Rendered above every other overlay and *outside* the Picture-in-Picture gates, so it
 * stays readable exactly when something is wrong (window squeezed, PiP flag stale, UI
 * mis-sized). Enabled from the TV player panel → "Playback stats", and shown automatically
 * when the player detects a size/PiP mismatch.
 */
export function TVPlayerDiagnostics({ lines }: Props) {
    if (!Platform.isTV || lines.length === 0) return null

    return (
        <View
            pointerEvents="none"
            style={{
                position: "absolute",
                top: tvSize(12),
                left: tvSize(12),
                zIndex: 9999,
                paddingVertical: tvSize(8),
                paddingHorizontal: tvSize(12),
                borderRadius: tvSize(8),
                backgroundColor: "rgba(0,0,0,0.72)",
                gap: tvSize(4),
                maxWidth: "70%",
            }}
        >
            {lines.map(line => (
                <Text
                    key={line}
                    style={{
                        color: "#ffffff",
                        fontSize: Math.max(12, tvSize(15)),
                        fontVariant: ["tabular-nums"],
                    }}
                >
                    {line}
                </Text>
            ))}
        </View>
    )
}
