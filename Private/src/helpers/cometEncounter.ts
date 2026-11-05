export type EncounterContext = {
    state: string; reason: string; target: string; choice: string; holdRefusal: string;
    count: number; required: number; observations: number[]; alternatives: string[];
    age: number; remaining: number; validFor: number; bonus: number; appliedBonus: number;
    x: number; y: number; z: number; eligible: boolean;
}
const text = (v: unknown) => typeof v === 'string' ? v : ''
export function parseCometEncounter(raw: any): EncounterContext | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !['inactive','observing','ready','ended'].includes(raw.state)) return null
    const finite = (v: any) => typeof v === 'number' && Number.isFinite(v)
    for (const k of ['count','required','age','remaining','validFor','bonus','appliedBonus','x','y','z']) if (!finite(raw[k])) return null
    if (!Number.isInteger(raw.count) || raw.count < 0 || raw.count > 10 || !Number.isInteger(raw.required) || raw.required < 2 || raw.required > 10
        || raw.age < 0 || raw.remaining < 0 || raw.validFor < 0 || raw.validFor > .35 || raw.bonus < 0 || raw.bonus > 25 || raw.appliedBonus < 0 || raw.appliedBonus > 25) return null
    if (!Array.isArray(raw.observations) || raw.observations.length !== raw.count || raw.observations.some((n: any, i: number) => !finite(n) || n < 0 || (i > 0 && n <= raw.observations[i-1]))) return null
    const eligible = raw.state === 'ready' && raw.eligible === true && raw.count >= raw.required && raw.remaining > 0
    return {state: raw.state, reason: text(raw.reason), target: text(raw.target), choice: text(raw.choice), holdRefusal: text(raw.holdRefusal),
        count: raw.count, required: raw.required, observations: [...raw.observations], age: raw.age, remaining: raw.remaining, validFor: raw.validFor,
        bonus: eligible ? raw.bonus : 0, appliedBonus: eligible ? Math.min(raw.appliedBonus,raw.bonus) : 0, eligible,
        x: raw.x, y: raw.y, z: raw.z, alternatives: Array.isArray(raw.alternatives) ? raw.alternatives.filter((s: any) => typeof s === 'string').slice(0,6) : []}
}
export function cometEncounterSummary(t: EncounterContext, names: Record<string,string> = {}): string[] {
    return [
        `Observed opponent: ${names[t.target] || t.target || 'unknown'}`,
        `${t.count} / ${t.required} separate appearances · ${t.reason.replace(/-/g,' ')}`,
        `Observation times (game clock): ${t.observations.map(n=>n.toFixed(1)+' s').join(', ') || 'none'}`,
        `Last personally seen opening: ${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)} · Sight age ${t.age.toFixed(1)} s · Remaining ${t.remaining.toFixed(1)} s`,
        `Hold preference: +${t.bonus.toFixed(1)} available / +${t.appliedBonus.toFixed(1)} applied${t.holdRefusal ? ' · '+t.holdRefusal.replace(/-/g,' ') : ''}`,
        `Choice: ${t.choice || 'not selected here'}. A preference is not proof of execution.`,
        ...t.alternatives,
        'Personal observations from this fight only. The opening is not the hidden enemy position.'
    ]
}
