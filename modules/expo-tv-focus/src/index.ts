import type { EventSubscription } from "expo-modules-core"
import ExpoTVFocusModule from "./ExpoTVFocusModule"
import type { FocusTraceEvent } from "./ExpoTVFocus.types"

function emptySubscription(): EventSubscription {
    return { remove() {} }
}

export const ExpoTVFocus = {
    async setEnabled(enabled: boolean): Promise<void> {
        await ExpoTVFocusModule?.setEnabled(enabled)
    },

    addTraceListener(listener: (event: FocusTraceEvent) => void): EventSubscription {
        return ExpoTVFocusModule?.addListener("onTrace", listener) ?? emptySubscription()
    },
}

export default ExpoTVFocus
