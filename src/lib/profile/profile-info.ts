import type { ActiveStreamSession } from "@/lib/player"
import { getPlatformExternalPlayers } from "@/lib/player/external-players"

export function playerLabel(template: string | null): string {
    if (!template) return "Built-in player"
    const match = getPlatformExternalPlayers().find(player => player.urlTemplate === template)
    return match?.name ?? "Custom"
}

export function downloadLabel({
    active,
    failed,
    downloaded,
    size,
    media,
}: {
    active: number
    failed: number
    downloaded: number
    size: string
    media: string
}) {
    const parts: string[] = []
    if (active > 0) parts.push(`${active} in queue`)
    if (failed > 0) parts.push(`${failed} failed`)
    if (parts.length > 0) return parts.join(" · ")
    if (downloaded > 0) return `${downloaded} ${media} · ${size}`
    return "No downloads"
}

export function streamLabel(stream: ActiveStreamSession) {
    const mode = stream.streamMode === "debrid" ? "Debrid streaming" : "Torrent streaming"
    return stream.subtitle ? `${mode} (${stream.subtitle})` : mode
}
