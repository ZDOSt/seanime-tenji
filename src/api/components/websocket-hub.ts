export type WebsocketMessage = Readonly<{
    type: string
    payload?: unknown
}>

export type WebsocketMessageListener = (message: WebsocketMessage) => void | Promise<void>

export type WebsocketClientMessage = Readonly<{
    type: string
    payload?: unknown
}>

const listeners = new Set<WebsocketMessageListener>()
let sender: ((message: WebsocketClientMessage) => boolean) | null = null

export function registerWsSender(next: ((message: WebsocketClientMessage) => boolean) | null): () => void {
    sender = next
    return () => {
        if (sender === next) sender = null
    }
}

export function sendWsMessage(message: WebsocketClientMessage): boolean {
    return sender?.(message) ?? false
}

export function subscribeWsMessage(listener: WebsocketMessageListener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function publishWsMessage(message: WebsocketMessage) {
    for (const listener of listeners) {
        try {
            Promise.resolve(listener(message)).catch(error => {
                console.warn("WebSocket listener failed", error)
            })
        }
        catch (error) {
            console.warn("WebSocket listener failed", error)
        }
    }
}
