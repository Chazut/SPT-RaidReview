export type EnvironmentContext = {
    reported: string; source: string; conflict: boolean;
    aiIndoorZone?: boolean; eftIndoor?: boolean; age?: number;
    ceiling: string; ceilingHeight?: number; ceilingAge?: number; checkedDistance?: number;
    probeReason: string; purpose: string; validFor?: number;
}
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined
const text = (v: unknown) => typeof v === 'string' ? v : ''
export function parseCometEnvironment(raw: any): EnvironmentContext | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !['unknown','indoor','outdoor','conflicting'].includes(raw.reported)) return null
    const t: EnvironmentContext = { reported: raw.reported, source: text(raw.source), conflict: raw.conflict === true,
        ceiling: ['not-checked','detected','clear-to-limit','uncertain','deferred'].includes(raw.ceiling) ? raw.ceiling : 'uncertain',
        probeReason: text(raw.probeReason), purpose: text(raw.purpose) }
    if (typeof raw.aiIndoorZone === 'boolean') t.aiIndoorZone = raw.aiIndoorZone
    if (typeof raw.eftIndoor === 'boolean') t.eftIndoor = raw.eftIndoor
    for (const key of ['age','ceilingHeight','ceilingAge','checkedDistance','validFor'] as const) t[key] = num(raw[key])
    if (t.ceiling === 'detected' && (!t.ceilingHeight || !t.checkedDistance || t.ceilingHeight > t.checkedDistance || t.ceilingAge == null)) t.ceiling = 'uncertain'
    if (t.ceiling === 'clear-to-limit' && (!t.checkedDistance || t.ceilingAge == null)) t.ceiling = 'uncertain'
    if (t.ceiling !== 'detected') t.ceilingHeight = undefined
    // P10 is observation only. Ignore any forged claim that it authorized an action.
    return t
}
export function cometEnvironmentSummary(t: EnvironmentContext): string[] {
    const fmt = (v?: number) => v == null ? '?' : v.toFixed(2)
    const flag = (v?: boolean) => v == null ? 'unavailable' : v ? 'yes' : 'no'
    const ceiling = t.ceiling === 'detected' ? `Overhead surface detected: ${fmt(t.ceilingHeight)} m above the sampled eye position`
        : t.ceiling === 'clear-to-limit' ? `No overhead hit within ${fmt(t.checkedDistance)} m; open sky is not confirmed`
        : t.ceiling === 'deferred' ? 'Ceiling check deferred; no physical conclusion'
        : t.ceiling === 'uncertain' ? 'Overhead geometry uncertain'
        : 'Ceiling not checked, or previous check expired'
    return [`Reported environment: ${t.reported}${t.conflict ? ' (sources disagree)' : ''}`,
        `Source: ${t.source} · Recorded sample age: ${fmt(t.age)} s`,
        `AI indoor zone: ${flag(t.aiIndoorZone)} · EFT indoor: ${flag(t.eftIndoor)}. No AI zone does not prove outdoors.`,
        ceiling, `Ceiling sample age: ${fmt(t.ceilingAge)} s · Reason: ${t.probeReason.replace(/-/g,' ')}`,
        `Purpose: ${t.purpose.replace(/-/g,' ')}`,
        'Observation only: no change to action, grenade trajectory or hearing. An overhead surface does not prove an enclosed room or safe cover.']
}
