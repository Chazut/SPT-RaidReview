export type ImpactContext = {
    state: string; reason: string; evidence: string; contact: string; requested: string; observed: string; coverReason: string;
    active: boolean; nativeAccepted: boolean; actionObserved: boolean; movementObserved: boolean; lookApplied: boolean;
    remaining?: number; validFor?: number; sectorYaw?: number; sectorHalfWidth?: number; hits?: number; probes?: number;
}
const str = (v: unknown) => typeof v === 'string' ? v : ''
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : undefined
export function parseCometImpact(raw: any): ImpactContext | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !['received','requested','accepted','observed','native','ended','rejected'].includes(raw.state)) return null
    const h: ImpactContext = { state: raw.state, reason: str(raw.reason), evidence: str(raw.evidence),
        contact: ['seen','heard-shot'].includes(raw.evidence) ? str(raw.contact) : '', requested: str(raw.requested), observed: str(raw.observed), coverReason: str(raw.coverReason),
        active: raw.active === true && !['ended','rejected','native'].includes(raw.state), nativeAccepted: raw.nativeAccepted === true,
        actionObserved: raw.actionObserved === true && raw.nativeAccepted === true, movementObserved: raw.movementObserved === true && raw.actionObserved === true && raw.nativeAccepted === true,
        lookApplied: raw.lookApplied === true }
    for (const k of ['remaining','validFor','sectorYaw','sectorHalfWidth','hits','probes'] as const) h[k] = num(raw[k])
    if (h.sectorYaw != null && (h.sectorYaw < 0 || h.sectorYaw >= 360)) h.sectorYaw = undefined
    return h
}
export function cometImpactSummary(h: ImpactContext, names: Record<string,string> = {}): string[] {
    const n = (v: number | undefined) => v == null ? '?' : v.toFixed(2)
    return [`${h.state === 'ended' ? 'Reaction ended' : h.state === 'native' ? 'Native reaction retained' : h.state === 'observed' && h.actionObserved ? 'Defensive action observed' : h.nativeAccepted ? 'Decision accepted; action execution not yet observed' : h.state === 'requested' ? 'Defensive reaction requested; execution not confirmed' : 'Direct bullet impact recorded'} · ${h.reason.replace(/-/g,' ')}`,
        h.contact ? `Independently perceived contact: ${names[h.contact] || h.contact} (${h.evidence})` : 'Shooter unknown; no position or enemy contact revealed.',
        h.sectorYaw == null ? 'No usable impact direction.' : `Coarse incoming sector: ${n(h.sectorYaw)}° ± ${n(h.sectorHalfWidth)}°. Not a firing target.`,
        `Danger memory remaining: ${n(h.remaining)} s · ${h.hits ?? '?'} hit(s)`,
        `Requested: ${h.requested || 'none'} · Observed: ${h.observed || 'not yet'}`,
        `Movement observed: ${h.movementObserved ? 'yes' : 'no'} · Look applied: ${h.lookApplied ? 'yes' : 'no'}`,
        `Local alternatives checked: ${h.probes ?? 0}/4 · ${h.coverReason.replace(/-/g,' ') || 'not evaluated'}`,
        'Nearby geometry is a protection heuristic, not proof of safety. Real combat and urgent native actions take priority.']
}
