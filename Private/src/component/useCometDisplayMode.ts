import { useEffect, useState } from 'react'
import { CometMode } from '../helpers/cometPresentation'

const key = 'rr_comet_display_mode'
function read(): CometMode {
    try { return localStorage.getItem(key) === 'debug' ? 'debug' : 'simple' } catch { return 'simple' }
}
export function useCometDisplayMode(): [CometMode, (mode: CometMode) => void] {
    const [mode, setMode] = useState<CometMode>(read)
    useEffect(() => {
        const update = (event: Event) => setMode(event instanceof CustomEvent && (event.detail === 'debug' || event.detail === 'simple') ? event.detail : read())
        window.addEventListener('storage', update)
        window.addEventListener('rr-comet-mode', update)
        return () => { window.removeEventListener('storage', update); window.removeEventListener('rr-comet-mode', update) }
    }, [])
    return [mode, value => {
        setMode(value)
        try { localStorage.setItem(key, value) } catch { /* private / embedded browser */ }
        window.dispatchEvent(new CustomEvent('rr-comet-mode', { detail: value }))
    }]
}
