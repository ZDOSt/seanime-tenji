import type { AL_BaseAnime } from "@/api/generated/types"
import { useInfiniteAnimeSearch } from "@/api/hooks/search.hooks"
import {
    TVButton,
    TVInput,
    type TVInputHandle,
    TVMediaGrid,
    TVSearchFilterDrawer,
    TVToolbar,
    tvSize,
} from "@/components/tv"
import {
    getActiveFiltersCount,
    isSearchActive,
    searchParamsAtom,
    type SearchParams,
} from "@/lib/search/search.atoms"
import Ionicons from "@expo/vector-icons/Ionicons"
import { router, useFocusEffect } from "expo-router"
import { useAtom } from "jotai"
import * as React from "react"
import {
    ActivityIndicator,
    View,
} from "react-native"

export function TVSearchScreen() {
    const [params, setParams] = useAtom(searchParamsAtom)
    const [input, setInput] = React.useState(params.title ?? "")
    const [filterOpen, setFilterOpen] = React.useState(false)
    const inputRef = React.useRef<TVInputHandle>(null)

    useFocusEffect(React.useCallback(() => {
        const timer = setTimeout(() => {
            inputRef.current?.requestTVFocus()
        }, 100)

        return () => clearTimeout(timer)
    }, []))

    const submit = React.useCallback(() => {
        setParams(current => ({
            ...current,
            type: "anime",
            title: input.trim() || null,
        }))
    }, [input, setParams])

    const shouldQuery = isSearchActive(params)
    const search = useInfiniteAnimeSearch(params, shouldQuery)
    const media = React.useMemo(() => (
        search.data?.pages
            .flatMap(page => page?.Page?.media ?? [])
            .filter(Boolean) as AL_BaseAnime[] ?? []
    ), [search.data?.pages])
    const activeFilters = getActiveFiltersCount(params)

    const loadMore = React.useCallback(() => {
        if (search.hasNextPage && !search.isFetchingNextPage) {
            void search.fetchNextPage()
        }
    }, [search])

    const applyFilters = React.useCallback((next: SearchParams) => {
        setParams({ ...next, type: "anime", title: input.trim() || null })
    }, [input, setParams])

    return (
        <View className="flex-1 bg-background">
            <TVMediaGrid
                media={search.isLoading ? [] : media}
                query={params.title ?? undefined}
                showAudienceScore
                loadingMore={search.isFetchingNextPage}
                onEndReached={loadMore}
                header={(
                    <TVToolbar>
                        <TVButton
                            label="Back"
                            variant="ghost"
                            size="compact"
                            icon={<Ionicons name="arrow-back" size={tvSize(20)} color="white" />}
                            onPress={() => router.back()}
                        />
                        <View style={{ flex: 1, maxWidth: tvSize(760) }}>
                            <TVInput
                                ref={inputRef}
                                value={input}
                                onChangeText={setInput}
                                onSubmitEditing={submit}
                                placeholder="Search anime"
                                placeholderTextColor="rgba(255,255,255,0.35)"
                                autoCorrect={false}
                                autoCapitalize="none"
                                returnKeyType="search"
                                preferred
                                icon={(
                                    <Ionicons
                                        name="search"
                                        size={tvSize(22)}
                                        color="rgba(255,255,255,0.58)"
                                    />
                                )}
                            />
                        </View>
                        <TVButton
                            label="Search"
                            variant="primary"
                            size="compact"
                            icon={<Ionicons name="search" size={tvSize(20)} color="white" />}
                            onPress={submit}
                        />
                        <TVButton
                            label={activeFilters ? `Filters (${activeFilters})` : "Filters"}
                            variant="secondary"
                            size="compact"
                            icon={<Ionicons name="options-outline" size={tvSize(20)} color="white" />}
                            onPress={() => setFilterOpen(true)}
                        />
                    </TVToolbar>
                )}
                emptyComponent={search.isLoading ? (
                    <View
                        style={{
                            minHeight: tvSize(340),
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <ActivityIndicator size="large" color="#a89fff" />
                    </View>
                ) : undefined}
                emptyTitle={shouldQuery
                    ? (params.title ? `No results for “${params.title}”` : "No titles match these filters")
                    : "Search the AniList catalog"}
                emptyText={shouldQuery
                    ? "Try another title or change the filters."
                    : "Use the search box or filters above."}
            />

            <TVSearchFilterDrawer
                open={filterOpen}
                onOpenChange={setFilterOpen}
                params={params}
                onApply={applyFilters}
            />
        </View>
    )
}
