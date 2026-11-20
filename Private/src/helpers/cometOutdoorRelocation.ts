export type OutdoorRelocationContext = {
    state:string; reason:string; target:string; source:string; destination:string; grenadeOutcome:string; action:string;
    episode:number; candidates:number; rejected:number; protection:number; originalProtection:number;
    validFor:number; chance:number; roll:number; elapsed:number; contactAge:number; sightAge:number; pathLength:number; angle:number; exposure:number; score:number; speed:number; distanceMoved:number;
    x:number; y:number; z:number; knownX:number; knownY:number; knownZ:number; destinationX:number; destinationY:number; destinationZ:number;
    requested:boolean; accepted:boolean; moveRequested:boolean; movementObserved:boolean; arrived:boolean; throwAccepted:boolean; projectileObserved:boolean;
    alternatives:string[];
    holdSeconds?:number; holdElapsed?:number; holdApplied?:boolean;
}
export function parseCometOutdoorRelocation(r:any):OutdoorRelocationContext|null {
    if(!r||Array.isArray(r)||!['planning','ready','throwing','moving','holding','arrived','ended'].includes(r.state)
        ||['reason','target','source','destination','grenadeOutcome','action'].some(k=>typeof r[k]!=='string')||!r.target||!r.source
        ||!['Freeze','ThrowGrenade','SeekCover'].includes(r.action)
        ||['validFor','chance','roll','elapsed','contactAge','sightAge','pathLength','angle','exposure','score','speed','distanceMoved','x','y','z','knownX','knownY','knownZ','destinationX','destinationY','destinationZ'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
        ||['episode','candidates','rejected','protection','originalProtection'].some(k=>!Number.isSafeInteger(r[k])||r[k]<0)
        ||['requested','accepted','moveRequested','movementObserved','arrived','throwAccepted','projectileObserved'].some(k=>typeof r[k]!=='boolean')
        ||r.episode<1||r.rejected>r.candidates||r.protection>3||r.originalProtection>3||r.validFor<0
        ||(r.state!=='holding'&&r.validFor>.3)
        ||r.chance<0||r.chance>100||r.roll<0||r.roll>=100||r.angle<0||r.angle>180||r.exposure<0||r.exposure>1
        ||['elapsed','contactAge','sightAge','pathLength','speed','distanceMoved'].some(k=>r[k]<0)
        ||r.projectileObserved&&!r.throwAccepted||r.movementObserved&&!r.moveRequested||r.arrived&&!r.moveRequested)return null;
    if(r.holdSeconds!==undefined&&(!Number.isFinite(r.holdSeconds)||(r.holdSeconds!==0&&(r.holdSeconds<5||r.holdSeconds>10)))
        ||r.holdElapsed!==undefined&&(!Number.isFinite(r.holdElapsed)||r.holdElapsed<0)
        ||r.holdApplied!==undefined&&typeof r.holdApplied!=='boolean')return null;
    const holding=r.state==='holding';
    const active=holding||['planning','ready','throwing','moving'].includes(r.state);
    if(holding&&(!(r.holdSeconds>=5)||r.holdElapsed===undefined||r.holdElapsed+r.validFor>r.holdSeconds+1e-6)
        ||active&&!holding&&r.validFor<=0||!active&&r.validFor!==0||r.accepted&&!r.requested
        ||(r.state==='moving'||holding)&&(!r.moveRequested||!r.destination||r.action!=='SeekCover')
        ||r.state==='throwing'&&(!r.throwAccepted||r.action!=='ThrowGrenade')
        ||r.state==='arrived'&&!r.arrived||r.arrived&&r.state!=='arrived'&&!holding)return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometOutdoorRelocationSummary(t:OutdoorRelocationContext):string[] {
    return [`Change cover outdoors · ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        `Known contact: ${t.target} · ${t.source} · Updated ${t.contactAge.toFixed(1)} s ago · Out of sight ${t.sightAge.toFixed(1)} s`,
        `Chance after adjustments: ${t.chance.toFixed(1)}% · Roll: ${t.roll.toFixed(1)} · Native action: ${t.action}`,
        `Requested / accepted / movement / arrival: ${[t.requested,t.accepted,t.movementObserved,t.arrived].map(v=>v?'yes':'no').join(' / ')}`,
        ...(t.state==='holding'&&t.holdSeconds?[`Holding new cover · ${(t.holdElapsed??0).toFixed(1)} / ${t.holdSeconds.toFixed(1)} s`]:[]),
        `Cover: ${t.destination||'still comparing'} · Protection ${t.originalProtection}/3 → ${t.protection}/3 · Route ${t.pathLength.toFixed(1)} m · Angle ${t.angle.toFixed(1)}° · Sampled exposure ${(t.exposure*100).toFixed(0)}%`,
        `Grenade: ${t.grenadeOutcome.replace(/-/g,' ')} · Native acceptance: ${t.throwAccepted?'yes':'no'} · Projectile observed: ${t.projectileObserved?'yes':'no'}`,
        `Actual movement: ${t.distanceMoved.toFixed(1)} m · Speed ${t.speed.toFixed(1)} m/s · Elapsed ${t.elapsed.toFixed(1)} s · Candidates ${t.candidates} (${t.rejected} refused)`,...t.alternatives];
}
