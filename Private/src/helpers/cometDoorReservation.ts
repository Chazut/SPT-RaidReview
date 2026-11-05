export type DoorReservationContext = {
    state:string; reason:string; door:string; squad:string; owner:string; phase:string; target:string;
    token:number; remaining:number; budgetRemaining:number; retryRemaining:number; validFor:number;
    actionObserved:boolean; alternatives:string[];
}
export function parseCometDoorReservation(r:any):DoorReservationContext|null {
    if(!r||Array.isArray(r)||!['acquired','active','refused','released','expired'].includes(r.state))return null;
    if(['reason','door','squad','owner','phase','target'].some(k=>typeof r[k]!=='string')||!r.door||!r.owner||!r.squad||!r.phase
        ||!Number.isSafeInteger(r.token)||r.token<=0
        ||['remaining','budgetRemaining','retryRemaining','validFor'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)
        ||typeof r.actionObserved!=='boolean'||r.actionObserved!==(r.state==='active')
        ||(['released','expired'].includes(r.state)&&r.remaining!==0))return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((x:any)=>typeof x==='string').slice(0,8):[]};
}
export function cometDoorReservationSummary(t:DoorReservationContext):string[]{
    return [`Door ${t.door}: ${t.state}`,`Owner: ${t.owner} · Squad: ${t.squad}`,`Phase: ${t.phase} · Known contact: ${t.target||'not recorded'}`,
        t.reason.replace(/-/g,' '),`Lease: ${t.remaining.toFixed(1)} s · Original budget: ${t.budgetRemaining.toFixed(1)} s`,
        t.actionObserved?'Maneuver callback observed':t.state==='acquired'?'Reserved; execution not yet observed':'Reservation diagnostic only',
        ...(t.retryRemaining>0?[`Busy door retry: ${t.retryRemaining.toFixed(1)} s`]:[]),...t.alternatives];
}
