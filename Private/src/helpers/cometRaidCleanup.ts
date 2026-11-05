export type RaidCleanupContext = {
    state:string; reason:string; bots:number; steps:number; failedSteps:number;
    pendingConfigDiscarded:boolean; remainingBots:number; remainingScans:number;
    durationMs:number; failures:string[];
}
export function parseCometRaidCleanup(raw:any):RaidCleanupContext|null {
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['completed','completed-with-errors'].includes(raw.state))return null
    if(typeof raw.reason!=='string'||raw.reason.length>240)return null
    if(!['bots','steps','failedSteps','remainingBots','remainingScans'].every(k=>Number.isSafeInteger(raw[k])&&raw[k]>=0&&raw[k]<=2147483647))return null
    if(raw.failedSteps>raw.steps||typeof raw.pendingConfigDiscarded!=='boolean'||!Number.isFinite(raw.durationMs)||raw.durationMs<0)return null
    if(!Array.isArray(raw.failures)||raw.failures.length>12||!raw.failures.every((f:any)=>typeof f==='string'&&f.length<=512))return null
    return {...raw}
}
export function cometRaidCleanupSummary(t:RaidCleanupContext):string[] {
    return [`End-of-raid cleanup: ${t.state}`,`${t.bots} tracked bots; ${t.steps} cleanup steps; ${t.failedSteps} failures.`,
        `Duration: ${t.durationMs.toFixed(2)} ms.`,
        `Remaining tracked bots: ${t.remainingBots}; cover searches: ${t.remainingScans}.`,
        ...(t.pendingConfigDiscarded?['An outstanding config response was detached and cannot affect another raid.']:[]),
        ...t.failures.map(f=>`Cleanup failure: ${f}`),
        'Local COMET cleanup report, not a combat decision or a measurement of total game memory.']
}
