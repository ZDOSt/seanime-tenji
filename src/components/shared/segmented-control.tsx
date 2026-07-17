import { cn } from "@/lib/utils"
import * as React from "react"
import { LayoutChangeEvent, Platform, Pressable, Text, View } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"

export type SegmentedControlOption<T extends string = string> = {
    value: T
    label: string
}

type SegmentedControlProps<T extends string = string> = {
    options: SegmentedControlOption<T>[]
    value: T
    onChange: (value: T) => void
}

export function SegmentedControl<T extends string = string>({ options, value, onChange }: SegmentedControlProps<T>) {
    const [width, setWidth] = React.useState(0)
    const activeIndex = options.findIndex(opt => opt.value === value)

    const translateX = useSharedValue(0)
    const padding = 4
    const pillWidth = width > 0 ? (width - padding * 2) / options.length : 0

    React.useEffect(() => {
        if (width > 0 && activeIndex !== -1) {
            translateX.value = withTiming(activeIndex * pillWidth, {
                duration: 180,
            })
        }
    }, [activeIndex, pillWidth, width])

    const handleLayout = (e: LayoutChangeEvent) => {
        setWidth(e.nativeEvent.layout.width)
    }

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
            width: pillWidth,
        }
    })

    return (
        <View
            onLayout={handleLayout}
            className="flex-row items-center bg-black/40 p-1 rounded-full border border-white/5 relative h-11"
        >
            {width > 0 && (
                <Animated.View
                    style={[
                        animatedStyle,
                        {
                            position: "absolute",
                            left: padding,
                            top: padding,
                            bottom: padding,
                        },
                    ]}
                    className="bg-white/10 rounded-full"
                />
            )}
            {options.map((option, index) => {
                const active = index === activeIndex
                return (
                    <SegmentOption
                        key={option.value}
                        label={option.label}
                        active={active}
                        onPress={() => onChange(option.value)}
                    />
                )
            })}
        </View>
    )
}

function SegmentOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    const [focused, setFocused] = React.useState(false)

    return (
        <Pressable
            onPress={onPress}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={cn(
                "z-10 h-full flex-1 items-center justify-center rounded-full border-2 border-transparent",
                Platform.isTV && focused && "border-brand-100 bg-white/10",
            )}
        >
            <Text
                className={active || focused ? "text-white font-semibold text-sm" : "text-white/40 font-medium text-sm"}
            >
                {label}
            </Text>
        </Pressable>
    )
}
