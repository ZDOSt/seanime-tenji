import type { AL_AnimeCollection, AL_BaseAnime, Anime_LibraryCollectionList, Models_HomeItem } from "@/api/generated/types"
import { useAnilistListAnime, useAnilistListMissedSequels, useGetRawAnimeCollection } from "@/api/hooks/anilist.hooks"
import { useGetHomeItems } from "@/api/hooks/status.hooks"
import { animeEntryPlaybackIntentAtom, createAnimeEntryPlaybackIntent } from "@/atoms/anime-entry.atoms"
import { ContinueWatching } from "@/components/features/anime/continue-watching"
import { DownloadedAnimeList } from "@/components/features/anime/downloaded-anime-list"
import { ServerLocalAnimeList } from "@/components/features/anime/server-local-anime-list"
import { HorizontalMediaCardList } from "@/components/features/media/horizontal-media-card-list"
import { LibraryHeroCarousel } from "@/components/features/media/library-hero-carousel"
import { MediaEntryGrid } from "@/components/features/media/media-entry-grid"
import { TabFadeView } from "@/components/layout/tab-fade-view"
import { CenteredSpinner } from "@/components/shared/centered-spinner"
import { LIBRARY_SEARCH_HEADER_BASE_HEIGHT, LibrarySearchHeader } from "@/components/shared/library-search-header"
import { LuffyError } from "@/components/shared/luffy-error"
import { OfflineBanner } from "@/components/shared/offline-banner"
import { TVLibraryScreen } from "@/components/tv/tv-library-screen"
import { useDiscoverRecentlyAired, useDiscoverTrendingAnime } from "@/components/features/discover/discover-queries"
import { ContinueWatchingItem, useAnimeLibraryCollection } from "@/hooks/use-anime-library-collection"
import { useIOSScrollRefreshRateWorkaround } from "@/hooks/use-ios-scroll-refresh-rate-workaround"
import { useIsServerConnected, useServerLocalAnimeRecords } from "@/lib/offline"
import { filterEntriesByTitle } from "@/lib/utils/filtering"
import {
    DEFAULT_TV_HOME_ITEMS,
    getHomeItemStringArrayOption,
    getHomeItemStringOption,
    normalizeTVHomeItems,
} from "@/lib/home/home-items"
import { useIsFocused } from "expo-router"
import { router, useFocusEffect } from "expo-router"
import { useSetAtom } from "jotai"
import * as React from "react"
import { Platform, RefreshControl, Text, View } from "react-native"
import Animated, { SharedValue, useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export default function LibraryScreen() {
    if (Platform.isTV) {
        return <TVLibraryScreen />
    }

    return <MobileLibraryScreen />
}

function MobileLibraryScreen() {
    const isConnected = useIsServerConnected()
    const isFocused = useIsFocused()
    const insets = useSafeAreaInsets()
    const [searchQuery, setSearchQuery] = React.useState("")
    const deferredSearchQuery = React.useDeferredValue(searchQuery)
    const [isPullRefreshing, setIsPullRefreshing] = React.useState(false)
    const serverLocalAnime = useServerLocalAnimeRecords()

    const scrollY = useSharedValue(0)
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (e) => {
            "worklet"
            scrollY.value = e.contentOffset.y
        },
    })

    useIOSScrollRefreshRateWorkaround()

    const {
        libraryCollectionList,
        continueWatchingList,
        isLoading,
        refetch,
        hasNonLocalEpisodes,
    } = useAnimeLibraryCollection()
    const refetchRef = React.useRef(refetch)
    const { data: serverHomeItems } = useGetHomeItems()

    const homeItems = React.useMemo<Models_HomeItem[]>(
        () => serverHomeItems?.length
            ? normalizeTVHomeItems(serverHomeItems)
            : DEFAULT_TV_HOME_ITEMS,
        [serverHomeItems],
    )
    const homeItemTypes = React.useMemo(
        () => new Set(homeItems.map(item => item.type)),
        [homeItems],
    )
    const needsTrending = homeItemTypes.has("discover-header")
    const needsRecent = homeItemTypes.has("aired-recently")
    const needsMissedSequels = homeItemTypes.has("missed-sequels")
    const needsMyLists = homeItemTypes.has("my-lists")
    const { data: trendingData } = useDiscoverTrendingAnime(needsTrending)
    const { media: recentlyAired } = useDiscoverRecentlyAired(needsRecent)
    const { data: missedSequels } = useAnilistListMissedSequels(needsMissedSequels)
    const { data: rawAnimeCollection } = useGetRawAnimeCollection(needsMyLists)
    const trendingMedia = React.useMemo(
        () => trendingData?.Page?.media?.filter(Boolean) as AL_BaseAnime[] ?? [],
        [trendingData?.Page?.media],
    )

    React.useEffect(() => {
        refetchRef.current = refetch
    }, [refetch])

    const allEntries = React.useMemo(
        () => libraryCollectionList.flatMap(list => list?.entries ?? []),
        [libraryCollectionList],
    )

    const searchResults = React.useMemo(() => {
        if (!deferredSearchQuery.trim()) return []
        return filterEntriesByTitle(allEntries, deferredSearchQuery)
            .map(e => e.media!)
            .filter(Boolean)
    }, [allEntries, deferredSearchQuery])

    const isSearching = searchQuery.trim().length > 0

    useFocusEffect(
        React.useCallback(() => {
            if (!isConnected) return
            void refetchRef.current()
        }, [isConnected]),
    )

    const hasHero = isConnected
        && homeItems.some(item => item.type === "anime-continue-watching-header")
        && continueWatchingList.length > 0
        && !isSearching
    const searchHeaderHeight = isConnected ? LIBRARY_SEARCH_HEADER_BASE_HEIGHT : 0

    const handleRefresh = React.useCallback(() => {
        setIsPullRefreshing(true)
        void refetch().finally(() => {
            setIsPullRefreshing(false)
        })
    }, [refetch])

    const refreshControl = isConnected ? (
        <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={handleRefresh}
            tintColor="rgba(255,255,255,0.45)"
            progressViewOffset={hasHero ? (insets.top + 60) : 60}
        />
    ) : undefined

    const setPlaybackIntent = useSetAtom(animeEntryPlaybackIntentAtom)

    const handleWatchPress = React.useCallback((item: ContinueWatchingItem) => {
        const episode = item.episode
        const mediaId = episode.baseAnime?.id
        if (!mediaId) return

        if (item.sourceView === "library" && episode.localFile?.path) {
            setPlaybackIntent(createAnimeEntryPlaybackIntent({
                kind: "play-local-episode",
                mediaId,
                episodeNumber: episode.episodeNumber,
            }))
        }

        router.push({
            pathname: "/(app)/entry/anime/[id]",
            params: {
                id: String(mediaId),
                initialView: item.sourceView,
            },
        })
    }, [setPlaybackIntent])

    if (isLoading && isConnected) {
        return (
            <View
                className="flex-1 bg-background justify-center items-center"
                style={{ paddingTop: insets.top }}
            >
                <CenteredSpinner />
            </View>
        )
    }

    return (
        <View
            className="flex-1 bg-background"
            style={{ paddingTop: hasHero ? 0 : insets.top }}
        >
            <TabFadeView>
                <OfflineBanner />

                <View className="flex-1">
                    {isSearching ? (
                        <MediaEntryGrid
                            type="anime"
                            media={searchResults}
                            query={searchQuery}
                            onPress={(media) => router.push(`/(app)/entry/anime/${media.id}`)}
                            topPadding={searchHeaderHeight}
                        />
                    ) : (
                        <Animated.FlatList
                            key={isConnected ? "online" : "offline"}
                            data={isConnected ? homeItems : []}
                            renderItem={({ item, index }) => (
                                <MobileHomeItemView
                                    item={item}
                                    index={index}
                                    continueWatchingList={continueWatchingList}
                                    libraryCollectionList={libraryCollectionList}
                                    rawAnimeCollection={rawAnimeCollection}
                                    hasNonLocalEpisodes={hasNonLocalEpisodes}
                                    recentlyAired={recentlyAired}
                                    missedSequels={missedSequels ?? []}
                                    trendingMedia={trendingMedia}
                                    isFocused={isFocused}
                                    scrollY={scrollY}
                                    onWatchPress={handleWatchPress}
                                />
                            )}
                            keyExtractor={(item, index) => `${item.id}-${item.type}-${index}`}
                            extraData={{ recentlyAired, missedSequels, trendingMedia, rawAnimeCollection }}
                            ListFooterComponent={(
                                <View className="gap-4">
                                    {!homeItems.some(item => item.type === "local-anime-library") && <ServerLocalAnimeList />}
                                    <DownloadedAnimeList showOfflineEmptyState={serverLocalAnime.length === 0} />
                                </View>
                            )}
                            ListEmptyComponent={isConnected && continueWatchingList.length === 0 ? (
                                <LuffyError
                                    title="Your anime library is empty"
                                    description="Add anime to your collection or use the Discover tab to find something to watch."
                                />
                            ) : null}
                            contentInsetAdjustmentBehavior="never"
                            contentContainerStyle={{
                                paddingTop: hasHero ? 0 : searchHeaderHeight,
                                paddingBottom: 80,
                            }}
                            showsVerticalScrollIndicator={false}
                            refreshControl={refreshControl}
                            initialNumToRender={2}
                            maxToRenderPerBatch={2}
                            updateCellsBatchingPeriod={16}
                            windowSize={5}
                            removeClippedSubviews={false}
                            onScroll={scrollHandler}
                            scrollEventThrottle={16}
                        />
                    )}

                    {isConnected && (
                        <LibrarySearchHeader
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search anime..."
                            scrollY={scrollY}
                            hasHero={hasHero}
                        />
                    )}
                </View>
            </TabFadeView>
        </View>
    )
}

