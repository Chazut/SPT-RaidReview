import { useEffect, useState } from 'react'

// Mirrors Tailwind's `md` breakpoint: below 768px the phone layout applies.
export const MOBILE_QUERY = '(max-width: 767.98px)'

function matches(query: string): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches
}

export function useMediaQuery(query: string): boolean {
    const [isMatch, setIsMatch] = useState(() => matches(query))

    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return
        const list = window.matchMedia(query)
        const update = () => setIsMatch(list.matches)
        update()
        list.addEventListener('change', update)
        return () => list.removeEventListener('change', update)
    }, [query])

    return isMatch
}

export function useIsMobile(): boolean {
    return useMediaQuery(MOBILE_QUERY)
}

export function isMobileViewport(): boolean {
    return matches(MOBILE_QUERY)
}
