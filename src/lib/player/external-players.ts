import {
    classifyProbe,
    decideExternalHandoff,
    getExternalPlayerPackageName,
    getExternalPlayerURL,
    isProbeOk,
    maskStreamUrl,
} from "@/lib/player/external-player-url"
import { logger } from "@/lib/utils/logger"
import { toast } from "@/lib/utils/toast"
import { ExpoExternalPlayer } from "expo-external-player"
import { Linking, Platform } from "react-native"

const log = logger("external-player")

export type ExternalPlayerPreset = {
    id: string
    name: string
    platform: "ios" | "android" | "both"
    /**
     * URL template where `{url}` is replaced with the stream URL.
     * For Android intent:// schemes, the `getExternalPlayerURL` helper strips the http(s):// prefix from the embedded URL automatically.
     */
    urlTemplate: string
    /** iOS URL scheme needed in LSApplicationQueriesSchemes for canOpenURL */
    iosScheme?: string
    /** android package name needed for package visibility and explicit intents */
    androidPackage?: string
}

export const EXTERNAL_PLAYER_PRESETS: ExternalPlayerPreset[] = [
    // iOS
    {
        id: "vlc-ios",
        name: "VLC",
        platform: "ios",
        urlTemplate: "vlc://{url}",
        iosScheme: "vlc",
    },
    {
        id: "outplayer",
        name: "OutPlayer",
        platform: "ios",
        urlTemplate: "outplayer://{url}",
        iosScheme: "outplayer",
    },
    {
        id: "infuse",
        name: "Infuse",
        platform: "ios",
        urlTemplate: "infuse://x-callback-url/play?url={url}",
        iosScheme: "infuse",
    },
    {
        id: "nplayer",
        name: "nPlayer",
        platform: "ios",
        // nPlayer prepends "nplayer-" before the full URL (including http://)
        urlTemplate: "nplayer-{url}",
        iosScheme: "nplayer-http",
    },
    {
        id: "oplayer",
        name: "OPlayer",
        platform: "ios",
        urlTemplate: "oplayer://{url}",
        iosScheme: "oplayer",
    },
    {
        id: "mango",
        name: "Mango Player",
        platform: "ios",
        urlTemplate: "mangoplayer://{url}",
        iosScheme: "mangoplayer",
    },
    // Android
    {
        id: "vlc-android",
        name: "VLC",
        platform: "android",
        urlTemplate: "intent://{url}#Intent;package=org.videolan.vlc;scheme=http;end",
        androidPackage: "org.videolan.vlc",
    },
    {
        id: "mpv-android",
        name: "mpv",
        platform: "android",
        urlTemplate: "intent://{url}#Intent;package=is.xyz.mpv;scheme=http;end",
        androidPackage: "is.xyz.mpv",
    },
    {
        id: "mpvex",
        name: "mpvEX",
        platform: "android",
        urlTemplate: "intent://{url}#Intent;package=app.marlboroadvance.mpvex;scheme=http;end",
        androidPackage: "app.marlboroadvance.mpvex",
    },
    {
        id: "mxplayer",
        name: "MX Player",
        platform: "android",
        urlTemplate: "intent://{url}#Intent;package=com.mxtech.videoplayer.ad;scheme=http;end",
        androidPackage: "com.mxtech.videoplayer.ad",
    },
    {
        id: "mxplayer-pro",
        name: "MX Player Pro",
        platform: "android",
        urlTemplate: "intent://{url}#Intent;package=com.mxtech.videoplayer.pro;scheme=http;end",
        androidPackage: "com.mxtech.videoplayer.pro",
    },
    {
        id: "justplayer",
        name: "Just Player",
        platform: "android",
        urlTemplate: "intent://{url}#Intent;package=com.brouken.player;scheme=http;end",
        androidPackage: "com.brouken.player",
    },
]

export const ANDROID_EXTERNAL_PLAYER_PACKAGES = EXTERNAL_PLAYER_PRESETS
    .map(preset => preset.androidPackage)
    .filter((packageName): packageName is string => !!packageName)

/** Returns only the presets that apply to the current platform. */
export function getPlatformExternalPlayers(): ExternalPlayerPreset[] {
    return EXTERNAL_PLAYER_PRESETS.filter(
        (p) => p.platform === "both" || p.platform === Platform.OS,
    )
}

