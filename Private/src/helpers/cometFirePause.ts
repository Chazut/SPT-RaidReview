export type FirePauseContext = {
    state:string; reason:string; target:string; action:string; weapon:string; mode:string; source:string;
    episode:number; completedSteps:number; shots:number; stationaryShots:number;
    chance:number; roll:number; duration:number; remaining:number; sequenceRemaining:number; brakeElapsed:number;
    speed:number; contactAge:number; knownX:number; knownY:number; knownZ:number; validFor:number;
    selected:boolean; stopRequested:boolean; stopObserved:boolean; alternatives:string[];
}
export function parseCometFirePause(r:any):FirePauseContext|null {
    if(!r||Array.isArray(r)||!['waiting','braking','settled','resumed','ended'].includes(r.state)
        ||['reason','target','action','weapon','mode','source'].some(k=>typeof r[k]!=='string')
        ||['episode','completedSteps','shots','stationaryShots','chance','roll','duration','remaining','sequenceRemaining','brakeElapsed','speed','contactAge','validFor'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)
        ||['knownX','knownY','knownZ'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
        ||['selected','stopRequested','stopObserved'].some(k=>typeof r[k]!=='boolean')
        ||['episode','completedSteps','shots','stationaryShots'].some(k=>!Number.isInteger(r[k]))
        ||r.chance>100||r.roll>=100||r.validFor>.1||r.stationaryShots>r.shots||r.remaining>r.duration+.000001
        ||r.source!=='personal-vision'||(r.stopRequested&&!r.selected)||(r.stopObserved&&!r.stopRequested)
        ||(r.shots>0&&!r.stopRequested)||(r.stationaryShots>0&&!r.stopObserved)
        ||(!['braking','settled'].includes(r.state)&&r.validFor!==0)
        ||(['braking','settled'].includes(r.state)&&(!r.selected||!r.target||!r.weapon||!['automatic','single'].includes(r.mode)||!['StandAndShoot','DogFight'].includes(r.action)))
        ||(r.state==='settled'&&(!r.stopObserved||r.speed>.12)))return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((x:any)=>typeof x==='string').slice(0,4):[]};
}
export function cometFirePauseSummary(t:FirePauseContext):string[] {
    return [`${t.action||'Combat steps'}: ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        `${t.chance.toFixed(0)}% chance · Roll ${t.roll.toFixed(1)} · ${t.selected?'Selected':'Not selected'}`,
        `Known contact: ${t.target||'none'} · ${t.source} · ${t.contactAge.toFixed(2)} s old`,
        `Completed steps: ${t.completedSteps} · Fire mode: ${t.mode||'not selected'}`,
        t.stopObserved?`Stop observed · Measured speed ${t.speed.toFixed(2)} m/s`:t.stopRequested?'Stop requested; stationary state not yet confirmed':'No stop requested',
        `Braking: ${t.brakeElapsed.toFixed(2)} s · Stabilization left: ${t.remaining.toFixed(2)} s`,
        `Observed shots: ${t.shots} · While stationary: ${t.stationaryShots} · No accuracy claim`,
        `Sequence remaining: ${t.sequenceRemaining.toFixed(2)} s`,...t.alternatives];
}
