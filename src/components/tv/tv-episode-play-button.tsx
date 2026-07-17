import { TVPillButton } from "@/components/tv/tv-focus"
import { tvSize } from "@/components/tv/tv-scale"
import Ionicons from "@expo/vector-icons/Ionicons"
import * as React from "react"
import { Pressable } from "react-native"

type Props = {
    episode: number
    disabled?: boolean
    onPress: () => void
}

export const TVEpisodePlayButton = React.forwardRef<React.ElementRef<typeof Pressable>, Props>(
    function TVEpisodePlayButton({ episode, disabled, onPress }, ref) {
        return (
            <TVPillButton
                ref={ref}
                label={`Play episode ${episode}`}
                disabled={disabled}
                icon={focused => (
                    <Ionicons
                        name="play"
                        size={tvSize(18)}
                        color={focused ? "#0a0a0a" : "#ffffff"}
                    />
                )}
                onPress={onPress}
            />
        )
    },
)
