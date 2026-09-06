import { SeaBottomSheet } from "@/components/ui/bottom-sheet"
import { Ionicons } from "@expo/vector-icons"
import React from "react"
import { ActivityIndicator, Pressable, Text, View } from "react-native"
import type { AioStreamsResult } from "./use-aiostreams-plugin-controller"

type Props = {
    open: boolean
    loading: boolean
    title: string
    results: AioStreamsResult[]
    error?: string | null
    onClose: () => void
    onSelect: (result: AioStreamsResult, index: number) => void
}

export function AioStreamsResultPicker({ open, loading, title, results, error, onClose, onSelect }: Props) {
    return (
        <SeaBottomSheet open={open} onOpenChange={value => !value && onClose()} title={title} snapPoints={["78%", "94%"]}>
            <View className="gap-3">
                {loading && (
                    <View className="items-center py-8 gap-3">
                        <ActivityIndicator color="#a4f4cf" />
                        <Text className="text-white/60">Loading AIOStreams results...</Text>
                    </View>
                )}
                {!loading && error && <Text className="text-red-300 py-6">{error}</Text>}
                {!loading && !error && results.length === 0 && <Text className="text-white/60 py-6">No AIOStreams results found.</Text>}
                {!loading && results.map((result, index) => {
                    const name = result.name || result.filename || result.folderName || `Result ${index + 1}`
                    const details = [result.resolution, result.service, result.cached ? "Cached" : null, result.seeders ? `${result.seeders} seeders` : null]
                        .filter(Boolean)
                        .join(" · ")
                    return (
                        <Pressable
                            key={`${result.infoHash ?? result.url ?? index}-${index}`}
                            onPress={() => onSelect(result, index)}
                            focusable
                            className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-4 active:border-brand-400"
                        >
                            <View className="flex-row items-start gap-3">
                                <Ionicons name={result.type === "p2p" ? "magnet-outline" : "play-circle-outline"} size={22} color="#a4f4cf" />
                                <View className="flex-1 gap-1">
                                    <Text className="text-white font-semibold" numberOfLines={2}>{name}</Text>
                                    {!!details && <Text className="text-white/55 text-xs" numberOfLines={2}>{details}</Text>}
                                    {!!result.description && <Text className="text-white/35 text-xs" numberOfLines={2}>{result.description}</Text>}
                                </View>
                            </View>
                        </Pressable>
                    )
                })}
            </View>
        </SeaBottomSheet>
    )
}
