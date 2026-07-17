import { SeaImage } from "@/components/shared/sea-image"
import { getEpisodeCardWidth } from "@/lib/responsive-card-layout"
import * as React from "react"
import { Animated, Platform, Pressable, Text, useWindowDimensions, View } from "react-native"

type EpisodeCardProps = {
    cardWidth?: number
    image: string
    imageBlurred?: boolean
    title: string
    episodeNumber: number
    totalEpisodes: number | undefined
    length: number | undefined
    onPress?: () => void
    progressPercent?: number
    disabled?: boolean
    thumbnailOverlay?: React.ReactNode
    animeTitle?: string
    small?: boolean
}

export const EpisodeCard = React.memo(function EpisodeCard(props: EpisodeCardProps) {
    const {
        cardWidth,
        image,
        imageBlurred,
        title,
        episodeNumber,
        totalEpisodes,
        length,
        onPress,
        progressPercent,
        disabled,
        thumbnailOverlay,
        animeTitle,
        small,
    } = props
    const { width: screenWidth } = useWindowDimensions()
    const resolvedCardWidth = cardWidth ?? getEpisodeCardWidth(screenWidth)
    const [focused, setFocused] = React.useState(false)
    const scale = React.useRef(new Animated.Value(1)).current

    const setFocus = React.useCallback((next: boolean) => {
        setFocused(next)
        Animated.timing(scale, {
            toValue: next ? 1.04 : 1,
            duration: 110,
            useNativeDriver: true,
        }).start()
    }, [scale])

    return (
        <Pressable
            onPress={disabled ? undefined : onPress}
            disabled={disabled || !onPress}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
        >
            <Animated.View style={{ width: resolvedCardWidth, transform: [{ scale }] }}>
                <View
                    className={small ? "relative mb-1.5" : "relative mb-2"}
                    style={{
                        borderRadius: 12,
                        overflow: "hidden",
                        borderColor: focused && Platform.isTV ? "#b8b0ff" : "transparent",
                    }}
                >
                    <SeaImage
                        source={{ uri: image }}
                        style={{ width: "100%", aspectRatio: 16 / 9 }}
                        contentFit="cover"
                        transition={120}
                        blurRadius={imageBlurred ? 18 : 0}
                    />
                    {!!progressPercent && progressPercent > 0 && (
                        <View className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 rounded-b-xl overflow-hidden">
                            <View
                                className="h-full bg-brand-400 rounded-bl-xl"
                                style={{ width: `${Math.min(progressPercent, 100)}%` }}
                            />
                        </View>
                    )}
                    {thumbnailOverlay}
                </View>

                <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    className={small
                        ? "text-sm tracking-tight text-foreground font-semibold mb-0.5"
                        : "text-lg tracking-tight text-foreground font-semibold mb-1"}
                >
                    {title}
                </Text>

                <View
                    className="flex flex-row justify-between items-center"
                >
                    <View
                        className="flex flex-row flex-1 mr-2"
                    >
                        <Text
                            className={small ? "text-xs text-foreground" : "text-foreground"}
                            numberOfLines={1}
                        >
                            Episode {episodeNumber}
                            {totalEpisodes && (
                                <Text className="text-muted-foreground">
                                    /{totalEpisodes}
                                </Text>
                            )}
                            {animeTitle && (
                                <Text className="text-muted-foreground">
                                    {` - ${animeTitle}`}
                                </Text>
                            )}
                        </Text>
                    </View>

                    {length && <Text
                        className={small ? "text-xs text-muted-foreground shrink-0" : "text-muted-foreground shrink-0"}
                    >{length}m</Text>}
                </View>
            </Animated.View>
        </Pressable>
    )
})
