import type { AnilistListAnime_Variables } from "@/api/generated/endpoint.types"
import type {
    AL_AnimeCollection,
    AL_BaseAnime,
    AL_MediaFormat,
    AL_MediaSeason,
    AL_MediaSort,
    AL_MediaStatus,
    Continuity_WatchHistory,
    Models_HomeItem,
} from "@/api/generated/types"
import { useAnilistListAnime, useAnilistListMissedSequels, useGetRawAnimeCollection } from "@/api/hooks/anilist.hooks"
import { getEpisodePercentageComplete, useGetContinuityWatchHistory } from "@/api/hooks/continuity.hooks"
import { useGetHomeItems } from "@/api/hooks/status.hooks"
import { animeEntryPlaybackIntentAtom, createAnimeEntryPlaybackIntent } from "@/atoms/anime-entry.atoms"
import { useServerStatus } from "@/atoms/server.atoms"
import { useDiscoverRecentlyAired, useDiscoverTrendingAnime } from "@/components/features/discover/discover-queries"
import {
    TV,
    TVContinueCard,
    TVHeroCarousel,
    type TVHeroItem,
    TVInput,
    TVMediaGrid,
    TVPageSkeleton,
    TVSectionHeader,
    TVShelf,
    tvSize,
} from "@/components/tv"
import type { TVMediaMeta } from "@/components/tv/tv-shelf"
import { ContinueWatchingItem, useAnimeLibraryCollection } from "@/hooks/use-anime-library-collection"
import { getContinueWatchingSpoilerActive, getEpisodeSpoilerState, getSpoilerSafeAnimeImage } from "@/lib/anime-spoilers"
import { Ionicons } from "@/lib/icons/Ionicons"
import { cleanHtml, mediaTitle } from "@/lib/media-metadata"
import { getServerLocalEpisodeCount, parseServerLocalAnimeEntry, useIsServerConnected, useServerLocalAnimeRecords } from "@/lib/offline"
import { filterEntriesByTitle } from "@/lib/utils/filtering"
import {
    getHomeItemOptions,
    getHomeItemStringArrayOption,
    getHomeItemStringOption,
    normalizeTVHomeItems,
} from "@/lib/home/home-items"
import { router, useFocusEffect, useIsFocused } from "expo-router"
import { useSetAtom } from "jotai"
import * as React from "react"
import { FlatList, ScrollView, Text, TVFocusGuideView, View } from "react-native"
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated"

type Shelf = {
    key: string
    title: string
    media: AL_BaseAnime[]
    badgeById?: ReadonlyMap<number, string>
    metaById?: ReadonlyMap<number, TVMediaMeta>
    hideLibraryBadge?: boolean
    hideProgress?: boolean
    onMediaPress?: (media: AL_BaseAnime) => void
}

const HOME_ITEM_TITLES: Readonly<Record<string, string>> = {
    "anime-continue-watching": "Continue watching",
    "anime-library": "Anime library",
    "my-lists": "My lists",
    "local-anime-library": "On Seanime Server",
    "aired-recently": "Aired recently",
    "missed-sequels": "You might have missed",
    "discover-header": "Trending right now",
    "anime-carousel": "Anime",
}

function homeItemTitle(item: Models_HomeItem) {
    return getHomeItemStringOption(item, "name")
        ?? HOME_ITEM_TITLES[item.type]
        ?? item.type
}

function asMediaSort(value: unknown): AL_MediaSort {
    // The web client historically stored *_ASC aliases for the ascending
    // title sorts even though the generated API enum omits that suffix.
    const aliases: Readonly<Record<string, AL_MediaSort>> = {
        TITLE_ROMAJI_ASC: "TITLE_ROMAJI",
        TITLE_ENGLISH_ASC: "TITLE_ENGLISH",
    }
    if (typeof value !== "string") return "SCORE_DESC"
    if (Object.prototype.hasOwnProperty.call(aliases, value)) return aliases[value]

    const valid: AL_MediaSort[] = [
        "ID", "ID_DESC", "TITLE_ROMAJI", "TITLE_ROMAJI_DESC", "TITLE_NATIVE", "TITLE_NATIVE_DESC",
        "TITLE_ENGLISH", "TITLE_ENGLISH_DESC", "TYPE", "TYPE_DESC", "FORMAT", "FORMAT_DESC",
        "START_DATE", "START_DATE_DESC", "END_DATE", "END_DATE_DESC", "SCORE", "SCORE_DESC",
        "POPULARITY", "POPULARITY_DESC", "TRENDING", "TRENDING_DESC", "EPISODES", "EPISODES_DESC",
        "DURATION", "DURATION_DESC", "STATUS", "STATUS_DESC", "UPDATED_AT", "UPDATED_AT_DESC",
        "FAVOURITES", "FAVOURITES_DESC",
    ]
    return valid.includes(value as AL_MediaSort) ? value as AL_MediaSort : "SCORE_DESC"
}

