export function getBufferedRatio(currentTime: number, duration: number, cacheSeconds: number): number {
    if (!isFinite(currentTime) || !isFinite(duration) || !isFinite(cacheSeconds) || duration <= 0) return 0
    return Math.min(1, Math.max(0, (Math.max(0, currentTime) + Math.max(0, cacheSeconds)) / duration))
}
