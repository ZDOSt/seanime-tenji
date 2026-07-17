import { TV, tvSize } from "@/components/tv/tv-scale"
import * as React from "react"
import { Text, View } from "react-native"

type TVSectionHeaderProps = {
    title: string
    count?: number
    after?: React.ReactNode
    action?: React.ReactNode
    padded?: boolean
}

export const TVSectionHeader = React.memo(function TVSectionHeader({
    title,
    count,
    after,
    action,
    padded = true,
}: TVSectionHeaderProps) {
    return (
        <View
            style={{
                minHeight: tvSize(44),
                paddingHorizontal: padded ? TV.gutter : 0,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: tvSize(24),
            }}
        >
            <View style={{ flexDirection: "row", alignItems: "center", gap: tvSize(30), flexShrink: 0 }}>
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "baseline",
                        gap: tvSize(12),
                    }}
                >
                    <Text className="font-bold text-white" style={{ fontSize: tvSize(30) }}>
                        {title}
                    </Text>
                    {count !== undefined ? (
                        <Text className="font-medium text-white/35" style={{ fontSize: tvSize(20) }}>
                            {count}
                        </Text>
                    ) : null}
                </View>
                {after}
            </View>
            {action ? (
                <View style={{ flexShrink: 1, alignItems: "flex-end" }}>
                    {action}
                </View>
            ) : null}
        </View>
    )
})
