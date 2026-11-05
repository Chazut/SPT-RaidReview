export type TacticalJumpContext = {
    state:string; reason:string; sourceFeature:string; kind:string; target:string; action:string; lastRefusal:string;
    validFor:number; speed:number; forwardSpeed:number; minimumSpeed:number; stamina:number; minimumStamina:number; chance:number; roll:number; elapsed:number;
    x:number; y:number; z:number; landingX:number; landingY:number; landingZ:number;
    attempt:number; concurrentRefusals:number; airShots:number; groundShots:number;
    requested:boolean; accepted:boolean; takeoffObserved:boolean; landingObserved:boolean; grounded:boolean; airShotAllowed:boolean; fireHeld:boolean; styleCached:boolean;
    alternatives:string[];
}
export function parseCometTacticalJump(r:any):TacticalJumpContext|null {
    if(!r||Array.isArray(r)||!['requested','pending','airborne','landed','refused','ended'].includes(r.state)
        ||['reason','sourceFeature','kind','target','action','lastRefusal'].some(k=>typeof r[k]!=='string')||!r.target||!r.kind
        ||!['SAIN','D02','M03','M05','M11','M14'].includes(r.sourceFeature)
        ||['validFor','speed','forwardSpeed','minimumSpeed','stamina','minimumStamina','chance','roll','elapsed','x','y','z','landingX','landingY','landingZ'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
        ||['attempt','concurrentRefusals','airShots','groundShots'].some(k=>!Number.isSafeInteger(r[k])||r[k]<0)||r.attempt<1
        ||['requested','accepted','takeoffObserved','landingObserved','grounded','airShotAllowed','fireHeld','styleCached'].some(k=>typeof r[k]!=='boolean')
        ||r.validFor<0||r.validFor>.25||r.speed<0||r.minimumSpeed<0||r.stamina<0||r.stamina>100||r.minimumStamina<0||r.minimumStamina>100
        ||r.chance<0||r.chance>100||r.roll< -1||r.roll>=100||r.elapsed<0
        ||r.accepted&&!r.requested||r.takeoffObserved&&!r.accepted||r.landingObserved&&!r.takeoffObserved)return null;
    const active=['requested','pending','airborne'].includes(r.state);
    if(!active&&(r.validFor!==0||r.fireHeld)||active&&r.validFor<=0
        ||r.state==='requested'&&(!r.requested||r.accepted||!r.grounded||r.takeoffObserved)
        ||r.state==='pending'&&(!r.accepted||!r.grounded||r.takeoffObserved)
        ||r.state==='airborne'&&(!r.accepted||!r.takeoffObserved||r.grounded||r.landingObserved)
        ||r.state==='landed'&&(!r.landingObserved||!r.grounded)
        ||r.state==='refused'&&(r.accepted||r.takeoffObserved||r.landingObserved)
        ||r.fireHeld!==(active&&r.accepted&&!r.grounded&&!r.airShotAllowed))return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometTacticalJumpSummary(t:TacticalJumpContext):string[] {
    return [`Tactical jump Â· ${t.state} Â· ${t.reason.replace(/-/g,' ')}`,
        `Source: ${t.sourceFeature} / ${t.kind} Â· Known opponent: ${t.target}`,
        `Requested / accepted / takeoff / landing: ${[t.requested,t.accepted,t.takeoffObserved,t.landingObserved].map(v=>v?'yes':'no').join(' / ')}`,
        `Actual speed: ${t.speed.toFixed(2)} m/s Â· Run-up at request: ${t.forwardSpeed.toFixed(2)} / ${t.minimumSpeed.toFixed(2)} m/s Â· Stamina: ${t.stamina.toFixed(0)}%`,
        `Air firing: ${t.airShotAllowed?'permitted, native aiming still required':'hold until landing'} Â· Chance: ${t.chance}% Â· Roll: ${t.roll<0?'unavailable':t.roll.toFixed(1)} Â· Reused style: ${t.styleCached?'yes':'no'}`,
        `Fire held: ${t.fireHeld?'yes':'no'} Â· Observed shots, air / ground: ${t.airShots} / ${t.groundShots} Â· Elapsed: ${t.elapsed.toFixed(2)} s`,
        `Attempt: ${t.attempt} Â· Concurrent requests refused: ${t.concurrentRefusals}${t.lastRefusal?' Â· '+t.lastRefusal.replace(/-/g,' '):''}`,...t.alternatives];
}
