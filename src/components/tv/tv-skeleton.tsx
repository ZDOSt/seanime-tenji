import { TV, tvSize } from "@/components/tv/tv-scale"
import * as React from "react"
import { type StyleProp, View, type ViewStyle } from "react-native"
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated"

const CARD_COUNT = 7

function Block({ style }: { style: StyleProp<ViewStyle> }) {
    return (
        <View
            style={[
                {
                    borderRadius: tvSize(10),
                    backgroundColor: "rgba(255,255,255,0.09)",
                },
                style,
            ]}
        />
    )
}

function Pulse({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
    const opacity = useSharedValue(0.5)
    const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }))

    React.useEffect(() => {
        opacity.set(withRepeat(
            withSequence(
                withTiming(0.9, { duration: 850 }),
                withTiming(0.5, { duration: 850 }),
            ),
            -1,
        ))
    }, [opacity])

    return <Animated.View style={[style, pulse]}>{children}</Animated.View>
}

export const TVHeroSkeleton = React.memo(function TVHeroSkeleton({
    height = tvSize(560),
}: {
    height?: number
}) {
    return (
        <View
            pointerEvents="none"
            style={{
                height,
                overflow: "hidden",
                backgroundColor: "#121212",
            }}
        >
            <Pulse style={{ flex: 1 }}>
                <View
                    style={{
                        position: "absolute",
                        inset: 0,
                        backgroundColor: "rgba(255,255,255,0.025)",
                    }}
                />
                <View
                    style={{
                        position: "absolute",
                        top: TV.navInset,
                        bottom: tvSize(72),
                        left: TV.gutter,
                        width: "58%",
                        justifyContent: "center",
                        gap: tvSize(14),
                    }}
                >
                    <Block style={{ width: "68%", height: tvSize(58) }} />
                    <Block style={{ width: "42%", height: tvSize(24) }} />
                    <Block style={{ width: "52%", height: tvSize(20) }} />
                    <Block style={{ width: "78%", height: tvSize(24) }} />
                    <View style={{ flexDirection: "row", gap: tvSize(14), paddingTop: tvSize(10) }}>
                        <Block style={{ width: tvSize(180), height: tvSize(56), borderRadius: tvSize(99) }} />
                        <Block style={{ width: tvSize(170), height: tvSize(56), borderRadius: tvSize(99) }} />
                    </View>
                </View>
            </Pulse>
        </View>
    )
})

const TVShelfSkeleton = React.memo(function TVShelfSkeleton() {
    return (
        <View pointerEvents="none" style={{ gap: tvSize(12), overflow: "hidden" }}>
            <Pulse>
                <View style={{ paddingHorizontal: TV.gutter }}>
                    <Block style={{ width: tvSize(280), height: tvSize(30) }} />
                </View>
                <View
                    style={{
                        flexDirection: "row",
                        gap: TV.cardGap,
                        paddingHorizontal: TV.gutter,
                        paddingTop: tvSize(22),
                    }}
                >
                    {Array.from({ length: CARD_COUNT }, (_, index) => (
                        <View key={index} style={{ width: tvSize(220), gap: tvSize(10) }}>
                            <Block
                                style={{
                                    width: tvSize(220),
                                    height: tvSize(312),
                                    borderRadius: TV.radius,
                                }}
                            />
                            <Block style={{ width: "82%", height: tvSize(18) }} />
                        </View>
                    ))}
                </View>
            </Pulse>
        </View>
    )
})

function ToolbarSkeleton() {
    return (
        <Pulse
            style={{
                paddingTop: TV.navInset + tvSize(14),
                paddingHorizontal: TV.gutter,
                paddingBottom: tvSize(18),
            }}
        >
            <View
                style={{
                    width: "100%",
                    maxWidth: tvSize(1320),
                    alignSelf: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: tvSize(12),
                }}
            >
                <Block style={{ flex: 1, maxWidth: tvSize(760), height: tvSize(56), borderRadius: tvSize(99) }} />
                <Block style={{ width: tvSize(140), height: tvSize(56), borderRadius: tvSize(99) }} />
                <Block style={{ width: tvSize(160), height: tvSize(56), borderRadius: tvSize(99) }} />
            </View>
        </Pulse>
    )
}

export const TVPageSkeleton = React.memo(function TVPageSkeleton({
    hero = false,
    toolbar = false,
}: {
    hero?: boolean
    toolbar?: boolean
}) {
    return (
        <View
            pointerEvents="none"
            style={{ flex: 1, overflow: "hidden", backgroundColor: "#0a0a0a", gap: TV.sectionGap }}
        >
            {hero ? <TVHeroSkeleton /> : null}
            {toolbar ? <ToolbarSkeleton /> : null}
            <TVShelfSkeleton />
            <TVShelfSkeleton />
        </View>
    )
})
