import { MangaEntryScreen } from "@/components/features/manga/manga-entry-screen"
import { type MangaEntryView, tvMangaEntryView } from "@/components/features/manga/manga-entry-view-switcher"
import { useLocalSearchParams } from "expo-router"
import { Platform } from "react-native"

const VALID_VIEWS = new Set<MangaEntryView>(["chapters", "info", "downloaded"])

export default function Screen() {
    const { initialView } = useLocalSearchParams<{ initialView?: string }>()
    const requestedView: MangaEntryView =
        initialView && VALID_VIEWS.has(initialView as MangaEntryView)
            ? (initialView as MangaEntryView)
            : "chapters"
    const view = Platform.isTV ? tvMangaEntryView(requestedView) : requestedView
    return <MangaEntryScreen initialView={view} />
}
