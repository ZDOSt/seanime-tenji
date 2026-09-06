import { cn } from "@/lib/utils"
import { Ionicons } from "@expo/vector-icons"
import * as React from "react"
import { Animated, Platform, Pressable, Text, TouchableOpacity, View } from "react-native"
import { useTVFocus } from "@/components/tv/tv-focus"
import { tvSize } from "@/components/tv/tv-scale"

type OptionRowProps = {
    label: string
    detail?: string
    active: boolean
    onPress: () => void
    className?: string
    monoDetail?: boolean
    preferred?: boolean
}

const BRAND_ACCENT = "rgb(97 82 223)"

/**
 * A single-select row for use inside a grouped Surface container.
 *
 * Shows a filled brand checkmark when active, an empty circle outline
 * when inactive. Pair with `RowDivider` between rows.
 *
 * @example
 * <Surface variant="muted" className="overflow-hidden">
 *   {options.map((opt, i) => (
 *     <React.Fragment key={opt.id}>
 *       {i > 0 && <RowDivider />}
 *       <OptionRow
 *         label={opt.label}
 *         detail={opt.sublabel}
 *         active={selected === opt.id}
 *         onPress={() => setSelected(opt.id)}
 *       />
 *     </React.Fragment>
 *   ))}
 * </Surface>
 */
export function OptionRow({
    label,
    detail,
    active,
    onPress,
    className,
    monoDetail = true,
    preferred = false,
}: OptionRowProps) {
    const focusState = useTVFocus(1.01, label)

    if (Platform.isTV) {
        return (
            <Pressable
                className={cn("flex-row items-center", className)}
                focusable
                hasTVPreferredFocus={preferred}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onFocus={focusState.focus}
                onBlur={focusState.blur}
                onPress={onPress}
                style={{ minHeight: tvSize(68) }}
            >
                <Animated.View
                    style={[
                        focusState.style,
                        {
                            flex: 1,
                            minHeight: tvSize(68),
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: tvSize(22),
                            gap: tvSize(18),
                            borderWidth: tvSize(2),
                            borderColor: focusState.focused ? "#ffffff" : "transparent",
                            backgroundColor: focusState.focused
                                ? "rgba(255,255,255,0.12)"
                                : "transparent",
                        },
                    ]}
                >
                    <View style={{ flex: 1, gap: tvSize(2) }}>
                        <Text className="text-white font-semibold" style={{ fontSize: tvSize(21) }}>
                            {label}
                        </Text>
                        {detail ? (
                            <Text className="text-white/40" style={{ fontSize: tvSize(16) }} numberOfLines={1}>
                                {detail}
                            </Text>
                        ) : null}
                    </View>
                    {active ? (
                        <Ionicons name="checkmark-circle" size={tvSize(28)} color={"#b8b0ff"} />
                    ) : (
                        <View
                            style={{
                                width: tvSize(28),
                                height: tvSize(28),
                                borderRadius: tvSize(14),
                                borderWidth: tvSize(2),
                                borderColor: "rgba(255,255,255,0.75)",
                            }}
                        />
                    )}
                </Animated.View>
            </Pressable>
        )
    }

    return (
        <TouchableOpacity
            className={cn("flex-row items-center px-4 py-3.5", className)}
            activeOpacity={0.7}
            onPress={onPress}
        >
            <View className="flex-1 mr-3">
                <Text className="text-foreground text-sm font-medium">{label}</Text>
                {/* {detail ? (
                 <Text
                 className={cn(
                 "text-white/35 text-xs mt-0.5",
                 monoDetail && "font-mono",
                 )}
                 numberOfLines={1}
                 >
                 {detail}
                 </Text>
                 ) : null} */}
            </View>
            {active ? (
                <Ionicons name="checkmark-circle" size={20} color={BRAND_ACCENT} />
            ) : (
                <View className="w-5 h-5 rounded-full border border-white/20" />
            )}
        </TouchableOpacity>
    )
}
