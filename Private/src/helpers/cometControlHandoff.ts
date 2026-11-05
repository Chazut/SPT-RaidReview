export type ControlHandoffContext = {
    state: string; owner: string; layer: string; previousOwner: string; reason: string;
    releasedAction: string; elapsed: number; pending: boolean; rapidReturns: number;
};
export function parseCometControlHandoff(t: any): ControlHandoffContext | null {
    if (!t || Array.isArray(t) || !['observed', 'released', 'waiting'].includes(t.state)
        || !['unknown','combat','recovery','sain','orbit','questing','looting','extraction','sleep','other'].includes(t.owner)
        || ['layer','previousOwner','reason','releasedAction'].some(k => typeof t[k] !== 'string' || t[k].length > 256)
        || !Number.isFinite(t.elapsed) || t.elapsed < 0 || t.elapsed > 86400 || typeof t.pending !== 'boolean'
        || !Number.isSafeInteger(t.rapidReturns) || t.rapidReturns < 0 || t.rapidReturns > 100000) return null;
    return t;
}
export function cometControlHandoffSummary(t: ControlHandoffContext): string[] {
    const names: Record<string,string> = { orbit:'ORBIT', questing:'Questing Bots', looting:'Looting Bots', sain:'SAIN', recovery:'COMET recovery', combat:'Combat', sleep:'Sleeping', extraction:'Extraction', other:'Other layer', unknown:'Unknown' };
    return [
        `Observed controller: ${names[t.owner]} · ${t.layer || 'layer unavailable'}`,
        `${t.reason.replace(/-/g,' ')} · ${t.elapsed.toFixed(1)} s · previous: ${names[t.previousOwner] || t.previousOwner || 'unknown'}`,
        t.pending ? `COMET released ${t.releasedAction || 'its action'}; an out-of-combat takeover has not been observed.` : 'Layer change observed; this does not prove its next action succeeded.',
        `Quick returns to combat: ${t.rapidReturns}. A new threat can legitimately cause this. No extra handoff delay is imposed.`
    ];
}
