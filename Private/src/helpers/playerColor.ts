export const DEFAULT_PLAYER_COLOR = '#D9C48A'
const STORAGE_KEY = 'rr_playerColor'

export function readPlayerColor(): string {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        return saved && /^#[a-f\d]{6}$/i.test(saved) ? saved.toUpperCase() : DEFAULT_PLAYER_COLOR
    } catch {
        return DEFAULT_PLAYER_COLOR
    }
}

export function savePlayerColor(color: string): void {
    if (!/^#[a-f\d]{6}$/i.test(color)) return
    try {
        localStorage.setItem(STORAGE_KEY, color.toUpperCase())
    } catch {
        // The current view can still use the selection when browser storage is unavailable.
    }
}
