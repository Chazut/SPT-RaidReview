export type SilentSearchContext = {
    state: string; reason: string; target: string; personality: string; choice: string; searchRefusal: string;
    silence?: number; delay?: number; remaining?: number; bonus?: number; validFor?: number;
    x?: number; y?: number; z?: number;
    eligible: boolean; reconsider: boolean; accepted: boolean; actionObserved: boolean; walking: boolean; movementObserved: boolean;
}
const text = (x: unknown) => typeof x === 'string' ? x : ''
const number = (x: unknown) => typeof x === 'number' && Number.isFinite(x) ? x : undefined
export function parseCometSilentSearch(raw: any): SilentSearchContext | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !['inactive','waiting','ready','blocked','requested','accepted','observed','ended'].includes(raw.state)) return null
    const live = raw.state !== 'ended' && raw.state !== 'inactive' && raw.state !== 'blocked'
    const t: SilentSearchContext = { state: raw.state, reason: text(raw.reason), target: text(raw.target), personality: text(raw.personality),
        choice: text(raw.choice), searchRefusal: text(raw.searchRefusal), eligible: live && raw.eligible === true, reconsider: raw.reconsider === true,
        accepted: live && raw.accepted === true, actionObserved: live && raw.accepted === true && raw.actionObserved === true,
        walking: false, movementObserved: false }
    t.walking = t.actionObserved && raw.walking === true
    t.movementObserved = t.actionObserved && raw.movementObserved === true
    for (const key of ['silence','delay','remaining','bonus','validFor','x','y','z'] as const) t[key] = number(raw[key])
    return t
}
export function cometSilentSearchSummary(t: SilentSearchContext, names: Record<string,string> = {}): string[] {
    const fmt = (v?: number) => v == null ? '?' : Math.max(0,v).toFixed(1)
    const stage = t.state === 'ended' ? 'COMET search context ended; native behavior may continue'
        : t.actionObserved ? 'Native search callback observed' : t.accepted ? 'Search accepted; execution not yet observed'
        : t.state === 'requested' ? 'Search proposed; execution not confirmed' : t.eligible ? (t.reconsider ? 'Search reconsidered; not forced' : 'Silence threshold met; no new reconsideration recorded')
        : t.state === 'waiting' ? 'Waiting before reconsidering' : 'No extra search opportunity'
    const lines = [stage, `Reason: ${t.reason.replace(/-/g,' ')}`, `Recorded contact: ${names[t.target] || t.target || 'unavailable'}`,
        `Silence: ${fmt(t.silence)} s / ${fmt(t.delay)} s · ${t.personality || 'unknown personality'}`,
        `Contact memory remaining: ${fmt(t.remaining)} s · Extra Search score before weight: ${fmt(t.bonus)}`,
        `Choice: ${t.choice || 'not selected'}${t.searchRefusal ? ' · Search unavailable: '+t.searchRefusal.replace(/-/g,' ') : ''}`,
        `Movement observed: ${t.movementObserved ? 'yes' : 'no'} · Walking observed: ${t.walking ? 'yes' : 'no'}`,
        'Silence does not update enemy knowledge. Native search permissions, danger and contact expiry still apply.']
    if (t.x != null && t.y != null && t.z != null && !['inactive','ended'].includes(t.state))
        lines.push(`Last personally heard position: ${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)}. Not the live enemy position.`)
    return lines
}
