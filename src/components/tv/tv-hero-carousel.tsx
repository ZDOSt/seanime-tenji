import { TVButton, TVPillButton } from "@/components/tv/tv-focus"
import { TVScoreBadge } from "@/components/tv/tv-score-badge"
import { TV, tvSize } from "@/components/tv/tv-scale"
import { TVHeroSkeleton } from "@/components/tv/tv-skeleton"
import { Ionicons } from "@/lib/icons/Ionicons"
import { Image } from "expo-image"
import { LinearGradient } from "expo-linear-gradient"
import * as React from "react"
import { Pressable, Text, TVFocusGuideView, View } from "react-native"

const ROTATE_MS = 10000

export type TVHeroItem = {
    key: string
    image?: string
    kicker?: string
    title: string
    subtitle?: string
    meta?: string
    description?: string
    score?: number
    progressPercent?: number
    actionLabel: string
    onAction: () => void
    secondaryLabel?: string
    onSecondary?: () => void
}

type Props = {
    items: TVHeroItem[]
    active?: boolean
    preferred?: boolean
    height?: number
    loading?: boolean
    navOnUp?: boolean
}

export const TVHeroCarousel = React.memo(function TVHeroCarousel({
    items,
    active = true,
    preferred,
    height = tvSize(560),
    loading = false,
    navOnUp = false,
}: Props) {
    const [index, setIndex] = React.useState(0)
    const [firstAction, setFirstAction] = React.useState<React.ElementRef<typeof Pressable> | null>(null)
    const pauseUntil = React.useRef(0)
    const keys = items.map(item => item.key).join(":")

    React.useEffect(() => {
        setIndex(0)
    }, [keys])

    const move = React.useCallback((next: number, pause = true) => {
        if (items.length <= 1) return
        if (pause) pauseUntil.current = Date.now() + ROTATE_MS
        setIndex((next + items.length) % items.length)
    }, [items.length])

    React.useEffect(() => {
        if (!active || items.length <= 1) return

        const timer = setInterval(() => {
            if (Date.now() < pauseUntil.current) return
            setIndex(current => (current + 1) % items.length)
        }, ROTATE_MS)

        return () => clearInterval(timer)
    }, [active, items.length])

    if (items.length === 0) {
        return loading ? <TVHeroSkeleton height={height} /> : null
    }

    const item = items[Math.min(index, items.length - 1)]

    return (
        <View
            style={{
                height,
                overflow: "hidden",
                backgroundColor: "#121212",
            }}
        >
            {item.image ? (
                <Image
                    source={{ uri: item.image }}
                    style={{ position: "absolute", inset: 0 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    priority="high"
                    transition={260}
                />
            ) : null}
            <LinearGradient
                colors={["rgba(10,10,10,0.97)", "rgba(10,10,10,0.62)", "rgba(10,10,10,0.08)"]}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ position: "absolute", inset: 0 }}
            />
            <LinearGradient
                colors={["transparent", "rgba(10,10,10,0.3)", "#0a0a0a"]}
                locations={[0, 0.7, 1]}
                style={{ position: "absolute", inset: 0 }}
            />

            <View
                style={{
                    position: "absolute",
                    top: TV.navInset,
                    bottom: tvSize(72),
                    left: 0,
                    width: "62%",
                    paddingHorizontal: TV.gutter,
                    justifyContent: "center",
                    gap: tvSize(10),
                }}
            >
                {/*{item.kicker ? (
                    <Text
                        className="font-medium text-gray-200/80"
                        style={{ fontSize: tvSize(18), letterSpacing: tvSize(3) }}
                    >
                        {item.kicker}
                    </Text>
                ) : null}*/}
                <Text
                    className="font-black text-white"
                    style={{ fontSize: tvSize(52), lineHeight: tvSize(58) }}
                    numberOfLines={2}
                >
                    {item.title}
                </Text>
                {item.subtitle ? (
                    <Text className="font-semibold text-white/90" style={{ fontSize: tvSize(24) }} numberOfLines={1}>
                        {item.subtitle}
                    </Text>
                ) : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: tvSize(12) }}>
                    {item.score ? <TVScoreBadge score={item.score} kind="audience" /> : null}
                    {item.meta ? (
                        <Text className="font-medium text-white/60" style={{ fontSize: tvSize(20) }} numberOfLines={1}>
                            {item.meta}
                        </Text>
                    ) : null}
                </View>
                {item.description ? (
                    <Text
                        className="text-white/60"
                        style={{ fontSize: tvSize(21), lineHeight: tvSize(30), maxWidth: tvSize(860) }}
                        numberOfLines={2}
                    >
                        {item.description}
                    </Text>
                ) : null}

                <TVFocusGuideView
                    autoFocus={active}
                    destinations={firstAction ? [firstAction] : undefined}
                    trapFocusLeft
                    trapFocusRight
                    style={{ flexDirection: "row", alignItems: "center", gap: tvSize(14), marginTop: tvSize(10) }}
                >
                    <TVButton
                        ref={setFirstAction}
                        label={item.actionLabel}
                        variant="primary"
                        size="compact"
                        preferred={preferred && active}
                        navOnUp={navOnUp}
                        icon={<Ionicons name="play" size={tvSize(22)} color="white" />}
                        onPress={item.onAction}
                    />
                    {item.secondaryLabel && item.onSecondary ? (
                            <TVButton
                            label={item.secondaryLabel}
                            variant="secondary"
                            size="compact"
                            icon={<Ionicons name="information-circle-outline" size={tvSize(24)} color="white" />}
                            onPress={item.onSecondary}
                        />
                    ) : null}
                    {items.length > 1 ? (
                        <>
                            <TVPillButton
                                label=""
                                accessibilityLabel="Previous featured title"
                                onPress={() => move(index - 1)}
                                navOnUp={navOnUp}
                                icon={(focused) => (
                                    <Ionicons
                                        name="chevron-back"
                                        size={tvSize(22)}
                                        color={focused ? "#000000" : "#ffffff"}
                                    />
                                )}
                            />
                            <TVPillButton
                                label=""
                                accessibilityLabel="Next featured title"
                                onPress={() => move(index + 1)}
                                navOnUp={navOnUp}
                                icon={(focused) => (
                                    <Ionicons
                                        name="chevron-forward"
                                        size={tvSize(22)}
                                        color={focused ? "#000000" : "#ffffff"}
                                    />
                                )}
                            />
                        </>
                    ) : null}
                </TVFocusGuideView>
            </View>

            {items.length > 1 ? (
                <View
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        right: TV.gutter,
                        bottom: tvSize(28),
                        flexDirection: "row",
                        alignItems: "center",
                        gap: tvSize(7),
                    }}
                >
                    {items.map((hero, dot) => (
                        <View
                            key={hero.key}
                            style={{
                                width: tvSize(dot === index ? 34 : 10),
                                height: tvSize(4),
                                borderRadius: tvSize(2),
                                backgroundColor: dot === index ? "#ffffff" : "rgba(255,255,255,0.3)",
                            }}
                        />
                    ))}
                    <Text className="font-semibold text-white/40" style={{ marginLeft: tvSize(6), fontSize: tvSize(16) }}>
                        {index + 1}/{items.length}
                    </Text>
                </View>
            ) : null}
            {item.progressPercent && item.progressPercent > 0 ? (
                <View
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: tvSize(6),
                        backgroundColor: "rgba(255,255,255,0.12)",
                    }}
                >
                    <View
                        style={{
                            width: `${Math.min(item.progressPercent, 100)}%`,
                            height: "100%",
                            backgroundColor: "#8176ef",
                        }}
                    />
                </View>
            ) : null}
        </View>
    )
})