function asMediaStatuses(value: unknown): AL_MediaStatus[] | undefined {
    if (!Array.isArray(value)) return undefined

    const valid: AL_MediaStatus[] = ["RELEASING", "FINISHED", "NOT_YET_RELEASED", "CANCELLED", "HIATUS"]
    const statuses = value.filter((entry): entry is AL_MediaStatus => typeof entry === "string" && valid.includes(entry as AL_MediaStatus))
    return statuses.length > 0 ? statuses : undefined
}

function asMediaFormat(value: unknown): AL_MediaFormat | undefined {
    const valid: AL_MediaFormat[] = ["TV", "TV_SHORT", "MOVIE", "SPECIAL", "OVA", "ONA", "MUSIC", "MANGA", "NOVEL", "ONE_SHOT"]
    return typeof value === "string" && valid.includes(value as AL_MediaFormat)
        ? value as AL_MediaFormat
        : undefined
}

function asMediaSeason(value: unknown): AL_MediaSeason | undefined {
    const valid: AL_MediaSeason[] = ["WINTER", "SPRING", "SUMMER", "FALL"]
    return typeof value === "string" && valid.includes(value as AL_MediaSeason)
        ? value as AL_MediaSeason
        : undefined
}

function getAnimeCarouselVariables(item: Models_HomeItem): AnilistListAnime_Variables {
    const options = getHomeItemOptions(item)
    const year = options.year
    const genres = getHomeItemStringArrayOption(item, "genres")

    return {
        page: 1,
        perPage: 20,
        sort: [asMediaSort(options.sorting)],
        status: asMediaStatuses(options.status) ?? ["RELEASING", "FINISHED"],
        format: asMediaFormat(options.format),
        genres: genres.length > 0 ? genres : undefined,
        season: asMediaSeason(options.season),
        seasonYear: typeof year === "number" && Number.isFinite(year) ? year : undefined,
        countryOfOrigin: getHomeItemStringOption(item, "countryOfOrigin"),
    }
}

const LABELS: Record<string, string> = {
    CURRENT: "Currently watching",
    REPEATING: "Repeating",
    PAUSED: "Paused",
    PLANNING: "Planning",
    COMPLETED: "Completed",
    DROPPED: "Dropped",
}

