export type ValidityContext = {
    operation:string; reason:string; source:string; sourceInstance:string;
    blocked:number; summary:boolean; validFor:number;
}
export function parseCometValidity(raw:any):ValidityContext|null {
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['movement','register-player','remove-player','under-fire'].includes(raw.operation))return null
    if(!['reason','source','sourceInstance'].every(k=>typeof raw[k]==='string'&&raw[k].length<=512)||!raw.reason)return null
    if(!Number.isSafeInteger(raw.blocked)||raw.blocked<1||raw.blocked>2147483647)return null
    if(typeof raw.summary!=='boolean'||typeof raw.validFor!=='number'||!Number.isFinite(raw.validFor)||raw.validFor<0||raw.validFor>2)return null
    if(raw.summary&&raw.validFor!==0)return null
    return {...raw}
}
export function cometValiditySummary(t:ValidityContext):string[] {
    return [`Blocked native call: ${t.operation}`,`Reason: ${t.reason}`,`Blocked calls for this operation/reason: ${t.blocked}`,
        ...(t.source?[`Source profile: ${t.source}`]:[]),...(t.sourceInstance?[`Source instance: ${t.sourceInstance}`]:[]),
        ...(t.summary?['Final aggregated count.']:[]),
        'Reference safety only; damage, death and extraction status are unchanged.']
}
