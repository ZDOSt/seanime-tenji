import { TVDrawer } from "@/components/tv/tv-drawer"
import { TVButton } from "@/components/tv/tv-focus"
import { tvSize } from "@/components/tv/tv-scale"
import * as React from "react"
import { Text, TVFocusGuideView, View } from "react-native"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    text: string
    confirmLabel: string
    danger?: boolean
    onConfirm: () => void
}

export function TVConfirmDrawer({
    open,
    onOpenChange,
    title,
    text,
    confirmLabel,
    danger,
    onConfirm,
}: Props) {
    return (
        <TVDrawer
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            subtitle="Confirm action"
            width={tvSize(650)}
        >
            <View
                style={{
                    paddingHorizontal: tvSize(30),
                    paddingTop: tvSize(16),
                    gap: tvSize(28),
                }}
            >
                <Text className="text-white/60" style={{ fontSize: tvSize(20), lineHeight: tvSize(28) }}>
                    {text}
                </Text>
                <TVFocusGuideView
                    trapFocusLeft
                    trapFocusRight
                    style={{ flexDirection: "row", gap: tvSize(12) }}
                >
                    <TVButton
                        label="Cancel"
                        variant="secondary"
                        preferred
                        onPress={() => onOpenChange(false)}
                    />
                    <TVButton
                        label={confirmLabel}
                        variant={danger ? "danger" : "primary"}
                        onPress={() => {
                            onOpenChange(false)
                            onConfirm()
                        }}
                    />
                </TVFocusGuideView>
            </View>
        </TVDrawer>
    )
}
