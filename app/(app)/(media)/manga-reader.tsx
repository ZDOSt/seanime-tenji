import { useLocalSearchParams } from "expo-router"
import { Platform } from "react-native"

type MangaReaderModule = typeof import("@/components/features/manga/reader/manga-reader-screen")

const MangaReaderScreen = Platform.isTV
    ? null
    : (require("@/components/features/manga/reader/manga-reader-screen") as MangaReaderModule).MangaReaderScreen

export default function Screen() {
    const params = useLocalSearchParams<{
        mediaId?: string
        provider?: string
        chapterId?: string
        chapterNumber?: string
    }>()

    const mediaId = Number(params.mediaId)

    if (!MangaReaderScreen || !mediaId || !params.provider || !params.chapterId) {
        return null
    }

    return (
        <MangaReaderScreen
            mediaId={mediaId}
            provider={params.provider}
            chapterId={params.chapterId}
            chapterNumber={params.chapterNumber}
        />
    )
}
