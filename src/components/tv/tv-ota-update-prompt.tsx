import { TVDrawer } from "@/components/tv/tv-drawer"
import { TVButton } from "@/components/tv/tv-focus"
import { tvSize } from "@/components/tv/tv-scale"
import {
    dismissOta,
    downloadOta,
    onOtaPrompt,
    type OtaPromptInfo,
    restartOta,
} from "@/lib/ota/updates"
import { toast } from "@/lib/utils/toast"
import * as Updates from "expo-updates"
import * as React from "react"
import { ActivityIndicator, Text, TVFocusGuideView, View } from "react-native"

type Stage = "ready" | "downloading" | "restart" | "restarting"

export function TVOtaUpdatePrompt() {
    const [info, setInfo] = React.useState<OtaPromptInfo | null>(null)
    const [stage, setStage] = React.useState<Stage>("ready")
    const { downloadProgress } = Updates.useUpdates()
    const busy = stage === "downloading" || stage === "restarting"

    React.useEffect(() => {
        return onOtaPrompt(next => {
            setInfo(next)
            setStage("ready")
        })
    }, [])

    const close = React.useCallback(() => {
        if (busy) return
        if (stage === "ready" && info) dismissOta(info)
        setInfo(null)
        setStage("ready")
    }, [busy, info, stage])

    const install = React.useCallback(() => {
        if (!info || busy) return

        setStage("downloading")
        void downloadOta()
            .then(ready => {
                if (!ready) {
                    toast.info("Seanime is already up to date")
                    setInfo(null)
                    setStage("ready")
                    return
                }
                setStage("restart")
            })
            .catch(error => {
                console.error(error)
                toast.error(`Failed to download update: ${errorText(error)}`)
                setStage("ready")
            })
    }, [busy, info])

    const restart = React.useCallback(() => {
        if (busy) return

        setStage("restarting")
        void restartOta().catch(error => {
            console.error(error)
            toast.error(`Failed to restart Seanime: ${errorText(error)}`)
            setStage("restart")
        })
    }, [busy])

    const version = info?.otaVersion ? `OTA ${info.otaVersion}` : "A new update"
    const progress = typeof downloadProgress === "number" && downloadProgress > 0
        ? ` ${Math.round(downloadProgress * 100)}%`
        : ""
    const title = stage === "restart" || stage === "restarting"
        ? "Restart Seanime?"
        : "Update available"
    const text = stage === "ready"
        ? `${version} is ready to install.`
        : stage === "downloading"
            ? `Downloading ${version}${progress}`
            : `${version} has been downloaded and will load after restart.`

    return (
        <TVDrawer
            open={Boolean(info)}
            onOpenChange={open => {
                if (!open) close()
            }}
            onRequestClose={close}
            closeDisabled={busy}
            title={title}
            subtitle="OTA update"
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

                {busy ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: tvSize(14) }}>
                        <ActivityIndicator size="small" color="white" />
                        <Text className="font-semibold text-white" style={{ fontSize: tvSize(20) }}>
                            {stage === "downloading" ? "Downloading update…" : "Restarting…"}
                        </Text>
                    </View>
                ) : (
                    <TVFocusGuideView
                        trapFocusLeft
                        trapFocusRight
                        style={{ flexDirection: "row", gap: tvSize(12) }}
                    >
                        <TVButton
                            label="Later"
                            variant="secondary"
                            preferred
                            onPress={close}
                        />
                        <TVButton
                            label={stage === "restart" ? "Restart" : "Install"}
                            variant="primary"
                            onPress={stage === "restart" ? restart : install}
                        />
                    </TVFocusGuideView>
                )}
            </View>
        </TVDrawer>
    )
}

function errorText(error: unknown) {
    return error instanceof Error ? error.message : String(error)
}
