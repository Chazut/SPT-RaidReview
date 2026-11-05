export type DoorInterruptionContext = {
    attempt:string; plan:string; phase:string; door:string; target:string; state:string; reason:string;
    cause:string; threat:string; evidence:string; remaining:number; quietRemaining:number; resumes:number;
    safeStage:boolean; feintConsumed:boolean; grenadeConsumed:boolean; nativeAccepted:boolean; executionObserved:boolean;
    gates:string[]; validFor:number;
}
export function parseCometDoorInterruption(r:any):DoorInterruptionContext|null {
    if(!r||Array.isArray(r)||!['interrupted','waiting','requested','resumed','abandoned','completed'].includes(r.state))return null
    const strings=['attempt','plan','phase','door','target','reason','cause','threat','evidence']
    const nums=['remaining','quietRemaining','resumes','validFor']
    const bools=['safeStage','feintConsumed','grenadeConsumed','nativeAccepted','executionObserved']
    if(strings.some(k=>typeof r[k]!=='string')||!r.attempt||!r.target||!r.door||!/^D(0[1-9]|10|11)$/.test(r.plan)
        ||nums.some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)
        ||!Number.isInteger(r.resumes)||r.resumes>1||bools.some(k=>typeof r[k]!=='boolean'))return null
    if(r.executionObserved&&(!r.nativeAccepted||r.resumes!==1)||r.state==='resumed'&&(!r.executionObserved||!r.safeStage)
        ||['interrupted','waiting'].includes(r.state)&&r.nativeAccepted)return null
    return {...r,gates:Array.isArray(r.gates)?r.gates.filter((x:any)=>typeof x==='string').slice(0,12):[]} as DoorInterruptionContext
}
export function cometDoorInterruptionSummary(t:DoorInterruptionContext):string[]{
    return [`${t.plan} / ${t.phase}: ${t.state}`,`Door ${t.door} · Original contact ${t.target}`,
        `Cause: ${t.cause.replace(/-/g,' ')} · Evidence: ${t.evidence}${t.threat?' · '+t.threat:''}`,
        t.reason.replace(/-/g,' '),`Original time left: ${t.remaining.toFixed(1)} s · Quiet wait: ${t.quietRemaining.toFixed(1)} s · Resumes: ${t.resumes}/1`,
        `Feint consumed: ${t.feintConsumed?'yes':'no'} · Grenade committed: ${t.grenadeConsumed?'yes':'no'}`,
        `Resume ${t.executionObserved?'observed':t.nativeAccepted?'accepted, execution unconfirmed':'not executed'}`,
        ...t.gates,'Normal target selection is preserved. No new roll or refunded time.']
}
