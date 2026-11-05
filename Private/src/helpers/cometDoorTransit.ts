export type DoorTransitContext = {
    state:string; reason:string; door:string; doorState:string; action:string; distance:number; blocked:number; validFor:number;
    slow:boolean; stopSprint:boolean; recovery:boolean; requested:boolean; interacting:boolean; passed:boolean;
    requestedSpeed:number; appliedSpeed:number; x:number; y:number; z:number;
}
export function parseCometDoorTransit(raw:any):DoorTransitContext|null {
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['approaching','slowing','clear','waiting','interacting','blocked','ended'].includes(raw.state))return null
    if(!['reason','door','doorState','action'].every(k=>typeof raw[k]==='string')||!raw.door)return null
    if(!['distance','blocked','validFor','requestedSpeed','appliedSpeed','x','y','z'].every(k=>typeof raw[k]==='number'&&Number.isFinite(raw[k])))return null
    if(raw.distance<0||raw.distance>5||raw.blocked<0||raw.blocked>8.5||raw.validFor<0||raw.validFor>.35
        ||raw.requestedSpeed<0||raw.requestedSpeed>1||raw.appliedSpeed<0||raw.appliedSpeed>1
        ||!['slow','stopSprint','recovery','requested','interacting','passed'].every(k=>typeof raw[k]==='boolean'))return null
    if(['ended','blocked'].includes(raw.state)&&(raw.validFor!==0||raw.slow||raw.stopSprint||raw.recovery))return null
    if(raw.passed&&raw.state!=='ended')return null
    return {...raw}
}
export function cometDoorTransitSummary(t:DoorTransitContext):string[] {
    return [`${t.action||'Movement'} · ${t.reason.replace(/-/g,' ')}`,
        `Door: ${t.door} (${t.doorState}) · ${t.distance.toFixed(1)} m along the route`,
        `Blocked without progress: ${t.blocked.toFixed(1)} s · ${t.stopSprint?'Sprint paused':'No sprint restriction'}`,
        t.slow?`Movement speed command: ${t.requestedSpeed.toFixed(2)} → ${t.appliedSpeed.toFixed(2)}`:'No movement speed cap',
        t.passed?'Crossing observed':t.interacting?'Native door interaction observed':t.requested?'Recovery interaction requested; success not yet observed':'No recovery interaction requested',
        'Alternatives: clear passage at normal speed; native interaction; reconsider a persistently blocked route.']
}
