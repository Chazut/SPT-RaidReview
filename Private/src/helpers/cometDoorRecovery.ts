export type DoorRecoveryContext = {
    state:string; reason:string; door:string; doorState:string; target:string; repair:string; network:string;
    age:number; stable:number; angle:number; targetAngle:number; validFor:number;
    requested:boolean; confirmed:boolean; x:number; y:number; z:number;
}
export function parseCometDoorRecovery(raw:any):DoorRecoveryContext|null {
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['watching','waiting','ready','verifying','confirmed','blocked','ended'].includes(raw.state))return null
    if(!['reason','door','doorState','target','repair','network'].every(k=>typeof raw[k]==='string')||!raw.door)return null
    if(!['age','stable','angle','targetAngle','validFor','x','y','z'].every(k=>typeof raw[k]==='number'&&Number.isFinite(raw[k])))return null
    if(raw.age<0||raw.stable<0||raw.stable>raw.age+.01||raw.validFor<0||raw.validFor>1.1||typeof raw.requested!=='boolean'||typeof raw.confirmed!=='boolean')return null
    if(['ended','blocked','confirmed'].includes(raw.state)&&raw.validFor!==0)return null
    if(raw.confirmed&&(!raw.requested||raw.state!=='confirmed'))return null
    if(raw.state==='verifying'&&!raw.requested)return null
    return {...raw}
}
export function cometDoorRecoverySummary(t:DoorRecoveryContext):string[] {
    return [t.reason.replace(/-/g,' '),`Door: ${t.door} (${t.doorState||'pending'}) → ${t.target}`,
        `Observed for ${t.age.toFixed(2)} s · stable for ${t.stable.toFixed(2)} s`,
        `Angle ${t.angle.toFixed(1)}° · native endpoint ${t.targetAngle.toFixed(1)}°`,
        t.confirmed?'Consistent state confirmed':t.requested?`Correction requested: ${t.repair}; success not yet observed`:'No correction requested',
        `Network: ${t.network}`,
        'Alternatives: wait for the interaction; yield to its owner; reconsider the route if uncertain.']
}
