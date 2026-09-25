/**
 * Result cards show a file size the way the desktop plugin panel does ("1.45 GB"). Kept pure and
 * tested because the picker's metadata line is the only place the user can judge a release on TV.
 */
export function formatBytes(size: number | null | undefined): string | null {
    if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) return null
    const units = ["B", "KB", "MB", "GB", "TB"]
    let value = size
    let unit = 0
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024
        unit += 1
    }
    const digits = value >= 100 || unit === 0 ? 0 : value >= 10 ? 1 : 2
    return `${value.toFixed(digits)} ${units[unit]}`
}
