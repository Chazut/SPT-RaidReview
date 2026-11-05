export type DoorClearContext = {
    mode:'recent'|'search'; baseChance?:number; ageFactor?:number; selectionContactAge?:number; contactLimit?:number; fadeFrom?:number; fadeUntil?:number;
    state:string; reason:string; door:string; target:string; source:string; personality:string; variant:string; grenadeItem:string;
    grenadeOutcome:string; feint:string; feintOutcome:string; chance?:number; roll?:number; variantRoll?:number; contactAge?:number;
    knownX?:number; knownY?:number; knownZ?:number; x?:number; y?:number; z?:number; elapsed?:number; validFor?:number;
    projectile?:number; dangerRadius?:number; blastPause?:number; fuseEstimate?:number;
    coveredDestination:boolean; doorOpenObserved:boolean; feintAttempted:boolean; throwRequested:boolean; throwAccepted:boolean;
    projectileObserved:boolean; explosionConfirmed:boolean; movementRequested:boolean; movementAccepted:boolean; movementObserved:boolean;
    thresholdCrossed:boolean; arrived:boolean; weaponReady:boolean; alternatives:string[];
}
const text=(x:unknown)=>typeof x==='string'?x:''
const num=(x:unknown)=>typeof x==='number'&&Number.isFinite(x)?x:undefined
export function parseCometDoorClear(r:any):DoorClearContext|null {
    if(!r||Array.isArray(r)||!['preparing','opening','planning','feint','ready','throw-ready','throwing','waiting-blast','post-blast','entry-ready','entering','completed','ended'].includes(r.state))return null
    const throwRequested=r.throwRequested===true,throwAccepted=throwRequested&&r.throwAccepted===true
    const projectile=num(r.projectile),projectileObserved=throwRequested&&projectile!=null&&Number.isInteger(projectile)&&r.projectileObserved===true
    const explosionConfirmed=projectileObserved&&r.explosionConfirmed===true
    const movementRequested=r.movementRequested===true,movementAccepted=movementRequested&&r.movementAccepted===true
    const movementObserved=movementAccepted&&r.movementObserved===true,thresholdCrossed=movementObserved&&r.thresholdCrossed===true
    const weaponReady=r.weaponReady===true,arrived=thresholdCrossed&&weaponReady&&r.arrived===true
    const variant=text(r.variant)
    const mode=r.mode==null?'recent':r.mode
    if(mode!=='recent'&&mode!=='search')return null
    const baseChance=num(r.baseChance),ageFactor=num(r.ageFactor),selectionContactAge=num(r.selectionContactAge),contactLimit=num(r.contactLimit),fadeFrom=num(r.fadeFrom),fadeUntil=num(r.fadeUntil)
    if(mode==='search'){
        if(baseChance==null||baseChance<0||baseChance>100||ageFactor==null||ageFactor<0||ageFactor>1||selectionContactAge==null||contactLimit==null||fadeFrom==null||fadeUntil==null
            ||fadeFrom<0||fadeUntil<=fadeFrom||contactLimit>fadeUntil||selectionContactAge<=fadeFrom||selectionContactAge>=contactLimit
            ||num(r.chance)==null||Math.abs(r.chance-baseChance*ageFactor)>.01||Math.abs(ageFactor-(fadeUntil-selectionContactAge)/(fadeUntil-fadeFrom))>.001)return null
        if(!['undecided','direct'].includes(variant)||throwRequested||r.throwAccepted===true||r.projectileObserved===true||r.explosionConfirmed===true
            ||['throw-ready','throwing','waiting-blast','post-blast'].includes(r.state))return null
    }
    if(r.state==='completed'&&(!arrived||!r.doorOpenObserved||!['direct','grenade'].includes(variant)||(variant==='grenade'&&(!throwAccepted||!explosionConfirmed))))return null
    const positive=(x:unknown)=>{const n=num(x);return n!=null&&n>=0?n:undefined}
    return {mode,baseChance,ageFactor,selectionContactAge,contactLimit,fadeFrom,fadeUntil,state:r.state,reason:text(r.reason),door:text(r.door),target:text(r.target),source:text(r.source),personality:text(r.personality),variant,
        grenadeItem:text(r.grenadeItem),grenadeOutcome:text(r.grenadeOutcome),feint:text(r.feint),feintOutcome:text(r.feintOutcome),
        chance:positive(r.chance),roll:positive(r.roll),variantRoll:positive(r.variantRoll),contactAge:positive(r.contactAge),
        knownX:num(r.knownX),knownY:num(r.knownY),knownZ:num(r.knownZ),x:num(r.x),y:num(r.y),z:num(r.z),elapsed:positive(r.elapsed),validFor:positive(r.validFor),
        projectile,projectileObserved,explosionConfirmed,throwRequested,throwAccepted,movementRequested,movementAccepted,movementObserved,thresholdCrossed,arrived,weaponReady,
        dangerRadius:positive(r.dangerRadius),blastPause:positive(r.blastPause),fuseEstimate:positive(r.fuseEstimate),
        coveredDestination:r.coveredDestination===true,doorOpenObserved:r.doorOpenObserved===true,feintAttempted:r.feintAttempted===true,
        alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((x:any)=>typeof x==='string').slice(0,12):[]}
}
export const cometDoorClearTitle=(t:DoorClearContext)=>t.mode==='search'?'Room check while searching - D08':'Room entry - D07'
export function cometDoorClearSummary(t:DoorClearContext,names:Record<string,string>={}):string[]{
    const f=(n?:number)=>n==null?'?':n.toFixed(1)
    return [`${t.mode==='search'?'Uncertain room check':'Room entry'}: ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        `Door ${t.door||'?'} · ${t.doorOpenObserved?'open observed':'opening not confirmed'} · ${t.personality||'?'} · Chance ${f(t.chance)}% · Roll ${f(t.roll)}`,
        ...(t.mode==='search'?[`At selection: ${f(t.selectionContactAge)} s old · Base ${f(t.baseChance)}% × age factor ${f((t.ageFactor??0)*100)}% = ${f(t.chance)}%`,
            `Fade ${f(t.fadeFrom)}-${f(t.fadeUntil)} s · Memory limit ${f(t.contactLimit)} s · Remaining ${f(Math.max(0,(t.contactLimit??0)-(t.contactAge??0)))} s`,
            'One opportunity shared with D07. No real grenade; silence is not proof of a camper.']:[]),
        `Known contact: ${names[t.target]||t.target||'?'} · ${t.source||'?'} · ${f(t.contactAge)} s old · ${f(t.knownX)}, ${f(t.knownY)}, ${f(t.knownZ)}`,
        `Plan: ${t.variant||'undecided'} · Destination ${f(t.x)}, ${f(t.y)}, ${f(t.z)}${t.coveredDestination?' · protected point':''}`,
        `Feint: ${t.feintAttempted?t.feint+' · '+t.feintOutcome:'not used'}`,
        ...(t.mode==='search'?[]:[`Grenade: ${t.grenadeOutcome||'not thrown'} · Request ${t.throwRequested?'yes':'no'} · Accepted ${t.throwAccepted?'yes':'no'} · Projectile ${t.projectileObserved?t.projectile:'not confirmed'}`,
        `Explosion: ${t.explosionConfirmed?'confirmed for this projectile':'not confirmed'} · Fuse estimate ${f(t.fuseEstimate)} s · Pause ${f(t.blastPause)} s`]),
        `Entry: ${t.arrived?'arrival confirmed':t.thresholdCrossed?'threshold crossed':t.movementObserved?'moving':t.movementAccepted?'accepted; movement not confirmed':t.movementRequested?'requested':'not requested'} · Weapon ${t.weaponReady?'ready':'not ready'}`,
        ...t.alternatives,...(t.mode==='search'?[]:['A timer or missing projectile never proves an explosion.']),
        'Entering does not prove the room is empty. Native behavior colors are preserved.']
}
