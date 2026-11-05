export type DoorAmbushContext = {
    state:string; reason:string; door:string; side:string; doorState:string; target:string; source:string; personality:string; feint:string; feintResult:string;
    contactAge?:number; evidenceAt?:number; knownX?:number; knownY?:number; knownZ?:number; x?:number; y?:number; z?:number;
    aimX?:number; aimY?:number; aimZ?:number; pose?:number; elapsed?:number; holdElapsed?:number; waitDuration?:number; remaining?:number; sharedRemaining?:number; validFor?:number;
    prepared:boolean; movementRequested:boolean; movementAccepted:boolean; movementObserved:boolean; arrived:boolean; retainedPosition:boolean;
    eyesClear:boolean; muzzleClear:boolean; angleVerified:boolean; visualContact:boolean; alternatives:string[];
}
const str=(x:unknown)=>typeof x==='string'?x:''
const num=(x:unknown)=>typeof x==='number'&&Number.isFinite(x)?x:undefined
const pos=(x:unknown)=>{const n=num(x);return n!=null&&n>=0?n:undefined}
export function parseCometDoorAmbush(r:any):DoorAmbushContext|null {
    if(!r||Array.isArray(r)||!['planning','approaching','settling','holding','ended'].includes(r.state))return null
    const prepared=r.prepared===true,movementRequested=prepared&&r.movementRequested===true,movementAccepted=movementRequested&&r.movementAccepted===true
    const arrived=movementAccepted&&r.arrived===true,eyesClear=r.eyesClear===true,muzzleClear=r.muzzleClear===true
    if(r.retainedPosition===true&&(r.movementRequested===true||r.movementAccepted===true||r.movementObserved===true||r.arrived===true))return null
    const retainedPosition=prepared&&r.retainedPosition===true
    const angleVerified=(arrived||retainedPosition)&&eyesClear&&muzzleClear&&r.angleVerified===true
    if(r.state==='holding'&&!angleVerified)return null
    return {state:r.state,reason:str(r.reason),door:str(r.door),side:str(r.side),doorState:str(r.doorState),target:str(r.target),source:str(r.source),personality:str(r.personality),feint:str(r.feint),feintResult:str(r.feintResult),
        contactAge:pos(r.contactAge),evidenceAt:num(r.evidenceAt),knownX:num(r.knownX),knownY:num(r.knownY),knownZ:num(r.knownZ),x:num(r.x),y:num(r.y),z:num(r.z),
        aimX:num(r.aimX),aimY:num(r.aimY),aimZ:num(r.aimZ),pose:pos(r.pose),elapsed:pos(r.elapsed),holdElapsed:pos(r.holdElapsed),waitDuration:pos(r.waitDuration),remaining:pos(r.remaining),sharedRemaining:pos(r.sharedRemaining),validFor:r.state==='ended'?0:pos(r.validFor),
        prepared,movementRequested,movementAccepted,movementObserved:movementAccepted&&r.movementObserved===true,arrived,retainedPosition,eyesClear,muzzleClear,angleVerified,visualContact:r.visualContact===true,
        alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((x:any)=>typeof x==='string').slice(0,12):[]}
}
export function cometDoorAmbushSummary(t:DoorAmbushContext,names:Record<string,string>={}):string[]{
    const f=(n?:number)=>n==null?'?':n.toFixed(1)
    return [`Door ambush: ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        `Door ${t.door||'?'} · ${t.side||'?'} · ${t.doorState||'?'} · ${t.personality||'?'}`,
        `Known contact: ${names[t.target]||t.target||'?'} · ${t.source||'?'} · ${f(t.contactAge)} s old · ${f(t.knownX)}, ${f(t.knownY)}, ${f(t.knownZ)}`,
        `Position: ${t.retainedPosition?'current position retained (no move)':t.arrived?'arrival confirmed':t.movementObserved?'moving':t.movementAccepted?'accepted; arrival not confirmed':t.prepared?'prepared; move not confirmed':'not prepared'} · ${f(t.x)}, ${f(t.y)}, ${f(t.z)}`,
        `Exit angle: ${t.angleVerified?'eyes and muzzle verified':'not verified'} · Aim ${f(t.aimX)}, ${f(t.aimY)}, ${f(t.aimZ)} · Pose ${f(t.pose)}`,
        `Wait ${f(t.holdElapsed)} / ${f(t.waitDuration)} s · Remaining ${f(t.remaining)} s · Shared budget ${f(t.sharedRemaining)} s`,
        `Feint: ${t.feint||'none'}${t.feintResult?' · '+t.feintResult:''}`,
        `Visual contact: ${t.visualContact?'observed; native combat takes priority':'not observed'}`,
        ...t.alternatives,'Waiting at a door is not proof of a successful ambush.']
}
