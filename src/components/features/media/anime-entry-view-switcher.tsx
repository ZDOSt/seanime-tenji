import { TabBarIcon } from "@/components/navigation/tab-bar-icon"
import { cn } from "@/lib/utils"
import Ionicons from "@expo/vector-icons/Ionicons"
import * as React from "react"
import { Platform, Pressable, Text, useWindowDimensions, View } from "react-native"
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export type AnimeEntryView = "library" | "torrentstream" | "onlinestream" | "info" | "downloaded" | "server-local"

type AnimeEntryViewSwitcherProps = {
    currentView: AnimeEntryView
    onViewChange: (view: AnimeEntryView) => void
    isOffline?: boolean
    hiddenViews?: Set<AnimeEntryView>
}

const BAR_GAP = 16
const BAR_LIMIT = 560

const VIEW_ITEMS: Array<{ label: string, icon: React.ComponentProps<typeof Ionicons>["name"], view: AnimeEntryView }> = [
    { label: "Library", icon: "library-outline", view: "library" },
    { label: "On Server", icon: "library-outline", view: "server-local" },
    { label: "Stream", icon: "play-circle-outline", view: "torrentstream" },
    { label: "Online", icon: "globe-outline", view: "onlinestream" },
    { label: "Info", icon: "information-circle-outline", view: "info" },
    { label: "Downloads", icon: "download-outline", view: "downloaded" },
]

const OFFLINE_DISABLED_VIEWS: Set<AnimeEntryView> = new Set(["library", "torrentstream", "onlinestream"])

export function AnimeEntryViewSwitcher({ currentView, onViewChange, isOffline, hiddenViews }: AnimeEntryViewSwitcherProps) {
    const insets = useSafeAreaInsets()
    const { width: screenWidth } = useWindowDimensions()
    const usableWidth = Math.max(0, screenWidth - insets.left - insets.right)
    const barWidth = Platform.isTV
        ? Math.min(900, Math.max(0, usableWidth - 96))
        : Math.min(BAR_LIMIT, Math.max(0, usableWidth - BAR_GAP * 2))
    const barLeft = insets.left + (usableWidth - barWidth) / 2
    const visibleItems = React.useMemo(() => {
        let items = VIEW_ITEMS
        if (hiddenViews?.size) {
            items = items.filter(item => !hiddenViews.has(item.view))
        }
        if (isOffline) {
            items = items.filter(item => !OFFLINE_DISABLED_VIEWS.has(item.view))
        }
        return items
    }, [hiddenViews, isOffline])

    return (
        <View
            pointerEvents="box-none"
            className="absolute"
            style={{
                bottom: Platform.isTV ? 28 : Math.max(insets.bottom, Platform.OS === "ios" ? 20 : 10),
                left: barLeft,
                width: barWidth,
            }}
        >
            <View
                className={cn(
                    "flex-row justify-between overflow-hidden bg-background",
                    Platform.isTV ? "rounded-2xl border border-white/10 px-4 py-3" : "rounded-full px-5 py-4",
                )}
                style={{ elevation: 10 }}
            >
                {visibleItems.map(item => (
                    <AnimeEntryViewButton
                        key={item.view}
                        label={item.label}
                        icon={item.icon}
                        active={currentView === item.view}
                        onPress={() => onViewChange(item.view)}
                    />
                ))}
            </View>
        </View>
    )
}

type AnimeEntryViewButtonProps = {
    label: string
    icon: React.ComponentProps<typeof Ionicons>["name"]
    active: boolean
    onPress: () => void
}

function AnimeEntryViewButton({ label, icon, active, onPress }: AnimeEntryViewButtonProps) {
    const [focused, setFocused] = React.useState(false)
    const scale = useSharedValue(active ? 0 : 1)

    React.useEffect(() => {
        scale.set(withSpring(active ? 0 : 1, { duration: 350 }))
    }, [active, scale])

    const animatedIconStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: interpolate(scale.value, [0, 1], [1.2, 1]) }],
            top: interpolate(scale.value, [0, 1], [1, 9]),
        }
    })

    const animatedTextStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(scale.value, [0, 1], [1, 0]),
            top: interpolate(scale.value, [1, 0], [20, 4]),
        }
    })

    return (
        <Pressable
            onPress={onPress}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={cn(
                "flex-1 items-center justify-center gap-1",
                Platform.isTV && "min-h-14 flex-row rounded-xl px-3",
                Platform.isTV && focused && "bg-white/15",
            )}
        >
            {Platform.isTV ? (
                <>
                    <TabBarIcon
                        name={icon}
                        size={22}
                        className={cn("text-gray", (active || focused) && "text-brand-200")}
                    />
                    <Text className={cn("text-sm font-semibold text-white/50", (active || focused) && "text-white")}>
                        {label}
                    </Text>
                </>
            ) : (
                <>
                    <Animated.View style={animatedIconStyle}>
                        <TabBarIcon
                            name={icon}
                            size={24}
                            className={cn("text-gray", { "text-brand-300": active })}
                        />
                    </Animated.View>
                    <Animated.Text
                        className={cn("text-xs text-gray", { "text-brand-300": active })}
                        style={animatedTextStyle}
                    >
                        {label}
                    </Animated.Text>
                </>
            )}
        </Pressable>
    )
}