export async function getInstalledExternalPlayers(): Promise<ExternalPlayerPreset[]> {
    const presets = getPlatformExternalPlayers()
    if (Platform.OS !== "android") return presets

    const installed = await Promise.all(presets.map(async preset => {
        if (!preset.androidPackage) return false
        return ExpoExternalPlayer.isPackageInstalled(preset.androidPackage)
    }))

    return presets.filter((_, index) => installed[index])
}

export { getExternalPlayerPackageName, getExternalPlayerURL }

/**
 * Cheap reachability check before handing the URL to another app.
 *
 * The external player gets no credentials of its own, so an authenticated URL can never be
 * played there — that is worth knowing before opening a player that shows nothing.
 */
async function probeStreamUrl(url: string): Promise<ReturnType<typeof classifyProbe>> {
    if (url.startsWith("file://")) return classifyProbe(200)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: { Range: "bytes=0-1023" },
            signal: controller.signal,
        })
        return classifyProbe(response.status)
    }
    catch {
        return classifyProbe(null)
    }
    finally {
        clearTimeout(timeout)
    }
}

export async function openExternalPlayerURL(
    template: string,
    streamUrl: string,
    options: { serverIsLocal?: boolean } = {},
): Promise<boolean> {
    const verdict = decideExternalHandoff({
        url: streamUrl,
        template,
        serverIsLocal: options.serverIsLocal ?? false,
    })

    if (verdict !== "handoff") {
        log.warning("External player handoff skipped", { verdict, url: maskStreamUrl(streamUrl) })
        if (verdict === "blocked-loopback") {
            toast.error("This stream only exists on this device — using the built-in player")
        }
        return false
    }

    const packageName = getExternalPlayerPackageName(template)
    log.info("Handing stream to external player", {
        platform: Platform.OS,
        packageName: packageName ?? "(via URL scheme)",
        url: maskStreamUrl(streamUrl),
    })

    // An external player has no credentials of its own: an authenticated URL can only ever
    // show an idle player. Better to say so and use the built-in player, which sends headers.
    const probe = await probeStreamUrl(streamUrl)
    if (probe.blocked) {
        log.warning("External player handoff blocked: the stream requires authentication", {
            status: probe.status,
            url: maskStreamUrl(streamUrl),
        })
        toast.error("This stream needs the built-in player (it requires a login)")
        return false
    }
    if (!isProbeOk(probe.status)) {
        log.warning("Stream did not answer the handoff probe; opening the external player anyway", {
            status: probe.status ?? "no response",
            url: maskStreamUrl(streamUrl),
        })
        toast.info("Sent to the external player — if it stays empty, press BACK and play again to use the built-in player")
    }

    // a downloaded file URL points into Seanime's private storage. we give the external player temporary access to the file
    if (streamUrl.startsWith("file://")) {
        if (Platform.OS === "android") {
            const openedFile = await ExpoExternalPlayer.openFile(streamUrl, packageName)
            log.info("External player result", { opened: openedFile, mode: "file" })
            return openedFile
        }

        if (Platform.OS === "ios") {
            const openedFile = await ExpoExternalPlayer.openFile(streamUrl)
            log.info("External player result", { opened: openedFile, mode: "file" })
            return openedFile
        }
    }

    if (Platform.OS === "android") {
        if (packageName) {
            const opened = await ExpoExternalPlayer.open(streamUrl, packageName)
            log.info("External player result", { opened, packageName })
            if (!opened) {
                log.warning("No installed player accepted the stream", { packageName })
                toast.error("The external player could not open this stream — using the built-in player")
            }
            return opened
        }
    }

    const launchUrl = getExternalPlayerURL(template, streamUrl)

    try {
        // android package visibility can make canOpenURL return false for installed intent targets
        if (Platform.OS !== "android") {
            const supported = await Linking.canOpenURL(launchUrl).catch(() => true)
            if (!supported) {
                log.warning("No app handles the external player URL", { launchUrl })
                return false
            }
        }

        await Linking.openURL(launchUrl)
        log.info("External player result", { opened: true, mode: "url" })
        return true
    }
    catch (error) {
        log.warning("Could not open the external player URL", { launchUrl, error: String(error) })
        return false
    }
}
