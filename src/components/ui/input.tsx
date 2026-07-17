import { cn } from "@/lib/utils"
import * as React from "react"
import { Platform, TextInput } from "react-native"
import { useCSSVariable } from "uniwind"

const Input = React.forwardRef<
    React.ElementRef<typeof TextInput>,
    React.ComponentPropsWithoutRef<typeof TextInput>
>(({ className, placeholderTextColor, onFocus, onBlur, ...props }, ref) => {
    const resolvedPlaceholderColor = useCSSVariable("--color-muted-foreground")
    const [focused, setFocused] = React.useState(false)

    return (
        <TextInput
            ref={ref}
            className={cn(
                "h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-foreground",
                props.editable === false && "opacity-50",
                Platform.isTV && "h-14 rounded-xl border-2 text-lg",
                className,
                Platform.isTV && focused && "border-brand-100 bg-white/[0.08]",
            )}
            placeholderTextColor={placeholderTextColor ?? (typeof resolvedPlaceholderColor === "string" ? resolvedPlaceholderColor : undefined)}
            textAlignVertical="center"
            onFocus={(event) => {
                setFocused(true)
                onFocus?.(event)
            }}
            onBlur={(event) => {
                setFocused(false)
                onBlur?.(event)
            }}
            {...props}
        />
    )
})

Input.displayName = "Input"

export { Input }
