export type CombatStepContext = {
    state: string; reason: string; target: string; action: string; personality: string; source: string; direction: string;
    chance: number; roll: number; remaining: number; stepRemaining: number; validFor: number; actualDistance: number;
    displacement: number; contactAge: number; knownX: number; knownY: number; knownZ: number;
    anchorX: number; anchorY: number; anchorZ: number; goalX: number; goalY: number; goalZ: number; duration: number;
    requests: number; rolled: boolean; requested: boolean; movementObserved: boolean; alternatives: string[];
}
export function parseCometCombatStep(r: any): CombatStepContext | null {
    if (!r || Array.isArray(r) || !['planning','moving','ended'].includes(r.state)
        || ['reason','target','action','personality','source','direction'].some(k => typeof r[k] !== 'string')
        || ['chance','roll','remaining','stepRemaining','validFor','actualDistance','displacement','contactAge','duration','requests'].some(k => typeof r[k] !== 'number' || !Number.isFinite(r[k]) || r[k] < 0)
        || ['knownX','knownY','knownZ','anchorX','anchorY','anchorZ','goalX','goalY','goalZ'].some(k => typeof r[k] !== 'number' || !Number.isFinite(r[k]))
        || ['rolled','requested','movementObserved'].some(k => typeof r[k] !== 'boolean')
        || r.chance > 100 || r.roll >= 100 || r.validFor > .4 || !Number.isInteger(r.requests)
        || (r.requested !== (r.requests > 0)) || (r.movementObserved && (!r.requested || r.actualDistance < .1))
        || (r.state === 'ended' && r.validFor !== 0)
        || (r.state !== 'ended' && (!r.target || !r.rolled || !['StandAndShoot','DogFight'].includes(r.action) || r.source !== 'personal-vision'))
        || (r.state === 'moving' && !r.requested)) return null;
    return {...r, alternatives: Array.isArray(r.alternatives) ? r.alternatives.filter((x:any) => typeof x === 'string').slice(0,6) : []};
}
export function cometCombatStepSummary(t: CombatStepContext): string[] {
    return [`${t.action}: ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        `${t.personality}: ${t.chance.toFixed(0)}% chance · ${t.rolled ? 'Roll '+t.roll.toFixed(1) : 'Not rolled (ineligible)'}`,
        `Known contact: ${t.target || 'none'} · ${t.source || 'not recorded'} · ${t.contactAge.toFixed(1)} s old`,
        `Step: ${t.direction || 'not selected'} · ${t.requests} requested · ${t.stepRemaining.toFixed(2)} s remaining`,
        `Observed travel: ${t.actualDistance.toFixed(2)} m · From starting point: ${t.displacement.toFixed(2)} m`,
        t.movementObserved ? 'Movement observed; no hit or accuracy claim' : t.requested ? 'Movement requested; motion not yet confirmed' : 'No movement requested',
        `Sequence remaining: ${t.remaining.toFixed(2)} s`, ...t.alternatives];
}
