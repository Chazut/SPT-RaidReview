export type DoorEmergencyContext = {
    attempt:string; door:string; plan:string; phase:string; target:string; evidence:string; state:string; reason:string; choice:string; hands:string;
    evidenceAge:number; distance:number; remaining:number; pathLength:number; x:number; y:number; z:number; validFor:number;
    confirmed:boolean; weaponReady:boolean; nativeAccepted:boolean; actionObserved:boolean; moveAccepted:boolean; movementObserved:boolean; arrived:boolean; safePosition:boolean;
    alternatives:string[];
}
export function parseCometDoorEmergency(r:any):DoorEmergencyContext|null {
    if(!r||Array.isArray(r)||!['recovering','observed','ended'].includes(r.state)||!['recover-only','stay','retreat'].includes(r.choice))return null;
    const strings=['attempt','door','plan','phase','target','evidence','reason','hands'];
    const nums=['evidenceAge','distance','remaining','pathLength','validFor'];
    const bools=['confirmed','weaponReady','nativeAccepted','actionObserved','moveAccepted','movementObserved','arrived','safePosition'];
    if(strings.some(k=>typeof r[k]!=='string')||!r.attempt||!r.door||!r.target||!['D05','D06','D07','D08'].includes(r.plan)
        ||nums.some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)
        ||['x','y','z'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))||bools.some(k=>typeof r[k]!=='boolean'))return null;
    if(r.actionObserved&&!r.nativeAccepted||r.moveAccepted&&(!r.nativeAccepted||!r.confirmed||r.choice!=='retreat')
        ||r.movementObserved&&(!r.actionObserved||!r.moveAccepted)||r.arrived&&!r.movementObserved||r.choice==='retreat'&&!r.confirmed)return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((x:any)=>typeof x==='string').slice(0,8):[]} as DoorEmergencyContext;
}
export function cometDoorEmergencySummary(t:DoorEmergencyContext):string[]{
    return [`${t.plan} / ${t.phase}: ${t.state}`,`Door ${t.door} · Known contact ${t.target}`,
        `Evidence: ${t.evidence} (${t.evidenceAge.toFixed(1)} s old) · ${t.confirmed?'Visible danger':'Warning only, exit unconfirmed'}`,
        t.reason.replace(/-/g,' '),`Choice: ${t.choice.replace(/-/g,' ')} · Weapon ${t.weaponReady?'ready':'not ready'} · Hands: ${t.hands}`,
        `Time left: ${t.remaining.toFixed(1)} s · Path: ${t.pathLength.toFixed(1)} m`,
        `Action ${t.actionObserved?'observed':t.nativeAccepted?'accepted, execution unconfirmed':'not executed'}`,
        `Retreat ${t.arrived?'arrival confirmed':t.movementObserved?'movement observed':t.moveAccepted?'requested, movement unconfirmed':'not executed'}`,
        ...t.alternatives,'Cancelled preparation will not resume. Normal combat resumes when the weapon is ready.'];
}
