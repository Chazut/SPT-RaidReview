export type DoorSupportContext = {
    operation:string; leader:string; support:string; leaderName:string; supportName:string; door:string; target:string;
    role:string; state:string; reason:string; x:number; y:number; z:number; lookX:number; lookY:number; lookZ:number;
    remaining:number; offerRemaining:number; pathLength:number; protection:number; validFor:number;
    accepted:boolean; movementRequested:boolean; movementAccepted:boolean; arrived:boolean; retained:boolean;
    eyesClear:boolean; muzzleClear:boolean; angleVerified:boolean; alternatives:string[]
}
export function parseCometDoorSupport(r:any):DoorSupportContext|null {
    if(!r||Array.isArray(r)||!['overwatch','rear-guard'].includes(r.role)
        ||!['proposed','accepted','moving','holding','angle-blocked','released','rejected'].includes(r.state))return null
    const strings=['operation','leader','support','door','target']
    if(strings.some(k=>typeof r[k]!=='string'||!r[k])||r.leader===r.support)return null
    const nums=['x','y','z','lookX','lookY','lookZ','remaining','offerRemaining','pathLength','protection','validFor']
    if(nums.some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))||['remaining','offerRemaining','pathLength','protection','validFor'].some(k=>r[k]<0)||r.protection>1)return null
    const bools=['accepted','movementRequested','movementAccepted','arrived','retained','eyesClear','muzzleClear','angleVerified']
    if(bools.some(k=>typeof r[k]!=='boolean'))return null
    if(r.movementAccepted&&(!r.movementRequested||!r.accepted)||r.arrived&&(!r.movementAccepted||!r.accepted)
        ||r.retained&&(!r.accepted||r.movementRequested||r.arrived)
        ||r.angleVerified&&(!r.accepted||!r.eyesClear||!r.muzzleClear||!r.arrived&&!r.retained))return null
    if(r.state==='proposed'&&r.accepted||['accepted','moving','holding'].includes(r.state)&&!r.accepted
        ||r.state==='holding'&&!r.angleVerified||r.state==='moving'&&!r.movementAccepted
        ||['released','rejected'].includes(r.state)&&r.angleVerified)return null
    return {...Object.fromEntries([...nums,...bools,...strings].map(k=>[k,r[k]])),role:r.role,state:r.state,
        reason:typeof r.reason==='string'?r.reason:'',leaderName:typeof r.leaderName==='string'?r.leaderName:'',supportName:typeof r.supportName==='string'?r.supportName:'',
        alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((x:any)=>typeof x==='string').slice(0,12):[]} as DoorSupportContext
}
export function cometDoorSupportSummary(t:DoorSupportContext):string[]{
    return [`${t.role==='overwatch'?'Door overwatch':'Rear watch'}: ${t.state.replace(/-/g,' ')}`,
        `Initiator: ${t.leaderName||t.leader} (${t.leader}) → Support: ${t.supportName||t.support} (${t.support})`,
        `Door ${t.door} · Known contact ${t.target}`,t.reason.replace(/-/g,' '),
        `Position ${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)} · route ${t.pathLength.toFixed(1)} m`,
        `Look towards ${t.lookX.toFixed(1)}, ${t.lookY.toFixed(1)}, ${t.lookZ.toFixed(1)}`,
        `Native role ${t.accepted?'accepted':'not accepted'} · ${t.retained?'current position retained':t.arrived?'arrival confirmed':t.movementAccepted?'travelling':'no movement accepted'}`,
        `Actual angle ${t.angleVerified?'confirmed':'not confirmed'} · eyes ${t.eyesClear?'clear':'unconfirmed'} / muzzle ${t.muzzleClear?'clear':'unconfirmed'}`,
        `Remaining ${t.remaining.toFixed(1)} s · offer ${t.offerRemaining.toFixed(1)} s · protection ${(t.protection*100).toFixed(0)}%`,
        ...t.alternatives,'The initiator does not wait for support. Native combat and fire safety remain active.']
}