const MOBILE_HOME_ITEM_TITLES: Readonly<Record<string, string>> = {
    "anime-continue-watching": "Continue watching",
    "anime-library": "Anime library",
    "my-lists": "My lists",
    "local-anime-library": "On Seanime Server",
    "aired-recently": "Aired recently",
    "missed-sequels": "You might have missed",
    "discover-header": "Trending right now",
    "anime-carousel": "Anime",
}

const MOBILE_LIBRARY_LABELS: Readonly<Record<string, string>> = {
    CURRENT: "Currently watching",
    REPEATING: "Repeating",
    PAUSED: "Paused",
    PLANNING: "Planning",
    COMPLETED: "Completed",
    DROPPED: "Dropped",
}

function mobileHomeItemTitle(item: Models_HomeItem) {
    return getHomeItemStringOption(item, "name")
        ?? MOBILE_HOME_ITEM_TITLES[item.type]
        ?? item.type
}

function getMobileLibrarySections(item: Models_HomeItem, lists: Anime_LibraryCollectionList[]) {
    const selectedStatuses = getHomeItemStringArrayOption(item, "statuses")

    return lists.flatMap(list => {
        const type = list.type
        if (!type || (selectedStatuses.length > 0 && !selectedStatuses.includes(type))) return []

        const media = list.entries?.map(entry => entry.media).filter(Boolean) as AL_BaseAnime[] ?? []
        if (media.length === 0) return []

        return [{
            key: type,
            title: MOBILE_LIBRARY_LABELS[type] ?? type,
            media,
        }]
    })
}

