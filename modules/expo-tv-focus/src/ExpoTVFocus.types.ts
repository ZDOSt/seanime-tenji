import type { EventSubscription } from "expo-modules-core"

export type FocusTraceEvent = {
    message: string
}

export type ExpoTVFocusModuleType = {
    setEnabled(enabled: boolean): Promise<void>
    addListener(eventName: "onTrace", listener: (event: FocusTraceEvent) => void): EventSubscription
}
