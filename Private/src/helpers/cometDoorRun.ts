export type DoorRunContext = {
    state: string; reason: string; style: string; door: string; target: string; source: string; personality: string;
    jumpReason: string; runReason: string; jumpEligible: boolean; runEligible: boolean; alternatives: string[];
    chance?: number; roll?: number; styleRoll?: number; preference?: number; contactAge?: number; validFor?: number;
    knownX?: number; knownY?: number; knownZ?: number; stackX?: number; stackY?: number; stackZ?: number;
    farX?: number; farY?: number; farZ?: number; angleX?: number; angleY?: number; angleZ?: number;
    actualX?: number; actualY?: number; actualZ?: number; stamina?: number; forwardSpeed?: number; distanceMoved?: number;
    elapsed?: number; remaining?: number; turnElapsed?: number; watchElapsed?: number;
    doorOpenRequested: boolean; doorOpenObserved: boolean; movementAccepted: boolean; sprintObserved: boolean;
    farArrived: boolean; sprintExitObserved: boolean; returnAccepted: boolean; returned: boolean; visualAcquired: boolean;
}
const text=(v: unknown)=>typeof v==='string'?v:''
const num=(v: unknown)=>typeof v==='number'&&Number.isFinite(v)?v:undefined
export function parseCometDoorRun(raw: any): DoorRunContext | null {
    if(!raw||Array.isArray(raw)||!['validating','opening','across','turning','return-pending','returning','watching','completed','ended','delegated'].includes(raw.state))return null
    const movementAccepted=raw.style==='run-by'&&raw.movementAccepted===true
    const sprintObserved=movementAccepted&&raw.sprintObserved===true
    const farArrived=sprintObserved&&raw.farArrived===true
    const sprintExitObserved=farArrived&&raw.sprintExitObserved===true
    const returnAccepted=sprintExitObserved&&raw.returnAccepted===true
    const t: DoorRunContext={state:raw.state,reason:text(raw.reason),style:text(raw.style),door:text(raw.door),target:text(raw.target),source:text(raw.source),personality:text(raw.personality),
        jumpReason:text(raw.jumpReason),runReason:text(raw.runReason),jumpEligible:raw.jumpEligible===true,runEligible:raw.runEligible===true,
        alternatives:Array.isArray(raw.alternatives)?raw.alternatives.filter((x:unknown)=>typeof x==='string').slice(0,8):[],
        doorOpenRequested:raw.doorOpenRequested===true,doorOpenObserved:raw.doorOpenObserved===true,movementAccepted,sprintObserved,farArrived,sprintExitObserved,returnAccepted,
        returned:returnAccepted&&raw.returned===true,visualAcquired:raw.visualAcquired===true}
    for(const k of ['knownX','knownY','knownZ','stackX','stackY','stackZ','farX','farY','farZ','angleX','angleY','angleZ','actualX','actualY','actualZ','forwardSpeed'] as const)t[k]=num(raw[k])
    for(const k of ['chance','roll','styleRoll','preference','contactAge','validFor','stamina','distanceMoved','elapsed','remaining','turnElapsed','watchElapsed'] as const){const n=num(raw[k]);t[k]=n!=null&&n>=0?n:undefined}
    return t
}
export function cometDoorRunSummary(t: DoorRunContext,names:Record<string,string>={}):string[] {
    const f=(n?:number)=>n==null?'?':n.toFixed(1)
    return [`Doorway reconnaissance: ${t.state.replace(/-/g,' ')} · ${t.reason.replace(/-/g,' ')}`,
        `Door: ${t.door||'?'} · ${t.personality||'?'} · Shared opportunity ${f(t.chance)}% · Roll ${f(t.roll)}`,
        `Style: ${t.style||'pending'} · Run-by preference ${f(t.preference)}% when both are safe · Style roll ${f(t.styleRoll)}`,
        `Jump: ${t.jumpEligible?'eligible':t.jumpReason||'not checked'} · Run-by: ${t.runEligible?'eligible':t.runReason||'not checked'}`,
        `Known contact: ${names[t.target]||t.target||'?'} · ${t.source||'?'} · Recorded age ${f(t.contactAge)} s`,
        `Remembered position: ${f(t.knownX)}, ${f(t.knownY)}, ${f(t.knownZ)}`,
        ...(t.farX!=null?[`Far target: ${f(t.farX)}, ${f(t.farY)}, ${f(t.farZ)} · Return angle: ${f(t.angleX)}, ${f(t.angleY)}, ${f(t.angleZ)}`]:[]),
        ...(t.actualX!=null?[`Observed bot position: ${f(t.actualX)}, ${f(t.actualY)}, ${f(t.actualZ)}`]:[]),
        `Door: ${t.doorOpenObserved?'open observed':t.doorOpenRequested?'opening requested; not confirmed':'not opened yet'}`,
        `Outward sprint: ${t.sprintObserved?'observed':t.movementAccepted?'requested; not confirmed':'not requested'} · Far arrival ${t.farArrived?'observed':'not confirmed'}`,
        `Movement: ${f(t.distanceMoved)} m · Forward speed ${f(t.forwardSpeed)} m/s · Stamina ${f(t.stamina)}%`,
        `Turn: ${f(t.turnElapsed)} s · Sprint exit ${t.sprintExitObserved?'observed':'not confirmed'}`,
        `Walking return: ${t.returned?'arrival confirmed':t.returnAccepted?'accepted; arrival not confirmed':'not requested'} · Final watch ${f(t.watchElapsed)} s`,
        `SAIN visual acquisition: ${t.visualAcquired?'observed':'not observed'} · Movement time ${f(t.elapsed)} s · Remaining ${f(t.remaining)} s`,
        ...t.alternatives,'Movement requests do not prove success. Native behavior colors are preserved.']
}
