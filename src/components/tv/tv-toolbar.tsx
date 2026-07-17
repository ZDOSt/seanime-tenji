import { TV, tvSize } from "@/components/tv/tv-scale"
import * as React from "react"
import { TVFocusGuideView, View } from "react-native"

type Props = {
    children: React.ReactNode
}

export const TVToolbar = React.memo(function TVToolbar({ children }: Props) {
    return (
        <View
            style={{
                paddingTop: TV.navInset + tvSize(14),
                paddingHorizontal: TV.gutter,
                paddingBottom: tvSize(18),
                borderBottomWidth: tvSize(1),
                borderBottomColor: "rgba(255,255,255,0.06)",
                backgroundColor: "#0a0a0a",
            }}
        >
            <View
                style={{
                    width: "100%",
                    maxWidth: tvSize(1320),
                    alignSelf: "center",
                }}
            >
                <TVFocusGuideView
                    trapFocusLeft
                    trapFocusRight
                    style={{
                        width: "100%",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: tvSize(12),
                    }}
                >
                    {children}
                </TVFocusGuideView>
            </View>
        </View>
    )
})
