import { SeaBottomSheet } from "@/components/ui/bottom-sheet"
import { Ionicons } from "@expo/vector-icons"
import React from "react"
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native"
import type { AioStreamsResult } from "./use-aiostreams-plugin-controller"
import { type AioStreamsIdMode, aioModeLabel } from "@/lib/player/aiostreams-mode"
import { formatBytes } from "@/lib/player/format-bytes"

type Props = {
    open: boolean
    loading: boolean
    title: string
    results: AioStreamsResult[]
    error?: string | null
    onClose: () => void
    onSelect: (result: AioStreamsResult, index: number) => void
    /** Kitsu / IMDb tabs — the plugin's own "Preferred Media ID" setting, switched for you. */
    modes?: AioStreamsIdMode[]
    mode?: AioStreamsIdMode
    switching?: boolean
    onSelectMode?: (mode: AioStreamsIdMode) => void
    /** On-device readout of what the plugin actually sent back (see the controller). */
    debug?: { states: number, loading: boolean | null, results: number, sends: number, dropped: number, note: string }
    /** A message the plugin itself raised (e.g. it could not identify the anime). */
    pluginToast?: string | null
}

export function AioStreamsResultPicker({ open, loading, title, results, error, onClose, onSelect, modes, mode, switching, onSelectMode, debug, pluginToast }: Props) {
    const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null)
    const [focusedMode, setFocusedMode] = React.useState<AioStreamsIdMode | null>(null)

    React.useEffect(() => {
        if (!open || loading) setFocusedIndex(null)
    }, [open, loading])

    return (
        <SeaBottomSheet open={open} onOpenChange={value => !value && onClose()} title={title} snapPoints={["78%", "94%"]}>
            <View className="gap-3">
                {!!modes?.length && !!onSelectMode && (
                    <View className="flex-row items-center gap-2">
                        <Text className="text-white/35 text-[11px] font-semibold uppercase tracking-wider">IDs</Text>
                        {modes.map(m => {
                            const active = m === mode
                            const focused = Platform.isTV && focusedMode === m
                            return (
                                <Pressable
                                    key={m}
                                    onPress={() => onSelectMode(m)}
                                    focusable
                                    accessibilityRole="button"
                                    // Never `disabled`: on TV a disabled Pressable cannot take focus, so the
                                    // user would lose the D-pad position mid-switch and be unable to switch back
                                    accessibilityState={{ selected: active }}
                                    onFocus={Platform.isTV ? () => setFocusedMode(m) : undefined}
                                    onBlur={Platform.isTV ? () => setFocusedMode(current => current === m ? null : current) : undefined}
                                    // On TV the focused tab must be unmistakable: a remote user has no
                                    // pointer, so focus gets the brand border and a filled background.
                                    className={`rounded-lg px-3 py-2 border ${
                                        focused
                                            ? "bg-brand-500/80 border-brand-400"
                                            : active
                                                ? "bg-brand-500/40 border-brand-400"
                                                : "bg-white/[0.06] border-white/15"
                                    } ${switching && !active ? "opacity-50" : ""}`}
                                    style={Platform.isTV ? { borderWidth: 3 } : undefined}
                                >
                                    <Text className={`text-xs font-semibold ${active ? "text-white" : "text-white/70"}`}>
                                        {aioModeLabel(m)}{switching && active ? " · switching…" : ""}
                                    </Text>
                                </Pressable>
                            )
                        })}
                        <Text className="text-white/30 text-[11px] flex-1" numberOfLines={1}>
                            {switching ? "Switching the plugin's Preferred Media ID…" : "Preferred Media ID"}
                        </Text>
                    </View>
                )}
                {!!pluginToast && (
                    <Text className="text-amber-300 text-xs" numberOfLines={3}>Plugin says: {pluginToast}</Text>
                )}
                {loading && (
                    <View className="items-center py-8 gap-3">
                        <ActivityIndicator color="#a4f4cf" />
                        <Text className="text-white/60">Loading AIOStreams results...</Text>
                    </View>
                )}
                {!loading && error && <Text className="text-red-300 py-6">{error}</Text>}
                {!loading && !error && results.length === 0 && <Text className="text-white/60 py-6">No AIOStreams results found.</Text>}
                {!loading && results.map((result, index) => {
                    const focused = Platform.isTV && focusedIndex === index
                    const name = result.name || result.filename || result.folderName || `Result ${index + 1}`
                    const size = formatBytes(result.size)
                    const details = [result.resolution, result.service, size, result.cached ? "Cached" : null, result.seeders ? `${result.seeders} seeders` : null]
                        .filter(Boolean)
                        .join(" · ")
                    return (
                        <Pressable
                            key={`${result.infoHash ?? result.url ?? index}-${index}`}
                            onPress={() => onSelect(result, index)}
                            focusable
                            accessibilityRole="button"
                            onFocus={Platform.isTV ? () => setFocusedIndex(index) : undefined}
                            onBlur={Platform.isTV ? () => setFocusedIndex(current => current === index ? null : current) : undefined}
                            className={`rounded-xl border bg-white/[0.06] px-4 py-4 active:border-brand-400 ${focused ? "border-brand-400" : "border-white/10"}`}
                            style={Platform.isTV ? {
                                // Keep the border width constant so moving focus doesn't shift the list.
                                borderWidth: 3,
                            } : undefined}
                        >
                            <View className="flex-row items-start gap-3">
                                <Ionicons name={result.type === "p2p" ? "magnet-outline" : "play-circle-outline"} size={22} color="#a4f4cf" />
                                <View className="flex-1 gap-1">
                                    <Text className="text-white font-semibold" numberOfLines={3}>{name}</Text>
                                    {!!details && <Text className="text-white/55 text-xs">{details}</Text>}
                                    {/* The plugin packs the provider, the full filename, the size/bitrate
                                        and the cached/debrid badges into `description`, line by line. It was
                                        being cut to two lines, which is why TV/mobile showed far less than
                                        the desktop panel — show it all. */}
                                    {!!result.description && (
                                        <Text className="text-white/40 text-xs">{result.description}</Text>
                                    )}
                                </View>
                            </View>
                        </Pressable>
                    )
                })}
            </View>
        </SeaBottomSheet>
    )
}
