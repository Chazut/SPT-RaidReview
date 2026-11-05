export type DoorMotionContext = {
    state:string; reason:string; door:string; doorState:string; action:string;
    angle:number; targetAngle:number; validFor:number; x:number; y:number; z:number;
}
export function parseCometDoorMotion(raw:any):DoorMotionContext|null {
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['requested','moving','confirmed','rejected','ended'].includes(raw.state))return null
    if(!['reason','door','doorState','action'].every(k=>typeof raw[k]==='string')||!raw.door)return null
    if(!['angle','targetAngle','validFor','x','y','z'].every(k=>typeof raw[k]==='number'&&Number.isFinite(raw[k])))return null
    if(Math.abs(raw.angle)>720||Math.abs(raw.targetAngle)>720||raw.validFor<0||raw.validFor>.35)return null
    if(['ended','confirmed','rejected'].includes(raw.state)&&raw.validFor!==0)return null
    if(!['unjam','push-away'].includes(raw.action))return null
    return {...raw}
}
export function cometDoorMotionSummary(t:DoorMotionContext):string[] {
    return [t.reason.replace(/-/g,' '),`Door: ${t.door} (${t.doorState}) · ${t.action}`,
        `Observed angle: ${t.angle.toFixed(1)}° · target: ${t.targetAngle.toFixed(1)}°`,
        t.state==='confirmed'?'Target angle observed; crossing not confirmed':`Correction: ${t.state}`,
        'Alternatives: normal opening; wait for a clear sweep; reconsider the route.']
}
