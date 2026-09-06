import { useServerStatus } from "@/atoms/server.atoms"
import type { ContinueWatchingItem } from "@/hooks/use-anime-library-collection"
import { getContinueWatchingSpoilerActive, getEpisodeSpoilerState } from "@/lib/anime-spoilers"
import * as React from "react"
import { TVEpisodeCard } from "./tv-episode-card"
import { Pressable } from "react-native"

type Props = {
    item: ContinueWatchingItem
    onPress: () => void
    preferred?: boolean
    progressPercent?: number
    navOnUp?: boolean
}

export const TVContinueCard = React.memo(
    React.forwardRef<React.ElementRef<typeof Pressable>, Props>(
        function TVContinueCard({
            item,
            onPress,
            preferred,
            progressPercent,
            navOnUp,
            ...props
        }, ref) {
            const serverStatus = useServerStatus()
            const episode = item.episode
            const media = episode.baseAnime
            const spoiler = getEpisodeSpoilerState(serverStatus, {
                episodeNumber: episode.progressNumber || episode.episodeNumber,
                spoilerActive: getContinueWatchingSpoilerActive(serverStatus),
            })
            const title = media?.title?.userPreferred
                ?? media?.title?.english
                ?? media?.title?.romaji
                ?? "Untitled"
            const image = episode.episodeMetadata?.image
                ?? media?.bannerImage
                ?? media?.coverImage?.extraLarge
                ?? media?.coverImage?.large

            return (
                <TVEpisodeCard
                    ref={ref}
                    image={image}
                    duration={episode.episodeMetadata?.length}
                    badge={episode.displayTitle}
                    title={title}
                    subtitle={spoiler.hideTitle
                        ? `Episode ${episode.episodeNumber}`
                        : episode.episodeTitle || `Episode ${episode.episodeNumber}`}
                    onPress={onPress}
                    preferred={preferred}
                    progressPercent={progressPercent}
                    navOnUp={navOnUp}
                    filler={episode.episodeMetadata?.isFiller}
                    blurred={spoiler.hideThumbnail}
                    recyclingKey={`${media?.id ?? "episode"}-${episode.episodeNumber}`}
                    {...props}
                />
            )
        }
    )
)
