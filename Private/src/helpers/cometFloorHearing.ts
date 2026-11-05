export type FloorHearingContext = {
    state: string; reason: string; source: string; kind: string; geometry: string;
    nativeAudible: boolean; allowed: boolean; cached: boolean;
    floors?: number; nativeRange?: number; finalRange?: number; distance?: number;
    environment?: number; occlusion?: number; targetFactor?: number; appliedFactor?: number; emittedAt?: number;
}
const str = (v: unknown) => typeof v === 'string' ? v : ''
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : undefined
export function parseCometFloorHearing(raw: any): FloorHearingContext | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !['native', 'attenuated', 'blocked'].includes(raw.state)) return null
    const h: FloorHearingContext = { state: raw.state, reason: str(raw.reason), source: str(raw.source), kind: str(raw.kind),
        geometry: str(raw.geometry), nativeAudible: raw.nativeAudible === true, allowed: raw.allowed === true, cached: raw.cached === true }
    for (const k of ['floors', 'nativeRange', 'finalRange', 'distance', 'environment', 'occlusion', 'targetFactor', 'appliedFactor', 'emittedAt'] as const) h[k] = num(raw[k])
    return h
}
export function cometFloorHearingSummary(h: FloorHearingContext, names: Record<string, string> = {}): string[] {
    const n = (v: number | undefined) => v == null ? '?' : v.toFixed(1)
    const pct = (v: number | undefined) => v == null ? '?' : (v * 100).toFixed(0) + '%'
    return [h.state === 'blocked' ? 'Sound rejected by the floor range check' : h.state === 'attenuated' ? 'Range reduced; native reaction still allowed' : 'Native hearing range retained',
        `${h.kind || 'Sound'} · ${names[h.source] || h.source || 'Unknown source'} · ${n(h.distance)} m`,
        `Hearing range: ${n(h.nativeRange)} m → ${n(h.finalRange)} m`,
        `Estimated floor separation: ${h.floors === 2 ? 'at least two' : h.floors === 1 ? 'one' : 'unconfirmed'} · ${h.geometry.replace(/^floor-/, '').replace(/-/g, ' ')}${h.cached ? ' · short geometry cache' : ''}`,
        `Target range factor ${pct(h.targetFactor)} · Applied to native range ${pct(h.appliedFactor)} · Native environment ${pct(h.environment)}, obstruction ${pct(h.occlusion)}`,
        `Reason: ${h.reason.replace(/^floor-/, '').replace(/-/g, ' ')}`,
        'Recent hearing check, not a combat action or proof of a new contact. Behavior colors stay unchanged.']
}
