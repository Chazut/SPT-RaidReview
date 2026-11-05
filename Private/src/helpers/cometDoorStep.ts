export type DoorStepContext = {
    state:string; reason:string; parent:string; door:string; target:string; source:string; personality:string; purpose:string; alternatives:string[];
    chance?:number; roll?:number; peek?:number; completed?:number; contactAge?:number; validFor?:number;
    knownX?:number; knownY?:number; knownZ?:number; stackX?:number; stackY?:number; stackZ?:number;
    pointX?:number; pointY?:number; pointZ?:number; lookX?:number; lookY?:number; lookZ?:number; actualX?:number; actualY?:number; actualZ?:number;
    pose?:number; actualPose?:number; observation?:number; requiredObservation?:number; rest?:number; requiredRest?:number; elapsed?:number; remaining?:number;
    poseObserved:boolean; movementAccepted:boolean; movementObserved:boolean; arrived:boolean; returnAccepted:boolean; returned:boolean; looking:boolean; visualAcquired:boolean;
}
const text=(v:unknown)=>typeof v==='string'?v:''
const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:undefined
export function parseCometDoorStep(raw:any):DoorStepContext|null {
    if(!raw||Array.isArray(raw)||raw.parent!=='D02'||!['planning','preparing','outward-pending','outward','observing','return-pending','returning','resting','completed','ended'].includes(raw.state))return null
    const movementAccepted=raw.movementAccepted===true
    const movementObserved=movementAccepted&&raw.movementObserved===true
    const arrived=movementObserved&&raw.arrived===true
    const returnAccepted=arrived&&raw.returnAccepted===true
    const t:DoorStepContext={state:raw.state,reason:text(raw.reason),parent:'D02',door:text(raw.door),target:text(raw.target),source:text(raw.source),personality:text(raw.personality),purpose:text(raw.purpose),
        alternatives:Array.isArray(raw.alternatives)?raw.alternatives.filter((v:unknown)=>typeof v==='string').slice(0,8):[],
        poseObserved:raw.poseObserved===true,movementAccepted,movementObserved,arrived,returnAccepted,returned:returnAccepted&&raw.returned===true,
        looking:raw.looking===true,visualAcquired:raw.visualAcquired===true}
    for(const k of ['knownX','knownY','knownZ','stackX','stackY','stackZ','pointX','pointY','pointZ','lookX','lookY','lookZ','actualX','actualY','actualZ'] as const)t[k]=num(raw[k])
    for(const k of ['chance','roll','contactAge','validFor','observation','requiredObservation','rest','requiredRest','elapsed','remaining'] as const){const n=num(raw[k]);t[k]=n!=null&&n>=0?n:undefined}
    for(const k of ['pose','actualPose'] as const){const n=num(raw[k]);t[k]=n!=null&&n>=0&&n<=1?n:undefined}
    for(const k of ['peek','completed'] as const){const n=num(raw[k]);t[k]=n!=null&&Number.isInteger(n)&&n>=(k==='peek'?1:0)&&n<=2?n:undefined}
    return t
}
export function cometDoorStepSummary(t:DoorStepContext,names:Record<string,string>={}):string[]{
    const f=(v?:number)=>v==null?'?':v.toFixed(1)
    return [`Small doorway peek: ${t.state.replace(/-/g,' ')} · ${t.reason.replace(/-/g,' ')}`,
        `After D02 return · Door ${t.door||'?'} · Chance ${f(t.chance)}% · Roll ${f(t.roll)}`,
        `Peek ${t.peek??'?'} · Completed returns ${t.completed??'?'} · Purpose: ${t.purpose.replace(/-/g,' ')||'pending'}`,
        `Known contact: ${names[t.target]||t.target||'?'} · ${t.source||'?'} · Recorded age ${f(t.contactAge)} s`,
        `Remembered position: ${f(t.knownX)}, ${f(t.knownY)}, ${f(t.knownZ)}`,
        `Local step target: ${f(t.pointX)}, ${f(t.pointY)}, ${f(t.pointZ)} · Frame: ${f(t.stackX)}, ${f(t.stackY)}, ${f(t.stackZ)}`,
        `Observed bot position: ${f(t.actualX)}, ${f(t.actualY)}, ${f(t.actualZ)}`,
        `Posture target ${f(t.pose)} · Actual ${f(t.actualPose)} · ${t.poseObserved?'ready':'not confirmed'}`,
        `Walking step: ${t.movementObserved?'observed':t.movementAccepted?'requested; not confirmed':'not requested'} · Arrival ${t.arrived?'observed':'not confirmed'}`,
        `Looking ${t.looking?'confirmed':'not confirmed'} · Observation ${f(t.observation)} / ${f(t.requiredObservation)} s`,
        `Return: ${t.returned?'arrival confirmed':t.returnAccepted?'requested; not confirmed':'not requested'} · Frame rest ${f(t.rest)} / ${f(t.requiredRest)} s`,
        `SAIN visual acquisition: ${t.visualAcquired?'observed':'not observed'} · Total ${f(t.elapsed)} s · Remaining ${f(t.remaining)} s`,
        ...t.alternatives,'A requested step is not a completed peek. Native behavior colors are preserved.']
}
