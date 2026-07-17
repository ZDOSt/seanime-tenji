import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import * as React from "react"
import { Platform, Pressable, Text, View } from "react-native"

type LabeledSwitchProps = {
    label: string
    checked: boolean
    onToggle: () => void
    disabled?: boolean
    helper?: string
}

/**
 * Reusable full-width row with a label on the left and a Switch on the right.
 * The entire row is tappable to toggle the switch.
 */
export function LabeledSwitch({ label, checked, onToggle, disabled, helper }: LabeledSwitchProps) {
    const [focused, setFocused] = React.useState(false)

    return (
        <Pressable
            onPress={onToggle}
            disabled={disabled}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={cn(
                "flex-row items-center justify-between gap-3 rounded-xl border-2 border-transparent",
                Platform.isTV && "min-h-14 px-4 py-3",
                Platform.isTV && focused && "border-brand-100 bg-white/10",
            )}
        >
            <View className="flex-1 gap-0.5">
                <Text className={cn("text-sm font-medium", checked ? "text-white" : "text-white/70")}>
                    {label}
                </Text>
                {!!helper && (
                    <Text className="text-xs leading-4 text-white/35">
                        {helper}
                    </Text>
                )}
            </View>
            <Switch checked={checked} onCheckedChange={onToggle} disabled={disabled} />
        </Pressable>
    )
}
