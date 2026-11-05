export type GunfireContext = {
    state: string; reason: string; source: string; owner: string; personality: string;
    audible: boolean; incoming: boolean; engaged: boolean; passToSain: boolean; searchObserved: boolean; applied: boolean;
    at?: number; emittedAt?: number; distance?: number; remaining?: number; validFor?: number;
    lookCooldown?: number; searchCooldown?: number; x?: number; y?: number; z?: number;
}
const str = (v: unknown) => typeof v === 'string' ? v : ''
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : undefined
export function parseCometGunfire(raw: any): GunfireContext | null {
    if (!raw || Array.isArray(raw) || typeof raw !== 'object' || !['look', 'search', 'native', 'ignored', 'ended'].includes(raw.state)) return null
    const g: GunfireContext = { state: raw.state, reason: str(raw.reason), source: str(raw.source), owner: str(raw.owner), personality: str(raw.personality),
        audible: raw.audible === true, incoming: raw.incoming === true, engaged: raw.engaged === true,
        passToSain: raw.passToSain === true, searchObserved: raw.searchObserved === true, applied: raw.applied === true }
    for (const k of ['at', 'emittedAt', 'distance', 'remaining', 'validFor', 'lookCooldown', 'searchCooldown', 'x', 'y', 'z'] as const) g[k] = num(raw[k])
    return g
}
export function cometGunfireSummary(g: GunfireContext, names: Record<string, string> = {}): string[] {
    const n = (v: number | undefined) => v == null ? '?' : v.toFixed(1)
    return [g.state === 'look' ? (g.applied ? `Glance requested · ${n(g.remaining)} s remaining` : 'Glance selected; steering not yet applied')
        : g.state === 'search' ? 'Native search contact allowed; movement is not guaranteed' : `${g.state} · ${g.reason.replace(/^gunfire-/, '').replace(/-/g, ' ')}`,
        `${g.audible ? 'Passed native hearing' : 'No confirmed hearing'} · ${n(g.distance)} m · ${names[g.source] || g.source || 'Unknown source'}`,
        `Reason: ${g.reason.replace(/^gunfire-/, '').replace(/-/g, ' ')} · Current control: ${g.owner || '?'}`,
        `${g.personality || 'Unknown personality'} · Look cooldown ${n(g.lookCooldown)} s · Distant search cooldown ${n(g.searchCooldown)} s`,
        ...(g.x != null && g.y != null && g.z != null ? [`Estimated sound position: ${n(g.x)}, ${n(g.y)}, ${n(g.z)} (fixed at perception)`] : []),
        ...(g.passToSain ? [g.searchObserved ? 'Native personal contact registered; this does not prove a search started.' : 'Native reaction allowed; personal contact not confirmed.'] : []),
        'P03 does not own the combat action, reveal a hidden live target or change behavior colors.']
}
