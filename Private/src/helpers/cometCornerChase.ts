export type CornerChaseContext = {
    state:string; reason:string; target:string; action:string; source:string; style:string;
    episode:number; observationEpisode:number; requests:number; jumps:number; side:number;
    chance:number; roll:number; remaining:number; validFor:number; contactAge:number;
    knownX:number; knownY:number; knownZ:number; goalX:number; goalY:number; goalZ:number; pathLength:number; travel:number; speed:number;
    selected:boolean; requested:boolean; movementObserved:boolean; jumpRequested:boolean; jumpAccepted:boolean; takeoffObserved:boolean; landingObserved:boolean;
    alternatives:string[];
}
export function parseCometCornerChase(r:any):CornerChaseContext|null {
    if(!r||Array.isArray(r)||!['planning','moving','ended'].includes(r.state)||!['lean-in','pie','jump'].includes(r.style)
        ||['reason','target','action','source'].some(k=>typeof r[k]!=='string')
        ||r.source!=='personal-vision'||r.action!=='RushEnemy'
        ||['episode','observationEpisode','requests','jumps','chance','roll','remaining','validFor','contactAge','pathLength','travel','speed'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)
        ||['side','knownX','knownY','knownZ','goalX','goalY','goalZ'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
        ||['episode','observationEpisode','requests','jumps','side'].some(k=>!Number.isInteger(r[k]))
        ||['selected','requested','movementObserved','jumpRequested','jumpAccepted','takeoffObserved','landingObserved'].some(k=>typeof r[k]!=='boolean')
        ||![-1,0,1].includes(r.side)||r.chance>100||r.roll>=100||r.validFor>.2||r.validFor>r.remaining||r.jumps>1
        ||r.requested!==(r.requests>0)||r.jumpAccepted!==(r.jumps===1)||r.jumpAccepted&&!r.jumpRequested
        ||r.takeoffObserved&&!r.jumpAccepted||r.landingObserved&&!r.takeoffObserved
        ||r.movementObserved&&(!r.requested||r.travel<.2)
        ||r.state==='ended'&&(r.validFor!==0||r.remaining!==0)
        ||r.state!=='ended'&&(!r.selected||!r.target||r.side===0||r.pathLength<=0)
        ||r.state==='moving'&&!r.requested)return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((x:any)=>typeof x==='string').slice(0,6):[]};
}
export function cometCornerChaseSummary(t:CornerChaseContext):string[] {
    const style={'lean-in':'Lean into corner',pie:'Progressive wide angle',jump:'Running jump'}[t.style]||t.style;
    return [`${style} · ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        `Known contact: ${t.target||'none'} · Personal vision · ${t.contactAge.toFixed(2)} s old`,
        `Last observed position: ${t.knownX.toFixed(1)}, ${t.knownY.toFixed(1)}, ${t.knownZ.toFixed(1)}`,
        `Chance: ${t.chance.toFixed(0)}% · Roll: ${t.roll.toFixed(1)} · Approach path: ${t.pathLength.toFixed(1)} m`,
        `Movement requests: ${t.requests} · Observed: ${t.movementObserved?'yes':'no'} · Travel: ${t.travel.toFixed(2)} m · Speed: ${t.speed.toFixed(2)} m/s`,
        `Requested waypoint: ${t.goalX.toFixed(1)}, ${t.goalY.toFixed(1)}, ${t.goalZ.toFixed(1)} · Not an updated enemy position`,
        `Jump requested: ${t.jumpRequested?'yes':'no'} · Accepted: ${t.jumpAccepted?'yes':'no'} · Takeoff: ${t.takeoffObserved?'observed':'not observed'} · Landing: ${t.landingObserved?'observed':'not observed'}`,
        `Time remaining: ${t.remaining.toFixed(2)} s · One attempt per loss of sight`,...t.alternatives];
}
