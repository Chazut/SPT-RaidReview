export type DoorContext = {
    state: string; reason: string; target: string; source: string; door: string; side: string;
    knownX?: number; knownY?: number; knownZ?: number; contactAge?: number;
    x?: number; y?: number; z?: number; pathLength?: number; elapsed?: number; remaining?: number;
    requested: boolean; movementAccepted: boolean; moved: boolean; arrived: boolean; validFor?: number;
    candidates: { door: string; side: string; eligible: boolean; reason: string; pathLength?: number; score?: number }[];
}
const text = (v: unknown) => typeof v === 'string' ? v : ''
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : undefined
export function parseCometDoor(raw: any): DoorContext | null {
    if (!raw || Array.isArray(raw) || !['planning','approaching','arrived','ended'].includes(raw.state)) return null
    const requested = raw.requested === true
    const accepted = requested && raw.movementAccepted === true
    const t: DoorContext = { state: raw.state, reason: text(raw.reason), target: text(raw.target), source: text(raw.source),
        door: text(raw.door), side: text(raw.side), requested, movementAccepted: accepted, moved: accepted && raw.moved === true,
        arrived: accepted && raw.state === 'arrived' && raw.arrived === true, candidates: [] }
    for (const k of ['knownX','knownY','knownZ','x','y','z'] as const) t[k] = num(raw[k])
    for (const k of ['contactAge','pathLength','elapsed','remaining','validFor'] as const) { const v = num(raw[k]); t[k] = v != null && v >= 0 ? v : undefined }
    if (Array.isArray(raw.candidates)) t.candidates = raw.candidates.slice(0,24).filter((c: any) => c && typeof c === 'object' && !Array.isArray(c)).map((c: any) => ({
        door: text(c.door), side: text(c.side), eligible: c.eligible === true, reason: text(c.reason), pathLength: num(c.pathLength), score: num(c.score) }))
    return t
}
export function cometDoorSummary(t: DoorContext, names: Record<string,string> = {}): string[] {
    const fmt = (v?: number) => v == null ? '?' : v.toFixed(1)
    const outcome = t.arrived ? 'Arrival confirmed at the protected frame' : t.state === 'ended' ? 'Preparation ended'
        : t.moved ? 'Movement observed' : t.movementAccepted ? 'Native movement accepted; arrival not confirmed'
        : t.requested ? 'Movement requested; acceptance not confirmed' : 'Comparing doorway positions; native search continues'
    return [outcome, `Reason: ${t.reason.replace(/-/g,' ')}`,
        `Door: ${t.door || 'not selected'} · Frame side: ${t.side || 'not selected'}`,
        `Known contact: ${names[t.target] || t.target || '?'} · ${t.source || '?'} · Recorded age: ${fmt(t.contactAge)} s`,
        `Remembered position: ${fmt(t.knownX)}, ${fmt(t.knownY)}, ${fmt(t.knownZ)}`,
        ...(t.requested ? [`Preparation point: ${fmt(t.x)}, ${fmt(t.y)}, ${fmt(t.z)} · Route: ${fmt(t.pathLength)} m`,
            `Approach: ${fmt(t.elapsed)} s · Remaining budget: ${fmt(t.remaining)} s`] : []),
        ...t.candidates.map(c => `${c.door} ${c.side}: ${c.eligible ? 'available' : 'rejected'} · ${c.reason.replace(/-/g,' ')}${c.eligible ? ` · ${fmt(c.pathLength)} m` : ''}`),
        'Uses remembered contact and local geometry, not the enemy\'s live position. Door preparation is part of Search; existing behavior colors are preserved.']
}
