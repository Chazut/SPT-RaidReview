export type CombatLeanContext = {
    state:string; reason:string; target:string; action:string; source:string;
    episode:number; side:number; requests:number; burstChanges:number; burstLimit:number;
    chance:number; roll:number; burstChance:number; burstRoll:number; remaining:number; phaseRemaining:number; validFor:number;
    contactAge:number; knownX:number; knownY:number; knownZ:number; smoothedTilt:number; headLateral:number; headTravel:number;
    selected:boolean; requested:boolean; tiltObserved:boolean; headMotionObserved:boolean; burstAttempted:boolean;
    firePause:boolean; leftSafe:boolean; rightSafe:boolean; alternatives:string[];
}
export function parseCometCombatLean(r:any):CombatLeanContext|null {
    if(!r||Array.isArray(r)||!['hold','burst','ended'].includes(r.state)
        ||['reason','target','action','source'].some(k=>typeof r[k]!=='string')
        ||['episode','requests','burstChanges','burstLimit','chance','roll','burstChance','burstRoll','remaining','phaseRemaining','validFor','contactAge','headTravel'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)
        ||['side','knownX','knownY','knownZ','smoothedTilt','headLateral'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
        ||['episode','requests','burstChanges','burstLimit','side'].some(k=>!Number.isInteger(r[k]))
        ||['selected','requested','tiltObserved','headMotionObserved','burstAttempted','firePause','leftSafe','rightSafe'].some(k=>typeof r[k]!=='boolean')
        ||r.source!=='personal-vision'||r.chance>100||r.burstChance>100||r.roll>=100||r.burstRoll>=100||r.validFor>.2
        ||r.burstLimit<2||r.burstLimit>3||r.burstChanges>r.burstLimit||r.burstChanges>r.requests||![-1,0,1].includes(r.side)
        ||r.phaseRemaining>r.remaining||(r.burstChanges>0&&!r.burstAttempted)
        ||(r.state==='burst'&&(!r.burstAttempted||r.burstChanges===0||r.firePause))
        ||(r.requested!==(r.requests>0))||((r.headMotionObserved||r.tiltObserved)&&!r.requested)
        ||(r.headMotionObserved&&r.headTravel<.02)
        ||(r.state==='ended'&&(r.validFor!==0||r.remaining!==0||r.firePause))
        ||(r.state!=='ended'&&(!r.selected||!r.requested||!r.target||r.side===0||!['StandAndShoot','DogFight'].includes(r.action))))return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((x:any)=>typeof x==='string').slice(0,6):[]};
}
export function cometCombatLeanSummary(t:CombatLeanContext):string[] {
    return [`${t.action||'Combat'}: ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        `Head evasion · ${t.side<0?'Left lean':t.side>0?'Right lean':'No side requested'} · ${t.chance.toFixed(0)}% chance · Roll ${t.roll.toFixed(1)}`,
        `Known contact: ${t.target||'none'} · ${t.source} · ${t.contactAge.toFixed(2)} s old`,
        `Short burst: ${t.burstChanges}/${t.burstLimit} requested side changes · ${t.burstChance.toFixed(0)}% chance · Roll ${t.burstRoll.toFixed(1)}`,
        `Lean input requests: ${t.requests} · Native tilt observed: ${t.tiltObserved?'yes':'no'} · Smoothed tilt: ${t.smoothedTilt.toFixed(2)}`,
        `Head movement observed: ${t.headMotionObserved?'yes':'no'} · Lateral span relative to body: ${(t.headTravel*100).toFixed(1)} cm`,
        `Clear head sweep: left ${t.leftSafe?'yes':'no'}, right ${t.rightSafe?'yes':'no'}${t.firePause?' · Holding side during M02 firing pause':''}`,
        `Phase remaining: ${t.phaseRemaining.toFixed(2)} s · Sequence remaining: ${t.remaining.toFixed(2)} s`,
        'Head motion is measured; reduced hit probability is not measured.',...t.alternatives];
}
