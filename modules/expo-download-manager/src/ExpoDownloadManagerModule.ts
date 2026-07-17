import { requireOptionalNativeModule } from "expo-modules-core"
import { Platform } from "react-native"
import type { ExpoDownloadManagerModuleType } from "./ExpoDownloadManager.types"

const ExpoDownloadManagerModule =
    Platform.isTV
        ? null
        : requireOptionalNativeModule<ExpoDownloadManagerModuleType>("ExpoDownloadManager")

export default ExpoDownloadManagerModule