function getMobileRawListSections(item: Models_HomeItem, collection: AL_AnimeCollection | undefined) {
    const options = item.options && typeof item.options === "object" && !Array.isArray(item.options)
        ? item.options as Record<string, unknown>
        : {}
    if (options.type === "manga") return []

    const statuses = getHomeItemStringArrayOption(item, "statuses")
    const customListName = getHomeItemStringOption(item, "customListName")
    const lists = collection?.MediaListCollection?.lists ?? []

    if (customListName) {
        const custom = lists.find(list => list.name?.trim() === customListName)
        const media = custom?.entries?.map(entry => entry.media).filter(Boolean) as AL_BaseAnime[] ?? []
        return media.length > 0 ? [{ key: `custom-${customListName}`, title: customListName, media }] : []
    }

    return lists.flatMap(list => {
        const status = list.status
        if (list.isCustomList || !status || (statuses.length > 0 && !statuses.includes(status))) return []
        const media = list.entries?.map(entry => entry.media).filter(Boolean) as AL_BaseAnime[] ?? []
        if (media.length === 0) return []
        return [{ key: status, title: MOBILE_LIBRARY_LABELS[status] ?? status, media }]
    })
}

type MobileHomeItemViewProps = {
    item: Models_HomeItem
    index: number
    continueWatchingList: ContinueWatchingItem[]
    libraryCollectionList: Anime_LibraryCollectionList[]
    rawAnimeCollection?: AL_AnimeCollection
    hasNonLocalEpisodes: boolean
    recentlyAired: AL_BaseAnime[]
    missedSequels: AL_BaseAnime[]
    trendingMedia: AL_BaseAnime[]
    isFocused: boolean
    scrollY: SharedValue<number>
    onWatchPress: (item: ContinueWatchingItem) => void
}