export function TVLibraryScreen() {
    const serverStatus = useServerStatus()
    const isConnected = useIsServerConnected()
    const isFocused = useIsFocused()
    const setPlaybackIntent = useSetAtom(animeEntryPlaybackIntentAtom)
    const localRecords = useServerLocalAnimeRecords()
    const { data: watchHistory } = useGetContinuityWatchHistory()
    const { data: serverHomeItems } = useGetHomeItems()
    const [search, setSearch] = React.useState("")
    const deferredSearch = React.useDeferredValue(search)
    const scrollY = useSharedValue(0)
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y
        },
    })
    const searchSlideDistance = tvSize(20)
    const searchAnimatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [0, 80], [1, 0], Extrapolation.CLAMP)
        const translateY = interpolate(scrollY.value, [0, 80], [0, -searchSlideDistance], Extrapolation.CLAMP)
        return { opacity, transform: [{ translateY }] }
    })
    const {
        libraryCollectionList,
        continueWatchingList,
        isLoading,
        refetch,
        hasNonLocalEpisodes,
    } = useAnimeLibraryCollection()

    const homeItems = React.useMemo(
        () => serverHomeItems?.length ? normalizeTVHomeItems(serverHomeItems) : null,
        [serverHomeItems],
    )
    const homeItemTypes = React.useMemo(
        () => new Set(homeItems?.map(item => item.type) ?? []),
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

    const allEntries = React.useMemo(() => libraryCollectionList.flatMap(list => list?.entries ?? []), [libraryCollectionList])
    const searchMedia = React.useMemo(() => {
        if (!deferredSearch.trim()) return []
        return filterEntriesByTitle(allEntries, deferredSearch).map(item => item.media).filter((media): media is AL_BaseAnime => !!media)
    }, [allEntries, deferredSearch])
    const searching = search.trim().length > 0

    useFocusEffect(React.useCallback(() => {
        if (isConnected) refetch()
    }, [isConnected, refetch]))

    const shelves = React.useMemo<Shelf[]>(() => {
        const items: Shelf[] = []

        for (const list of libraryCollectionList) {
            const media = list?.entries?.map(entry => entry.media).filter(Boolean) as AL_BaseAnime[] ?? []
            if (!list?.type || media.length === 0) continue
            items.push({
                key: list.type,
                title: LABELS[list.type] ?? list.type,
                media,
                hideLibraryBadge: list.type !== "CURRENT" || !hasNonLocalEpisodes,
            })
        }

        const localMedia: AL_BaseAnime[] = []
        const localBadges = new Map<number, string>()
        const localMeta = new Map<number, TVMediaMeta>()
        for (const record of localRecords) {
            const entry = parseServerLocalAnimeEntry(record)
            if (!entry?.media) continue
            localMedia.push(entry.media)
            localBadges.set(record.mediaId, `Server · ${getServerLocalEpisodeCount(record)}`)
            localMeta.set(record.mediaId, {
                listData: entry.listData,
                libraryData: entry.libraryData,
                nakamaLibraryData: entry.nakamaLibraryData,
            })
        }
        if (localMedia.length > 0) {
            items.push({
                key: "server-local",
                title: "On Seanime Server",
                media: localMedia,
                badgeById: localBadges,
                metaById: localMeta,
                hideLibraryBadge: true,
                onMediaPress: media => router.push({
                    pathname: "/(app)/entry/anime/[id]",
                    params: { id: String(media.id), initialView: "server-local" },
                }),
            })
        }

        return items
    }, [hasNonLocalEpisodes, libraryCollectionList, localRecords])

    const openMedia = React.useCallback((id: number) => {
        router.push(`/(app)/entry/anime/${id}`)
    }, [])

    const openContinue = React.useCallback((item: ContinueWatchingItem) => {
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

    const heroItems = React.useMemo<TVHeroItem[]>(() => {
        const spoilerActive = getContinueWatchingSpoilerActive(serverStatus)

        return continueWatchingList
            .filter(item => !!item.episode.baseAnime)
            .slice(0, 12)
            .map(item => {
                const episode = item.episode
                const media = episode.baseAnime!
                const spoiler = getEpisodeSpoilerState(serverStatus, {
                    episodeNumber: episode.progressNumber || episode.episodeNumber,
                    spoilerActive,
                })
                return {
                    key: `${media.id}-${episode.progressNumber}`,
                    image: spoiler.hideThumbnail
                        ? getSpoilerSafeAnimeImage(media)
                        : media.bannerImage
                        ?? episode.episodeMetadata?.image
                        ?? media.coverImage?.extraLarge
                        ?? media.coverImage?.large,
                    kicker: "Continue watching",
                    title: mediaTitle(media),
                    subtitle: `${episode.displayTitle}${!spoiler.hideTitle && episode.episodeTitle ? `  ·  ${episode.episodeTitle}` : ""}`,
                    meta: [
                        media.seasonYear,
                        media.format?.replaceAll("_", " "),
                        media.genres?.slice(0, 3).join("  ·  "),
                    ].filter(Boolean).join("  ·  "),
                    description: cleanHtml(media.description),
                    score: media.meanScore,
                    progressPercent: getEpisodePercentageComplete(
                        watchHistory,
                        media.id,
                        episode.progressNumber,
                    ),
                    actionLabel: `Play ${episode.displayTitle}`,
                    onAction: () => openContinue(item),
                    secondaryLabel: "View details",
                    onSecondary: () => openMedia(media.id),
                }
            })
    }, [continueWatchingList, openContinue, openMedia, serverStatus, watchHistory])

    const trendingHeroItems = React.useMemo<TVHeroItem[]>(() => {
        const hideScore = serverStatus?.settings?.anilist?.hideAudienceScore ?? false

        return trendingMedia
            .slice(0, 12)
            .map(media => ({
                key: `discover-${media.id}`,
                image: media.bannerImage ?? media.coverImage?.extraLarge ?? media.coverImage?.large,
                kicker: "Trending right now",
                title: mediaTitle(media),
                meta: [
                    media.seasonYear,
                    media.format?.replaceAll("_", " "),
                    media.genres?.slice(0, 3).join("  ·  "),
                ].filter(Boolean).join("  ·  "),
                description: cleanHtml(media.description),
                score: hideScore ? undefined : media.meanScore,
                actionLabel: "Open anime",
                onAction: () => openMedia(media.id),
            }))
    }, [openMedia, serverStatus?.settings?.anilist?.hideAudienceScore, trendingMedia])

    const renderContinue = React.useCallback(({ item, index }: { item: ContinueWatchingItem; index: number }) => (
        <TVContinueCard
            item={item}
            preferred={index === 0}
            navOnUp={heroItems.length === 0}
            progressPercent={item.episode.baseAnime?.id
                ? getEpisodePercentageComplete(watchHistory, item.episode.baseAnime.id, item.episode.progressNumber)
                : 0}
            onPress={() => openContinue(item)}
        />
    ), [heroItems.length, openContinue, watchHistory])

    if (isLoading && isConnected) {
        return <TVPageSkeleton hero />
    }

    if (!homeItems && !shelves.length && !continueWatchingList.length && !searching) {
        return (
            <ScrollView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
                <View
                    style={{
                        flex: 1,
                        minHeight: tvSize(360),
                        alignItems: "center",
                        justifyContent: "center",
                        gap: tvSize(8),
                        paddingHorizontal: TV.gutter,
                        paddingTop: tvSize(100),
                    }}
                >
                    <Text className="font-bold text-white" style={{ fontSize: tvSize(30) }}>
                        {isConnected ? "Your anime library is empty" : "Server is offline"}
                    </Text>
                    <Text className="text-white/45" style={{ fontSize: tvSize(20) }}>
                        {isConnected ? "Use Discover to find something to watch." : "Reconnect to load the TV library."}
                    </Text>
                </View>
            </ScrollView>
        )
    }

    return (
        <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
            {isConnected ? (
                <Animated.View
                    pointerEvents="box-none"
                    style={[{
                        position: "absolute",
                        top: TV.navTop,
                        left: TV.gutter,
                        width: tvSize(480),
                        zIndex: 210,
                    }, searchAnimatedStyle]}
                >
                    <TVInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search your anime library"
                        placeholderTextColor="rgba(255,255,255,0.35)"
                        autoCorrect={false}
                        autoCapitalize="none"
                        returnKeyType="search"
                        preferred={heroItems.length === 0}
                        navOnUp
                        floating
                        containerStyle={{ borderRadius: tvSize(99) }}
                        icon={(
                            <Ionicons
                                name="search"
                                size={tvSize(22)}
                                color="rgba(255,255,255,0.58)"
                            />
                        )}
                    />
                </Animated.View>
            ) : null}

            {searching ? (
                <TVMediaGrid
                    media={searchMedia}
                    query={search}
                    topInset={TV.navInset}
                    emptyText="Try another title from your AniList library."
                />
            ) : homeItems ? (
                <TVHomeContent
                    items={homeItems}
                    heroItems={heroItems}
                    trendingHeroItems={trendingHeroItems}
                    recentlyAired={recentlyAired}
                    missedSequels={missedSequels ?? []}
                    continueWatchingList={continueWatchingList}
                    watchHistory={watchHistory}
                    shelves={shelves}
                    rawAnimeCollection={rawAnimeCollection}
                    isFocused={isFocused}
                    isLoading={isLoading}
                    openContinue={openContinue}
                    scrollHandler={scrollHandler}
                />
            ) : (
                <Animated.ScrollView
                    style={{ flex: 1 }}
                    fadingEdgeLength={{ start: TV.navInset + tvSize(18), end: 0 }}
                    contentContainerStyle={{
                        paddingBottom: tvSize(90),
                        gap: TV.sectionGap,
                    }}
                    showsVerticalScrollIndicator={false}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                >
                    <View style={{ gap: tvSize(34), paddingBottom: tvSize(8) }}>
                        <View
                            style={{
                                minHeight: heroItems.length > 0 || isLoading ? tvSize(560) : tvSize(32),
                            }}
                        >
                            <TVHeroCarousel items={heroItems} active={isFocused} preferred loading={isLoading} navOnUp />
                        </View>

                        {continueWatchingList.length > 0 ? (
                            <View style={{ gap: tvSize(12) }}>
                                <TVSectionHeader
                                    title="Continue watching"
                                    count={continueWatchingList.length}
                                />
                                <TVFocusGuideView trapFocusLeft trapFocusRight>
                                    <FlatList
                                        horizontal
                                        data={continueWatchingList}
                                        renderItem={renderContinue}
                                        keyExtractor={(item,
                                            index,
                                        ) => item.episode.localFile?.path || `${item.episode.baseAnime?.id ?? "episode"}-${item.episode.type}-${item.episode.episodeNumber}-${index}`}
                                        snapToAlignment="item"
                                        snapToItemPadding={TV.gutter}
                                        style={{ flexGrow: 0, overflow: "visible" }}
                                        contentContainerStyle={{
                                            paddingHorizontal: TV.gutter,
                                            paddingTop: tvSize(10),
                                            paddingBottom: tvSize(14),
                                            gap: TV.cardGap,
                                        }}
                                        showsHorizontalScrollIndicator={false}
                                        removeClippedSubviews={false}
                                        initialNumToRender={6}
                                        maxToRenderPerBatch={6}
                                        windowSize={5}
                                    />
                                </TVFocusGuideView>
                            </View>
                        ) : null}
                    </View>

                    {shelves.map((shelf, index) => (
                        <TVShelf
                            key={shelf.key}
                            title={shelf.title}
                            media={shelf.media}
                            badgeById={shelf.badgeById}
                            metaById={shelf.metaById}
                            hideLibraryBadge={shelf.hideLibraryBadge}
                            hideProgress={shelf.hideProgress}
                            onMediaPress={shelf.onMediaPress}
                            first={heroItems.length === 0 && index === 0}
                            navOnUp={heroItems.length === 0 && continueWatchingList.length === 0 && index === 0}
                        />
                    ))}
                </Animated.ScrollView>
            )}
        </View>
    )
}

type TVHomeContentProps = {
    items: Models_HomeItem[]
    heroItems: TVHeroItem[]
    trendingHeroItems: TVHeroItem[]
    recentlyAired: AL_BaseAnime[]
    missedSequels: AL_BaseAnime[]
    continueWatchingList: ContinueWatchingItem[]
    watchHistory: Continuity_WatchHistory | undefined
    shelves: Shelf[]
    rawAnimeCollection?: AL_AnimeCollection
    isFocused: boolean
    isLoading: boolean
    openContinue: (item: ContinueWatchingItem) => void
    scrollHandler: React.ComponentProps<typeof Animated.ScrollView>["onScroll"]
}

function TVHomeContent({
    items,
    heroItems,
    trendingHeroItems,
    recentlyAired,
    missedSequels,
    continueWatchingList,
    watchHistory,
    shelves,
    rawAnimeCollection,
    isFocused,
    isLoading,
    openContinue,
    scrollHandler,
}: TVHomeContentProps) {
    const firstFocusableIndex = React.useMemo(() => items.findIndex(item => {
        switch (item.type) {
            case "anime-continue-watching-header":
                return heroItems.length > 0
            case "discover-header":
                return trendingHeroItems.length > 0
            case "anime-continue-watching":
                return continueWatchingList.length > 0
            case "anime-library":
                return getLibraryShelvesForHomeItem(item, shelves).some(shelf => shelf.media.length > 0)
            case "my-lists":
                return getRawListShelves(item, rawAnimeCollection).some(shelf => shelf.media.length > 0)
            case "local-anime-library":
                return shelves.some(shelf => shelf.key === "server-local" && shelf.media.length > 0)
            case "aired-recently":
                return recentlyAired.length > 0
            case "missed-sequels":
                return missedSequels.length > 0
            case "anime-carousel":
                return true
            default:
                return false
        }
    }), [continueWatchingList.length, heroItems.length, missedSequels.length, recentlyAired.length, rawAnimeCollection, shelves, trendingHeroItems.length, items])

    return (
        <Animated.ScrollView
            style={{ flex: 1 }}
            fadingEdgeLength={{ start: TV.navInset + tvSize(18), end: 0 }}
            contentContainerStyle={{
                paddingBottom: tvSize(90),
                gap: TV.sectionGap,
            }}
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
        >
            {items.map((item, index) => (
                <TVHomeItemView
                    key={`${item.id}-${item.type}`}
                    item={item}
                    index={index}
                    navOnUp={index === firstFocusableIndex}
                    heroItems={heroItems}
                    trendingHeroItems={trendingHeroItems}
                    recentlyAired={recentlyAired}
                    missedSequels={missedSequels}
                    continueWatchingList={continueWatchingList}
                    watchHistory={watchHistory}
                    shelves={shelves}
                    rawAnimeCollection={rawAnimeCollection}
                    isFocused={isFocused}
                    isLoading={isLoading}
                    openContinue={openContinue}
                />
            ))}
        </Animated.ScrollView>
    )
}

type TVHomeItemViewProps = Omit<TVHomeContentProps, "items" | "scrollHandler"> & {
    item: Models_HomeItem
    index: number
    navOnUp: boolean
}

function TVHomeItemView({
    item,
    index,
    navOnUp,
    heroItems,
    trendingHeroItems,
    recentlyAired,
    missedSequels,
    continueWatchingList,
    watchHistory,
    shelves,
    rawAnimeCollection,
    isFocused,
    isLoading,
    openContinue,
}: TVHomeItemViewProps) {
    switch (item.type) {
        case "anime-continue-watching-header":
            return heroItems.length > 0 ? (
                <View style={{ minHeight: tvSize(560) }}>
                    <TVHeroCarousel items={heroItems} active={isFocused} preferred={index === 0} loading={isLoading} navOnUp={navOnUp} />
                </View>
            ) : null

        case "discover-header":
            return trendingHeroItems.length > 0 ? (
                <View style={{ minHeight: tvSize(560) }}>
                    <TVHeroCarousel items={trendingHeroItems} active={isFocused} preferred={index === 0} navOnUp={navOnUp} />
                </View>
            ) : null

        case "anime-continue-watching":
            return (
                <TVContinueShelf
                    items={continueWatchingList}
                    watchHistory={watchHistory}
                    onPress={openContinue}
                    title={homeItemTitle(item)}
                    navOnUp={navOnUp}
                />
            )

        case "anime-library": {
            const selectedShelves = getLibraryShelvesForHomeItem(item, shelves)
            return (
                <View style={{ gap: TV.sectionGap }}>
                    {selectedShelves.map((shelf, shelfIndex) => (
                        <TVShelf
                            key={`${item.id}-${shelf.key}`}
                            title={shelf.title}
                            media={shelf.media}
                            badgeById={shelf.badgeById}
                            metaById={shelf.metaById}
                            hideLibraryBadge={shelf.hideLibraryBadge}
                            hideProgress={shelf.hideProgress}
                            onMediaPress={shelf.onMediaPress}
                            first={index === 0 && shelfIndex === 0}
                            navOnUp={navOnUp && shelfIndex === 0}
                        />
                    ))}
                </View>
            )
        }

        case "my-lists": {
            const selectedShelves = getRawListShelves(item, rawAnimeCollection)
            return (
                <View style={{ gap: TV.sectionGap }}>
                    {selectedShelves.map((shelf, shelfIndex) => (
                        <TVShelf
                            key={`${item.id}-${shelf.key}`}
                            title={shelf.title}
                            media={shelf.media}
                            hideLibraryBadge
                            first={index === 0 && shelfIndex === 0}
                            navOnUp={navOnUp && shelfIndex === 0}
                        />
                    ))}
                </View>
            )
        }

        case "local-anime-library": {
            const localShelf = shelves.find(shelf => shelf.key === "server-local")
            if (!localShelf) return null

            return (
                <TVShelf
                    title={getHomeItemStringOption(item, "name") ?? localShelf.title}
                    media={localShelf.media}
                    badgeById={localShelf.badgeById}
                    metaById={localShelf.metaById}
                    hideLibraryBadge
                    onMediaPress={localShelf.onMediaPress}
                    first={index === 0}
                    navOnUp={navOnUp}
                />
            )
        }

        case "aired-recently":
            return (
                <TVShelf
                    title={homeItemTitle(item)}
                    media={recentlyAired}
                    showAudienceScore
                    first={index === 0}
                    navOnUp={navOnUp}
                />
            )

        case "missed-sequels":
            return (
                <TVShelf
                    title={homeItemTitle(item)}
                    media={missedSequels}
                    showAudienceScore
                    first={index === 0}
                    navOnUp={navOnUp}
                />
            )

        case "anime-carousel":
            return <TVHomeAnimeCarousel item={item} first={index === 0} navOnUp={navOnUp} />

        case "centered-title": {
            const title = getHomeItemStringOption(item, "text")
            return title ? (
                <Text
                    className="font-bold text-white"
                    style={{
                        paddingHorizontal: TV.gutter,
                        paddingVertical: tvSize(12),
                        textAlign: "center",
                        fontSize: tvSize(30),
                    }}
                >
                    {title}
                </Text>
            ) : null
        }

        default:
            // Manga, calendar, and stats items are not part of the anime TV home.
            return null
    }
}

function getLibraryShelvesForHomeItem(item: Models_HomeItem, shelves: Shelf[]) {
    const statuses = getHomeItemStringArrayOption(item, "statuses")
    const libraryShelves = shelves.filter(shelf => ["CURRENT", "REPEATING", "PAUSED", "PLANNING", "COMPLETED", "DROPPED"].includes(shelf.key))

    if (!statuses.length) return libraryShelves

    return libraryShelves.filter(shelf => statuses.includes(shelf.key))
}

function getRawListShelves(item: Models_HomeItem, collection: AL_AnimeCollection | undefined): Shelf[] {
    const options = getHomeItemOptions(item)
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
        return [{ key: status, title: LABELS[status] ?? status, media, hideLibraryBadge: true }]
    })
}

