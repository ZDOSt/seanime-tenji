import { TVFilterChoiceRow } from "@/components/tv/tv-filter-choice-row"
import { TVInput, type TVInputHandle } from "@/components/tv/tv-input"
import { tvSize } from "@/components/tv/tv-scale"
import { filterMediaTags, type MediaTag } from "@/lib/search/tag-filter"
import * as React from "react"
import { Text, View } from "react-native"

type Props = {
    catalog: readonly MediaTag[]
    search: string
    selected: readonly string[]
    allowAdult: boolean
    onSearch: (value: string) => void
    onToggle: (value: string) => void
}

export const TVTagFilter = React.memo(function TVTagFilter({
    catalog,
    search,
    selected,
    allowAdult,
    onSearch,
    onToggle,
}: Props) {
    const inputRef = React.useRef<TVInputHandle>(null)

    const choices = React.useMemo(
        () => filterMediaTags(catalog, search, allowAdult, [], 80),
        [allowAdult, catalog, search],
    )
    const shown = React.useMemo(
        () => new Set(choices.map(tag => tag.name)),
        [choices],
    )
    const hidden = React.useMemo(
        () => selected.filter(tag => !shown.has(tag)),
        [selected, shown],
    )
    const removeHidden = React.useCallback((value: string) => {
        onToggle(value)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => inputRef.current?.requestTVFocus())
        })
    }, [onToggle])

    return (
        <View style={{ gap: tvSize(8) }}>
            <Text className="font-semibold text-white/55" style={{ fontSize: tvSize(17) }}>
                Tags
            </Text>
            <TVInput
                ref={inputRef}
                value={search}
                onChangeText={onSearch}
                placeholder="Find a tag"
                autoCorrect={false}
                autoCapitalize="none"
            />
            {hidden.length > 0 ? (
                <TVFilterChoiceRow
                    label="Selected tags"
                    values={hidden.map(value => ({ value, label: value }))}
                    selected={() => true}
                    onPress={removeHidden}
                />
            ) : null}
            <TVFilterChoiceRow
                label={choices.length === 80 ? "First 80 matches" : `${choices.length} matches`}
                values={choices.map(tag => ({ value: tag.name, label: tag.name }))}
                selected={value => selected.includes(value)}
                onPress={onToggle}
            />
        </View>
    )
})
