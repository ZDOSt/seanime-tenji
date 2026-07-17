import { SeaBottomSheet } from "@/components/ui/bottom-sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Ionicons } from "@expo/vector-icons"
import * as React from "react"
import { Platform, Pressable, Text, View } from "react-native"
import * as DropdownMenu from "zeego/dropdown-menu"

export type NativeSelectOption = {
    id: string
    label: string
    sublabel?: string
}

type NativeSelectProps = {
    options: NativeSelectOption[]
    selectedId: string
    onSelect: (id: string) => void
    title?: string
    placeholder?: string
    className?: string
    disabled?: boolean
}

export function NativeSelect({
    options,
    selectedId,
    onSelect,
    title = "Select an option",
    placeholder = "Select...",
    className,
    disabled,
}: NativeSelectProps) {
    const selectedLabel = React.useMemo(
        () => options.find(o => o.id === selectedId)?.label ?? null,
        [options, selectedId],
    )
    const [tvOpen, setTVOpen] = React.useState(false)

    if (Platform.isTV) {
        return (
            <>
                <Button
                    variant="secondary"
                    disabled={disabled}
                    className={cn("h-14 flex-row justify-between rounded-xl px-4", className)}
                    onPress={() => setTVOpen(true)}
                >
                    <Text className={cn("flex-1 text-base font-medium", selectedLabel ? "text-white" : "text-white/40")}>
                        {selectedLabel ?? placeholder}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.55)" />
                </Button>
                <SeaBottomSheet
                    open={tvOpen}
                    onOpenChange={setTVOpen}
                    title={title}
                    snapPoints={["70%"]}
                >
                    <View className="gap-2">
                        {options.map((option, index) => (
                            <Button
                                key={option.id}
                                variant={option.id === selectedId ? "default" : "secondary"}
                                className="min-h-14 items-start rounded-xl px-5"
                                hasTVPreferredFocus={index === 0}
                                onPress={() => {
                                    onSelect(option.id)
                                    setTVOpen(false)
                                }}
                            >
                                <View className="flex-1">
                                    <Text className="text-base font-semibold text-white">{option.label}</Text>
                                    {option.sublabel ? (
                                        <Text className="mt-0.5 text-sm text-white/45">{option.sublabel}</Text>
                                    ) : null}
                                </View>
                            </Button>
                        ))}
                    </View>
                </SeaBottomSheet>
            </>
        )
    }

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <Pressable
                    disabled={disabled}
                    className={cn(
                        "flex-row items-center justify-between h-11 px-3.5 rounded-xl border border-white/10 bg-white/[0.04] active:bg-white/5",
                        disabled && "opacity-50",
                        className,
                    )}
                >
                    <Text
                        className={cn(
                            "text-sm font-medium flex-1",
                            selectedLabel ? "text-white" : "text-muted-foreground",
                        )}
                        numberOfLines={1}
                    >
                        {selectedLabel ?? placeholder}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.45)" />
                </Pressable>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content>
                {options.map(option => (
                    <DropdownMenu.CheckboxItem
                        key={option.id}
                        value={option.id === selectedId ? "on" : "off"}
                        onValueChange={() => onSelect(option.id)}
                    >
                        <DropdownMenu.ItemTitle>{option.label}</DropdownMenu.ItemTitle>
                        {!!option.sublabel && (
                            <DropdownMenu.ItemSubtitle>{option.sublabel}</DropdownMenu.ItemSubtitle>
                        )}
                    </DropdownMenu.CheckboxItem>
                ))}
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    )
}
