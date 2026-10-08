import knownNames from '../assets/cyr_to_en.json'
import { stripUnityRichText } from './index'

const letters: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z',
    и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', і: 'i', ї: 'yi', є: 'ye', ґ: 'g', ў: 'w',
}
const cyrillic = /[а-яёіїєґў]/i
const translations: Record<string, string> = { ...knownNames, 'Партизан': 'Partizan' }
const cache = new Map<string, string>()

/** Display names only. Recorded nicknames and profile IDs remain unchanged. */
export function displayPlayerName(name: string | null | undefined, fallback = 'Unknown'): string {
    if (!name) return fallback
    const cached = cache.get(name)
    if (cached !== undefined) return cached

    const clean = stripUnityRichText(name)
    if (!clean) return fallback
    // Keep the established English names, including bosses, before transliterating unknown names.
    const translated = Object.prototype.hasOwnProperty.call(translations, clean) ? translations[clean] : clean
    if (!cyrillic.test(translated)) return translated

    const result = translated.replace(/[\p{L}\p{M}]+/gu, word => {
        const allCaps = word.length > 1 && word === word.toUpperCase()
        return Array.from(word, char => {
            const lower = char.toLowerCase()
            const replacement = letters[lower]
            if (replacement === undefined || char === lower) return replacement ?? char
            return allCaps ? replacement.toUpperCase() : replacement.charAt(0).toUpperCase() + replacement.slice(1)
        }).join('')
    })
    // Playback repeatedly renders the same roster. Bound the cache across raids.
    if (cache.size >= 2048) cache.clear()
    cache.set(name, result)
    return result
}

/** Use the same full-name translations inside diagnostics, then transliterate any unrecorded names. */
export function displayPlayerNamesInText(text: string, names: (string | undefined)[]): string {
    const clean = stripUnityRichText(text)
    const candidates = [...new Set(names.filter((name): name is string => !!name).map(stripUnityRichText))]
        .filter(name => name && cyrillic.test(name)).sort((a, b) => b.length - a.length)
    if (!candidates.length) return displayPlayerName(clean, '')

    const escaped = candidates.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const pattern = new RegExp(`(?<![\\p{L}\\p{M}\\p{N}_])(?:${escaped.join('|')})(?![\\p{L}\\p{M}\\p{N}_])`, 'gu')
    return displayPlayerName(clean.replace(pattern, name => displayPlayerName(name)), '')
}
