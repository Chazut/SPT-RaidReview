export type LifecycleContext = {
    state:string; reason:string; previousAction:string; previousInstance:string;
    generation:number; cleanupSteps:number; failedSteps:number; failures:string[];
    freshState:boolean; validFor:number;
}
export function parseCometLifecycle(raw:any):LifecycleContext|null {
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['sleeping','downed','dead','removed','unavailable','resumed','disabled'].includes(raw.state))return null
    if(!['reason','previousAction','previousInstance'].every(k=>typeof raw[k]==='string'&&raw[k].length<=512))return null
    if(!['generation','cleanupSteps','failedSteps'].every(k=>Number.isSafeInteger(raw[k])&&raw[k]>=0)||raw.generation<1)return null
    if(!Array.isArray(raw.failures)||raw.failures.length>8||raw.failures.some((v:any)=>typeof v!=='string'||v.length>512))return null
    if(typeof raw.freshState!=='boolean'||raw.freshState!==(raw.state==='resumed'))return null
    if(raw.state==='disabled'&&raw.failedSteps<1)return null
    if(typeof raw.validFor!=='number'||!Number.isFinite(raw.validFor)||raw.validFor<0||raw.validFor>2)return null
    return {...raw}
}
export function cometLifecycleSummary(t:LifecycleContext):string[] {
    return [`State: ${t.state} · generation ${t.generation}`,`Reason: ${t.reason}`,
        ...(t.previousAction?[`Previous action: ${t.previousAction}`]:[]),
        ...(t.cleanupSteps?[`Cleanup: ${t.cleanupSteps} steps · ${t.failedSteps} failed`]:[]),
        ...t.failures.map(v=>`Cleanup failure: ${v}`),
        t.freshState?'Eligible again: fresh COMET state; old actions remain blocked.':
        t.state==='disabled'?'Cleanup or recovery failed. COMET stays disabled for this bot until the raid ends.':
        t.state==='sleeping'?'Sleeping: COMET stopped; fresh state will be created after waking.':
        t.state==='downed'?'Fika downed: COMET actions stopped; waiting for a valid revive.':
        t.state==='unavailable'?'Lifecycle state unavailable: COMET suspended until it can be verified.':
        'COMET actions stopped and owned controls released.',
        'COMET lifecycle observation only; this does not change RR death or extraction status.']
}
