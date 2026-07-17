export function shouldPersistQuery(options: { gcTime?: number }): boolean {
    return options.gcTime !== 0
}
