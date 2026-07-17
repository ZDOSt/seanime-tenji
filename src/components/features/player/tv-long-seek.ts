export const TV_LONG_SEEK = {
    seconds: 5,
    accel: 1.2,
    maxScale: 4,
    intervalMs: 300,
    hudMs: 900,
} as const

export function seekStep(scale: number) {
    return TV_LONG_SEEK.seconds * Math.min(Math.max(scale, 1), TV_LONG_SEEK.maxScale)
}

export function nextScale(scale: number) {
    return Math.min(Math.max(scale, 1) * TV_LONG_SEEK.accel, TV_LONG_SEEK.maxScale)
}
