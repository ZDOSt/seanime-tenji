import { useQueryClient } from "@tanstack/react-query"

import { useServerMutation } from "@/api/client/requests"
import { API_ENDPOINTS } from "@/api/generated/endpoints"

/**
 * Removes a show from Continue Watching. The dismissal is local to the server and never touches the
 * user's AniList account; watching the show again brings it back.
 */
export function useDismissContinueWatching() {
    const queryClient = useQueryClient()

    return useServerMutation<boolean, { mediaId: number }>({
        endpoint: "/api/v1/library/continue-watching/dismiss",
        method: "POST",
        mutationKey: ["dismiss-continue-watching"],
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.key] })
        },
    })
}
