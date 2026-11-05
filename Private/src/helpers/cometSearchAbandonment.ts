export type SearchAbandonmentContext = {
    state: string; reason: string; target: string;
    silence?: number; requiredSilence?: number; inspected?: number; requiredInspection?: number;
    distance?: number; memoryRemaining?: number; validFor?: number; interruptions?: number;
    forgetRequested: boolean; forgetObserved: boolean;
}
const text = (x: unknown) => typeof x === 'string' ? x : ''
const number = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : undefined
export function parseCometSearchAbandonment(raw: any): SearchAbandonmentContext | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !['inactive','reached','checking','requested','abandoned','ended'].includes(raw.state)) return null
    const requested = ['requested','abandoned'].includes(raw.state) && raw.forgetRequested === true
    const t: SearchAbandonmentContext = {state: raw.state, reason: text(raw.reason), target: text(raw.target),
        forgetRequested: requested, forgetObserved: requested && raw.state === 'abandoned' && raw.forgetObserved === true}
    for (const key of ['silence','requiredSilence','inspected','requiredInspection','distance','memoryRemaining','validFor','interruptions'] as const) t[key] = number(raw[key])
    return t
}
export function cometSearchAbandonmentSummary(t: SearchAbandonmentContext, names: Record<string,string> = {}): string[] {
    const fmt = (v?: number) => v == null ? '?' : v.toFixed(1)
    const stage = t.forgetObserved ? 'SAIN forgetting confirmed; active contact cleared'
        : t.forgetRequested ? 'Abandonment requested; native forgetting not yet confirmed'
        : t.state === 'reached' ? 'Remembered position reached; inspection begins'
        : t.state === 'checking' ? 'Checking the remembered position'
        : 'Local inspection interrupted or unavailable'
    return [stage, `Reason: ${t.reason.replace(/-/g,' ')}`, `Recorded contact: ${names[t.target] || t.target || 'unavailable'}`,
        `No new information: ${fmt(t.silence)} / ${fmt(t.requiredSilence)} s`,
        `Effective local inspection: ${fmt(t.inspected)} / ${fmt(t.requiredInspection)} s · Distance: ${fmt(t.distance)} m`,
        `Interruptions: ${t.interruptions ?? '?'} · Failed-search memory: ${fmt(t.memoryRemaining)} s`,
        'Only the remembered point was checked, not the entire room. New information can restart the search. SAIN and ORBIT keep their normal handoff rules.']
}
