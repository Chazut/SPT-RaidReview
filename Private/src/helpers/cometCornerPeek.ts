export type CornerPeekContext = {
    state:string; reason:string; target:string; action:string; style:string; requestedStyle:string; source:string;
    episode:number; peeks:number; shots:number; exposedShots:number; jumps:number;
    chance:number; roll:number; styleRoll:number; remaining:number; phaseRemaining:number; validFor:number; contactAge:number;
    knownX:number; knownY:number; knownZ:number; exposedX:number; exposedY:number; exposedZ:number;
    hiddenX:number; hiddenY:number; hiddenZ:number; goalX:number; goalY:number; goalZ:number; travel:number;
    selected:boolean; requested:boolean; arrived:boolean; hiddenObserved:boolean; openObserved:boolean;
    airborneObserved:boolean; landedObserved:boolean; grace:boolean; alternatives:string[];
}
export function parseCometCornerPeek(r:any):CornerPeekContext|null {
    const phases=['planning','exposed','retreat-pending','retreat','hidden','peek-pending','peek','crossing-pending','crossing','ended'];
    const styles=['step','jump','run-by'];
    if(!r||Array.isArray(r)||!phases.includes(r.state)||!styles.includes(r.style)||!styles.includes(r.requestedStyle)
        ||['reason','target','action','source'].some(k=>typeof r[k]!=='string')
        ||['episode','peeks','shots','exposedShots','jumps','chance','roll','styleRoll','remaining','phaseRemaining','validFor','contactAge','travel'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)
        ||['knownX','knownY','knownZ','exposedX','exposedY','exposedZ','hiddenX','hiddenY','hiddenZ','goalX','goalY','goalZ'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
        ||['selected','requested','arrived','hiddenObserved','openObserved','airborneObserved','landedObserved','grace'].some(k=>typeof r[k]!=='boolean')
        ||['episode','peeks','shots','exposedShots','jumps'].some(k=>!Number.isInteger(r[k]))
        ||r.chance>100||r.roll>=100||r.styleRoll>=100||r.peeks>2||r.jumps>1||r.exposedShots>r.shots||r.validFor>.2||r.source!=='personal-vision'
        ||(r.state==='ended'&&(r.validFor!==0||r.grace))
        ||(r.state!=='ended'&&(!r.selected||!r.target||!['StandAndShoot','DogFight'].includes(r.action)))
        ||(r.arrived&&!r.requested)||(r.airborneObserved&&r.jumps===0)||(r.landedObserved&&!r.airborneObserved)
        ||(r.exposedShots>0&&!r.openObserved)||(r.peeks>0&&!r.requested))return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,6):[]};
}
export function cometCornerPeekSummary(t:CornerPeekContext):string[] {
    return [`${t.action||'Combat'}: ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        `Style: ${t.style} · Selected style: ${t.requestedStyle} · ${t.chance.toFixed(0)}% conditional chance · Roll ${t.roll.toFixed(1)}`,
        `Known contact: ${t.target||'none'} · ${t.source} · ${t.contactAge.toFixed(2)} s old${t.grace?' · Intentional sight-loss window':''}`,
        `Observed travel: ${t.travel.toFixed(2)} m · Completed outward peeks: ${t.peeks} · ${t.arrived?'Arrival observed':t.requested?'Movement requested':'No movement requested'}`,
        `Cover observed: ${t.hiddenObserved?'yes':'no'} · Open firing angle observed: ${t.openObserved?'yes':'no'}`,
        `Jump requests: ${t.jumps} · Airborne observed: ${t.airborneObserved?'yes':'no'} · Landing observed: ${t.landedObserved?'yes':'no'}`,
        `Observed shots: ${t.shots} · During open firing window: ${t.exposedShots}`,
        `Phase remaining: ${t.phaseRemaining.toFixed(2)} s · Attempt remaining: ${t.remaining.toFixed(2)} s`,...t.alternatives];
}
