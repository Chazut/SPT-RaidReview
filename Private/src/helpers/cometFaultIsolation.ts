export type FaultIsolationContext = {
    module:string; entry:string; state:string; reason:string; error:string;
    count:number; total:number; retryIn:number; cleanupFailed:boolean; cleanupError?:string; first:boolean; validFor:number;
}
export function parseCometFaultIsolation(raw:any):FaultIsolationContext|null {
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['suspended','retrying','module-disabled','bot-disabled'].includes(raw.state))return null
    if(!['module','entry','reason','error'].every(k=>typeof raw[k]==='string'&&raw[k].length<=512))return null
    if(!raw.module||!raw.entry||!['count','total'].every(k=>Number.isSafeInteger(raw[k])&&raw[k]>=1)||raw.total<raw.count)return null
    if(typeof raw.cleanupFailed!=='boolean'||typeof raw.first!=='boolean')return null
    if(!['retryIn','validFor'].every(k=>typeof raw[k]==='number'&&Number.isFinite(raw[k])&&raw[k]>=0)||raw.retryIn>30||raw.validFor>2)return null
    if(raw.state==='bot-disabled'&&!raw.cleanupFailed||raw.state==='module-disabled'&&raw.retryIn!==0)return null
    if(raw.cleanupError!==undefined&&(typeof raw.cleanupError!=='string'||raw.cleanupError.length>512))return null
    return {...raw}
}
export function cometFaultIsolationSummary(t:FaultIsolationContext):string[] {
    return [`${t.module}: ${t.state.replace(/-/g,' ')}`,`Entry: ${t.entry}`,t.error,
        ...(t.cleanupError?[`Cleanup error: ${t.cleanupError}`]:[]),
        `Errors in window: ${t.count} · total this raid: ${t.total}`,
        t.state==='suspended'?`Retry in ${t.retryIn.toFixed(1)} s, with fresh state and eligibility checks.`:
        t.state==='retrying'?'Retry allowed; this does not confirm the action succeeded.':
        t.state==='bot-disabled'?'Recovery failed. COMET is disabled for this bot until the raid ends.':
        'This module is disabled for this bot until the raid ends.',
        'SAIN retains normal behavior. Alternatives: retry safely; quarantine the module; disable COMET if cleanup fails.']
}