function MobileHomeItemView({
    item,
    index,
    continueWatchingList,
    libraryCollectionList,
    rawAnimeCollection,
    hasNonLocalEpisodes,
    recentlyAired,
    missedSequels,
    trendingMedia,
    isFocused,
    scrollY,
    onWatchPress,
}: MobileHomeItemViewProps) {
    switch (item.type) {
        case "anime-continue-watching-header":
            return continueWatchingList.length > 0 ? (
                <LibraryHeroCarousel
                    type="anime"
                    animeItems={continueWatchingList}
                    isFocused={isFocused}
                    scrollY={scrollY}
                    onWatchPress={onWatchPress}
                />
            ) : null

        case "anime-continue-watching":
            return <ContinueWatching items={continueWatchingList} />

        case "anime-library": {
            const sections = getMobileLibrarySections(item, libraryCollectionList)
            return (
                <View className="gap-4">
                    {sections.map(section => (
                        <HorizontalMediaCardList
                            key={`${item.id}-${section.key}`}
                            title={section.title}
                            type="anime"
                            media={section.media}
                            hideLibraryBadge={section.key !== "CURRENT" || !hasNonLocalEpisodes}
                        />
                    ))}
                </View>
            )
        }

        case "my-lists": {
            const sections = getMobileRawListSections(item, rawAnimeCollection)
            return (
                <View className="gap-4">
                    {sections.map(section => (
                        <HorizontalMediaCardList
                            key={`${item.id}-${section.key}`}
                            title={section.title}
                            type="anime"
                            media={section.media}
                        />
                    ))}
                </View>
            )
        }

        case "local-anime-library":
            return <ServerLocalAnimeList title={mobileHomeItemTitle(item)} />

        case "aired-recently":
            return (
                <HorizontalMediaCardList
                    title={mobileHomeItemTitle(item)}
                    type="anime"
                    media={recentlyAired}
                    showAudienceScore
                />
            )

        case "missed-sequels":
            return (
                <HorizontalMediaCardList
                    title={mobileHomeItemTitle(item)}
                    type="anime"
                    media={missedSequels}
                    showAudienceScore
                />
            )

        case "discover-header":
            return (
                <HorizontalMediaCardList
                    title={mobileHomeItemTitle(item)}
                    type="anime"
                    media={trendingMedia}
                    showAudienceScore
                />
            )

        case "anime-carousel":
            return <MobileAnimeCarousel item={item} />

        case "centered-title": {
            const title = getHomeItemStringOption(item, "text")
            return title ? (
                <Text className="px-5 py-3 text-center text-2xl font-bold text-foreground">
                    {title}
                </Text>
            ) : null
        }

        default:
            return null
    }
}

function MobileAnimeCarousel({ item }: { item: Models_HomeItem }) {
    const options = item.options && typeof item.options === "object" && !Array.isArray(item.options)
        ? item.options as Record<string, unknown>
        : {}
    const variables = React.useMemo(() => ({
        page: 1,
        perPage: 20,
        sort: [typeof options.sorting === "string" ? options.sorting : "SCORE_DESC"],
        status: Array.isArray(options.status) ? options.status : ["RELEASING", "FINISHED"],
        format: typeof options.format === "string" ? options.format : undefined,
        genres: Array.isArray(options.genres) ? options.genres.filter((entry): entry is string => typeof entry === "string") : undefined,
        season: typeof options.season === "string" ? options.season : undefined,
        seasonYear: typeof options.year === "number" && Number.isFinite(options.year) ? options.year : undefined,
        countryOfOrigin: typeof options.countryOfOrigin === "string" ? options.countryOfOrigin : undefined,
    }), [options])
    const { data } = useAnilistListAnime(variables as any, true)
    const media = data?.Page?.media?.filter(Boolean) as AL_BaseAnime[] ?? []

    return (
        <HorizontalMediaCardList
            title={mobileHomeItemTitle(item)}
            type="anime"
            media={media}
            showAudienceScore
        />
    )
}
