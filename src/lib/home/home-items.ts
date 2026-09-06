import type { Models_HomeItem } from "@/api/generated/types"

export type HomeItemOptions = Record<string, unknown>

/**
 * Home-item versions are owned by Seanime Web. Keep these in sync so an item
 * with stale options falls back to its current defaults instead of rendering
 * with an incompatible payload.
 */
export const HOME_ITEM_SCHEMA_VERSIONS: Readonly<Record<string, number>> = {
    "centered-title": 1,
    "anime-continue-watching": 1,
    "anime-continue-watching-header": 1,
    "anime-library": 2,
    "my-lists": 1,
    "local-anime-library": 2,
    "library-upcoming-episodes": 1,
    "aired-recently": 1,
    "missed-sequels": 1,
    "anime-schedule-calendar": 2,
    "local-anime-library-stats": 1,
    "discover-header": 1,
    "anime-carousel": 3,
    "manga-carousel": 1,
    "manga-library": 2,
}

/** Items that can be represented by the TV anime surface. */
export const TV_SUPPORTED_HOME_ITEM_TYPES = new Set([
    "centered-title",
    "anime-continue-watching",
    "anime-continue-watching-header",
    "anime-library",
    "my-lists",
    "local-anime-library",
    "aired-recently",
    "missed-sequels",
    "discover-header",
    "anime-carousel",
])

export const DEFAULT_TV_HOME_ITEMS: Models_HomeItem[] = [
    {
        id: "anime-continue-watching-header",
        type: "anime-continue-watching-header",
        schemaVersion: HOME_ITEM_SCHEMA_VERSIONS["anime-continue-watching-header"],
    },
    {
        id: "anime-continue-watching",
        type: "anime-continue-watching",
        schemaVersion: HOME_ITEM_SCHEMA_VERSIONS["anime-continue-watching"],
    },
    {
        id: "anime-library-current",
        type: "anime-library",
        schemaVersion: HOME_ITEM_SCHEMA_VERSIONS["anime-library"],
        options: {
            statuses: ["CURRENT"],
            layout: "carousel",
        },
    },
]

function isHomeItem(value: unknown): value is Models_HomeItem {
    if (!value || typeof value !== "object") return false

    const item = value as Partial<Models_HomeItem>
    return typeof item.id === "string"
        && typeof item.type === "string"
}

/**
 * Keep the server's order while dropping item types the TV anime surface
 * cannot render. Unknown server items are expected as Seanime adds features.
 */
export function normalizeTVHomeItems(items: ReadonlyArray<unknown> | null | undefined): Models_HomeItem[] {
    if (!items?.length) return DEFAULT_TV_HOME_ITEMS

    const normalized = items
        .filter(isHomeItem)
        .filter(item => TV_SUPPORTED_HOME_ITEM_TYPES.has(item.type))
        .map(item => {
            const currentVersion = HOME_ITEM_SCHEMA_VERSIONS[item.type]
            if (typeof item.schemaVersion !== "number") {
                return {
                    ...item,
                    schemaVersion: currentVersion ?? 1,
                    options: undefined,
                }
            }
            if (currentVersion === undefined || item.schemaVersion === currentVersion) return item

            return {
                ...item,
                schemaVersion: currentVersion,
                options: undefined,
            }
        })

    return normalized.length > 0 ? normalized : DEFAULT_TV_HOME_ITEMS
}

export function getHomeItemOptions(item: Models_HomeItem): HomeItemOptions {
    return item.options && typeof item.options === "object" && !Array.isArray(item.options)
        ? item.options as HomeItemOptions
        : {}
}

export function getHomeItemStringOption(item: Models_HomeItem, key: string): string | undefined {
    const value = getHomeItemOptions(item)[key]
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined
}

export function getHomeItemStringArrayOption(item: Models_HomeItem, key: string): string[] {
    const value = getHomeItemOptions(item)[key]
    if (!Array.isArray(value)) return []

    return value
        .filter((entry): entry is string => typeof entry === "string")
        .map(entry => entry.trim())
        .filter(entry => entry.length > 0)
}
