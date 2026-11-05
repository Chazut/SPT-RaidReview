export type DoorSpatialContext = {
    state:string; reason:string; door:string; doorState:string; source:string; blocker:string; blockerState:string;
    margin:number; validFor:number; x:number; y:number; z:number;
}
export function parseCometDoorSpatial(raw:any):DoorSpatialContext|null {
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['clear','rejected','ended'].includes(raw.state))return null
    if(!['reason','door','doorState','source','blocker','blockerState'].every(k=>typeof raw[k]==='string')||!raw.door)return null
    if(!['margin','validFor','x','y','z'].every(k=>typeof raw[k]==='number'&&Number.isFinite(raw[k])))return null
    if(raw.margin<.25||raw.margin>1.25||raw.validFor<0||raw.validFor>.6||raw.state==='ended'&&raw.validFor!==0)return null
    if(!['native','waypoints','native-legacy','waypoints-legacy','unknown'].includes(raw.source))return null
    return {...raw}
}
export function cometDoorSpatialSummary(t:DoorSpatialContext):string[] {
    return [t.reason.replace(/-/g,' '),`Door: ${t.door} (${t.doorState}) · frame: ${t.source}`,
        `Panel clearance: ${t.margin.toFixed(2)} m · position ${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)}`,
        t.blocker?`Blocking panel: ${t.blocker} (${t.blockerState})`:'No blocking panel identified',
        t.state==='clear'?'Geometry check passed; movement not confirmed':'Position rejected or uncertain; no forced movement',
        'Alternatives: another safe position; wait for the panel; keep native movement.']
}
