import { requireOptionalNativeModule } from "expo-modules-core"
import type { ExpoTVFocusModuleType } from "./ExpoTVFocus.types"

const ExpoTVFocusModule = requireOptionalNativeModule<ExpoTVFocusModuleType>("ExpoTVFocus")

export default ExpoTVFocusModule
