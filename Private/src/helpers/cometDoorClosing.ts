export type DoorClosingContext = {
    state:string; reason:string; door:string; doorState:string;
    graceRemaining:number; retryRemaining:number; occupiedRadius:number; validFor:number; x:number; y:number; z:number;
}
export function parseCometDoorClosing(raw:any):DoorClosingContext|null {
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['considered','requested','confirmed','rejected','failed','ended'].includes(raw.state))return null
    if(!['reason','door','doorState'].every(k=>typeof raw[k]==='string')||!raw.door)return null
    if(!['graceRemaining','retryRemaining','occupiedRadius','validFor','x','y','z'].every(k=>typeof raw[k]==='number'&&Number.isFinite(raw[k])))return null
    if(raw.graceRemaining<0||raw.graceRemaining>30||raw.retryRemaining<0||raw.retryRemaining>60||raw.occupiedRadius<.75||raw.occupiedRadius>3||raw.validFor<0||raw.validFor>.35)return null
    if(!['considered','requested'].includes(raw.state)&&raw.validFor!==0)return null
    return {...raw}
}
export function cometDoorClosingSummary(t:DoorClosingContext):string[] {
    return [t.reason.replace(/-/g,' '),`Door: ${t.door} (${t.doorState})`,
        `Squad opening protection: ${t.graceRemaining.toFixed(1)} s · retry: ${t.retryRemaining.toFixed(1)} s`,
        `Doorway clearance: ${t.occupiedRadius.toFixed(2)} m`,
        t.state==='confirmed'?'Shut state and angle observed; crossing not confirmed':`Automatic closing: ${t.state}`,
        'Alternatives: leave open; wait for squad passage; clear a reversed leaf; reconsider the route.']
}
