export type DoorJumpContext = {
    state: string; reason: string; door: string; target: string; source: string; personality: string;
    styleRoll?: number; runByPreference?: number; chance?: number; roll?: number; knownX?: number; knownY?: number; knownZ?: number; contactAge?: number;
    stamina?: number; forwardSpeed?: number; runUpDistance?: number; elapsed?: number; remaining?: number; observationElapsed?: number; validFor?: number;
    stackX?: number; stackY?: number; stackZ?: number; landingX?: number; landingY?: number; landingZ?: number; actualX?: number; actualY?: number; actualZ?: number;
    doorOpenRequested: boolean; doorOpenObserved: boolean; movementAccepted: boolean; jumpRequested: boolean;
    takeoffObserved: boolean; landingObserved: boolean; visualAcquired: boolean; returnJumpRequested: boolean;
    returnTakeoffObserved: boolean; returnLandingObserved: boolean; returned: boolean; alternatives: string[];
}
const text = (v: unknown) => typeof v === 'string' ? v : ''
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : undefined
export function parseCometDoorJump(raw: any): DoorJumpContext | null {
    if (!raw || Array.isArray(raw) || !['validating','opening','run-up','jump-requested','airborne','landing','observing','return-pending','returning','return-jump-requested','return-airborne','completed','ended'].includes(raw.state)) return null
    const movementAccepted = raw.movementAccepted === true
    const jumpRequested = movementAccepted && raw.jumpRequested === true
    const takeoffObserved = jumpRequested && raw.takeoffObserved === true
    const landingObserved = takeoffObserved && raw.landingObserved === true
    const returnJumpRequested = landingObserved && raw.returnJumpRequested === true
    const returnTakeoffObserved = returnJumpRequested && raw.returnTakeoffObserved === true
    const returnLandingObserved = returnTakeoffObserved && raw.returnLandingObserved === true
    const t: DoorJumpContext = { state:raw.state, reason:text(raw.reason), door:text(raw.door), target:text(raw.target), source:text(raw.source), personality:text(raw.personality),
        doorOpenRequested:raw.doorOpenRequested===true, doorOpenObserved:raw.doorOpenObserved===true, movementAccepted, jumpRequested, takeoffObserved, landingObserved,
        visualAcquired:raw.visualAcquired===true, returnJumpRequested, returnTakeoffObserved, returnLandingObserved,
        returned:raw.state==='completed' && landingObserved && raw.returned===true && (!returnJumpRequested || returnLandingObserved),
        alternatives:Array.isArray(raw.alternatives) ? raw.alternatives.filter((x: unknown) => typeof x==='string').slice(0,8) : [] }
    for (const k of ['knownX','knownY','knownZ','forwardSpeed','stackX','stackY','stackZ','landingX','landingY','landingZ','actualX','actualY','actualZ'] as const) t[k]=num(raw[k])
    for (const k of ['styleRoll','runByPreference','chance','roll','contactAge','stamina','runUpDistance','elapsed','remaining','observationElapsed','validFor'] as const) {
        const v=num(raw[k]); t[k]=v!=null && v>=0 ? v : undefined
    }
    return t
}
export function cometDoorJumpSummary(t: DoorJumpContext, names: Record<string,string> = {}): string[] {
    const fmt=(v?: number)=>v==null?'?':v.toFixed(1)
    return [`Doorway jump peek: ${t.state.replace(/-/g,' ')} · ${t.reason.replace(/-/g,' ')}`,
        `Door: ${t.door || '?'} · ${t.personality || '?'} · Shared opportunity ${fmt(t.chance)}% · Roll ${fmt(t.roll)}`,
        ...(t.styleRoll!=null ? [`Style roll ${fmt(t.styleRoll)} · Run-by preference ${fmt(t.runByPreference)}% when both styles are safe`] : []),
        `Known contact: ${names[t.target] || t.target || '?'} · ${t.source || '?'} · Recorded age ${fmt(t.contactAge)} s`,
        `Remembered position: ${fmt(t.knownX)}, ${fmt(t.knownY)}, ${fmt(t.knownZ)}`,
        ...(t.stackX!=null ? [`Frame position: ${fmt(t.stackX)}, ${fmt(t.stackY)}, ${fmt(t.stackZ)} · Landing target: ${fmt(t.landingX)}, ${fmt(t.landingY)}, ${fmt(t.landingZ)}`] : []),
        ...(t.actualX!=null ? [`Observed bot position: ${fmt(t.actualX)}, ${fmt(t.actualY)}, ${fmt(t.actualZ)}`] : []),
        `Door opening: ${t.doorOpenObserved?'open observed':t.doorOpenRequested?'requested; not confirmed':'not requested'}`,
        `Run-up: ${fmt(t.runUpDistance)} m · Toward destination ${fmt(t.forwardSpeed)} m/s · Stamina ${fmt(t.stamina)}%`,
        `Jump: ${t.jumpRequested?'requested':'not requested'} · Takeoff ${t.takeoffObserved?'observed':'not confirmed'} · Landing ${t.landingObserved?'observed':'not confirmed'}`,
        `SAIN visual acquisition: ${t.visualAcquired?'observed':'not observed'} · Observation after arrival ${fmt(t.observationElapsed)} s`,
        `Return: ${t.returned?'confirmed':t.returnJumpRequested?'jump requested; '+(t.returnLandingObserved?'landing observed':'landing not confirmed'):'on foot by default; not confirmed'}`,
        `Movement budget: ${fmt(t.elapsed)} s elapsed · ${fmt(t.remaining)} s remaining`,
        ...t.alternatives,
        'A requested jump is not proof of takeoff or a successful peek. Native Search colors are preserved.']
}
