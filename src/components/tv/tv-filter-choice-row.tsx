import { TVPillButton } from "@/components/tv/tv-focus"
import { tvSize } from "@/components/tv/tv-scale"
import * as React from "react"
import { FlatList, Text, TVFocusGuideView, View } from "react-native"

export type TVFilterChoice = {
    value: string
    label: string
}

type Props = {
    label: string
    values: readonly TVFilterChoice[]
    selected: (value: string) => boolean
    onPress: (value: string) => void
    allowAll?: boolean
}

export const TVFilterChoiceRow = React.memo(function TVFilterChoiceRow({
    label,
    values,
    selected,
    onPress,
    allowAll,
}: Props) {
    const items = React.useMemo(
        () => allowAll ? [{ value: "", label: "All" }, ...values] : [...values],
        [allowAll, values],
    )

    return (
        <View style={{ gap: tvSize(8) }}>
            <Text className="font-semibold text-white/55" style={{ fontSize: tvSize(17) }}>
                {label}
            </Text>
            <TVFocusGuideView trapFocusLeft trapFocusRight>
                <FlatList
                    horizontal
                    data={items}
                    keyExtractor={item => item.value || "all"}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        padding: tvSize(8),
                        gap: tvSize(10),
                    }}
                    renderItem={({ item }) => (
                        <TVPillButton
                            label={item.label}
                            active={selected(item.value)}
                            onPress={() => onPress(item.value)}
                        />
                    )}
                />
            </TVFocusGuideView>
        </View>
    )
})
