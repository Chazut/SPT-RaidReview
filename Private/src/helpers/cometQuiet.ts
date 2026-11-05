export type QuietContext = {
    state: string; reason: string; target: string; action: string; source: string; personality: string; applied: boolean; active: boolean;
    age?: number; path?: number; chance?: number; roll?: number; used?: number; remaining?: number; stalled?: number;
    speedCap?: number; poseCap?: number; nativeSpeed?: number; appliedSpeed?: number; nativePose?: number; appliedPose?: number;
    validFor?: number; encounter?: number; draw?: number; lootBonus: boolean;
}
const str = (v: unknown) => typeof v === 'string' ? v : ''
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : undefined
export function parseCometQuiet(raw: any): QuietContext | null {
    if (!raw || Array.isArray(raw) || typeof raw !== 'object' || !['normal', 'walk', 'crouch'].includes(raw.state)) return null
    const result: QuietContext = { state: raw.state, reason: str(raw.reason), target: str(raw.target), action: str(raw.action), source: str(raw.source),
        personality: str(raw.personality), applied: raw.applied === true, active: raw.active === true, lootBonus: raw.lootBonus === true }
    for (const key of ['age', 'path', 'chance', 'roll', 'used', 'remaining', 'stalled', 'speedCap', 'poseCap', 'nativeSpeed', 'appliedSpeed', 'nativePose', 'appliedPose', 'validFor', 'encounter', 'draw'] as const) result[key] = num(raw[key])
    return result
}
export function cometQuietSummary(q: QuietContext, names: Record<string, string> = {}): string[] {
    const value = (v: number | undefined) => v == null ? '?' : v.toFixed(1)
    const scale = (v: number | undefined) => v == null ? '?' : v.toFixed(2)
    const pct = (v: number | undefined) => v == null ? '?' : (v * 100).toFixed(0) + '%'
    return [q.applied ? `${q.state === 'crouch' ? 'Crouched' : 'Walking'} approach applied to ${q.action}` : `Not slowing movement · ${q.reason.replace(/^quiet-/, '').replace(/-/g, ' ')}`,
        `${names[q.target] || q.target || 'No target'} · ${q.source || 'No evidence'} · Contact age ${value(q.age)} s · Known route ${value(q.path)} m`,
        `${q.personality || 'Unknown personality'} · Chance ${pct(q.chance)} · Roll ${q.roll?.toFixed(4) ?? 'none'}${q.lootBonus ? ' · Personally heard loot bonus' : ''}`,
        `Quiet time used ${value(q.used)} s · Remaining ${value(q.remaining)} s · No progress ${value(q.stalled)} s`,
        `Native speed ${scale(q.nativeSpeed)} → requested ${scale(q.appliedSpeed)} · Native pose ${scale(q.nativePose)} → requested ${scale(q.appliedPose)}`,
        `Encounter ${q.encounter ?? '?'} · Draw ${q.draw ?? '?'} · Native action and sound rules remain unchanged.`]
}
