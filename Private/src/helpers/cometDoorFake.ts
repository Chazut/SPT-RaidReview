export type DoorFakeContext = {
    state:string; reason:string; interrupted:string; door:string; target:string; source:string; personality:string; grenade:string; weapon:string; reaction:string;
    chance?:number; roll?:number; contactAge?:number; knownX?:number; knownY?:number; knownZ?:number; elapsed?:number; validFor?:number; holsterAttempts?:number;
    coverVerified:boolean; drawRequested:boolean; callbackCompleted:boolean; callbackSucceeded:boolean; handsObserved:boolean;
    holsterRequested:boolean; holsterAccepted:boolean; weaponReady:boolean; guard:boolean; recoveryFailed:boolean; alternatives:string[];
}
const text=(v:unknown)=>typeof v==='string'?v:''
const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:undefined
export function parseCometDoorFake(raw:any):DoorFakeContext|null {
    if(!raw||Array.isArray(raw)||!['validating','drawing','holstering','recovering','suspended','completed','ended'].includes(raw.state))return null
    const drawRequested=raw.drawRequested===true, handsObserved=drawRequested&&raw.handsObserved===true
    const callbackCompleted=drawRequested&&raw.callbackCompleted===true
    const holsterRequested=handsObserved&&raw.holsterRequested===true, holsterAccepted=holsterRequested&&raw.holsterAccepted===true
    const weaponReady=drawRequested&&(handsObserved||callbackCompleted)&&raw.weaponReady===true
    if(raw.state==='completed'&&(!handsObserved||!holsterAccepted||!weaponReady||text(raw.interrupted)))return null
    const t:DoorFakeContext={state:raw.state,reason:text(raw.reason),interrupted:text(raw.interrupted),door:text(raw.door),target:text(raw.target),source:text(raw.source),personality:text(raw.personality),grenade:text(raw.grenade),weapon:text(raw.weapon),reaction:text(raw.reaction),
        drawRequested,handsObserved,callbackCompleted,callbackSucceeded:callbackCompleted&&raw.callbackSucceeded===true,holsterRequested,holsterAccepted,weaponReady,
        coverVerified:raw.coverVerified===true,guard:drawRequested&&raw.guard===true,recoveryFailed:drawRequested&&raw.recoveryFailed===true,
        alternatives:Array.isArray(raw.alternatives)?raw.alternatives.filter((v:unknown)=>typeof v==='string').slice(0,8):[]}
    for(const k of ['knownX','knownY','knownZ'] as const)t[k]=num(raw[k])
    for(const k of ['chance','roll','contactAge','elapsed','validFor','holsterAttempts'] as const){const n=num(raw[k]);t[k]=n!=null&&n>=0?n:undefined}
    return t
}
export function cometDoorFakeSummary(t:DoorFakeContext,names:Record<string,string>={}):string[]{
    const f=(v?:number)=>v==null?'?':v.toFixed(1)
    return [`Fake grenade: ${t.state.replace(/-/g,' ')} · ${t.reason.replace(/-/g,' ')}`,
        `Door ${t.door||'?'} · Chance ${f(t.chance)}% · Roll ${f(t.roll)}`,
        `Known contact: ${names[t.target]||t.target||'?'} · ${t.source||'?'} · Recorded age ${f(t.contactAge)} s`,
        `Remembered position: ${f(t.knownX)}, ${f(t.knownY)}, ${f(t.knownZ)}`,
        `Local protection: ${t.coverVerified?'verified before draw':'not confirmed'}`,
        `Grenade draw: ${t.drawRequested?'requested':'not requested'} · Hands: ${t.handsObserved?'grenade observed':'not confirmed'}`,
        `Draw callback: ${t.callbackCompleted?(t.callbackSucceeded?'accepted':'failed'):'not received'}`,
        `Weapon return: ${t.weaponReady?'ready observed':t.holsterAccepted?'accepted; not yet ready':t.holsterRequested?'requested; refused':'not requested'} · Attempts ${t.holsterAttempts??0}`,
        `New native throws ${t.guard?'temporarily blocked':'not blocked'} · Recovery ${t.recoveryFailed?'failed':'no failure recorded'} · Elapsed ${f(t.elapsed)} s`,
        ...(t.interrupted?[`Interrupted: ${t.interrupted.replace(/-/g,' ')}`]:[]),
        `Perceived reaction: ${(t.reaction||'not observed').replace(/-/g,' ')}`,...t.alternatives,
        'Drawing a grenade does not prove the opponent heard it or was baited. Native behavior colors are preserved.']
}