function TVContinueShelf({
    items,
    watchHistory,
    onPress,
    title,
    navOnUp = false,
}: {
    items: ContinueWatchingItem[]
    watchHistory: Continuity_WatchHistory | undefined
    onPress: (item: ContinueWatchingItem) => void
    title: string
    navOnUp?: boolean
}) {
    const renderItem = React.useCallback(({ item, index }: { item: ContinueWatchingItem; index: number }) => (
        <TVContinueCard
            item={item}
            preferred={index === 0}
            navOnUp={navOnUp}
            progressPercent={item.episode.baseAnime?.id
                ? getEpisodePercentageComplete(watchHistory, item.episode.baseAnime.id, item.episode.progressNumber)
                : 0}
            onPress={() => onPress(item)}
        />
    ), [navOnUp, onPress, watchHistory])

    if (items.length === 0) return null

    return (
        <View style={{ gap: tvSize(12) }}>
            <TVSectionHeader title={title} count={items.length} />
            <TVFocusGuideView trapFocusLeft trapFocusRight>
                <FlatList
                    horizontal
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => item.episode.localFile?.path
                        || `${item.episode.baseAnime?.id ?? "episode"}-${item.episode.type}-${item.episode.episodeNumber}-${index}`}
                    snapToAlignment="item"
                    snapToItemPadding={TV.gutter}
                    style={{ flexGrow: 0, overflow: "visible" }}
                    contentContainerStyle={{
                        paddingHorizontal: TV.gutter,
                        paddingTop: tvSize(10),
                        paddingBottom: tvSize(14),
                        gap: TV.cardGap,
                    }}
                    showsHorizontalScrollIndicator={false}
                    removeClippedSubviews={false}
                    initialNumToRender={6}
                    maxToRenderPerBatch={6}
                    windowSize={5}
                />
            </TVFocusGuideView>
        </View>
    )
}

function TVHomeAnimeCarousel({ item, first, navOnUp = false }: { item: Models_HomeItem; first: boolean; navOnUp?: boolean }) {
    const variables = React.useMemo(() => getAnimeCarouselVariables(item), [item])
    const { data, isLoading } = useAnilistListAnime(variables, true)
    const media = React.useMemo(
        () => data?.Page?.media?.filter(Boolean) as AL_BaseAnime[] ?? [],
        [data?.Page?.media],
    )

    if (isLoading && media.length === 0) return null

    return (
        <TVShelf
            title={homeItemTitle(item)}
            media={media}
            showAudienceScore
            first={first}
            navOnUp={navOnUp}
        />
    )
}
