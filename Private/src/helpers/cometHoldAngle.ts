export type HoldAngleContext = {
    state:string; reason:string; target:string; source:string; candidate:string; episode:number;
    contactAge:number; remaining:number; validFor:number; knownX:number; knownY:number; knownZ:number;
    aimX:number; aimY:number; aimZ:number; originX:number; originY:number; originZ:number; x:number; y:number; z:number;
    requestedPose:number; observedPose:number; distance:number;
    poseRequested:boolean; moveRequested:boolean; arrived:boolean; eyesClear:boolean; muzzleClear:boolean; alternatives:string[];
}
export function parseCometHoldAngle(r:any):HoldAngleContext|null {
    if(!r||Array.isArray(r)||!['planning','adjusting','watching','ended'].includes(r.state)
        ||['reason','target','source','candidate'].some(k=>typeof r[k]!=='string')||!r.target
        ||!['personal-vision','personal-hearing'].includes(r.source)
        ||['episode','contactAge','remaining','validFor','knownX','knownY','knownZ','aimX','aimY','aimZ','originX','originY','originZ','x','y','z','requestedPose','observedPose','distance'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
        ||!Number.isInteger(r.episode)||r.episode<1||r.contactAge<0||r.remaining<0||r.validFor<0||r.validFor>.2||r.validFor>r.remaining
        ||r.requestedPose<0||r.requestedPose>1||r.observedPose<0||r.observedPose>1||r.distance<0
        ||['poseRequested','moveRequested','arrived','eyesClear','muzzleClear'].some(k=>typeof r[k]!=='boolean')
        ||r.state==='ended'&&(r.validFor!==0||r.remaining!==0)
        ||r.state==='planning'&&(r.poseRequested||r.moveRequested||r.arrived)
        ||r.state==='adjusting'&&r.arrived
        ||r.state==='watching'&&(!r.arrived||!r.eyesClear||!r.muzzleClear)
        ||['adjusting','watching'].includes(r.state)&&r.candidate==='none')return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometHoldAngleSummary(t:HoldAngleContext):string[] {
    return [`Open watched angle · ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        `Known contact: ${t.target} · ${t.source==='personal-vision'?'Personal vision':'Personal hearing (watch only)'} · ${t.contactAge.toFixed(2)} s old`,
        `Known position: ${t.knownX.toFixed(1)}, ${t.knownY.toFixed(1)}, ${t.knownZ.toFixed(1)}`,
        `Chosen correction: ${t.candidate} · Destination: ${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)}`,
        `Posture requested / observed: ${t.requestedPose.toFixed(2)} / ${t.observedPose.toFixed(2)} · Posture command: ${t.poseRequested?'yes':'no'}`,
        `Movement requested: ${t.moveRequested?'yes':'no'} · Correction observed: ${t.arrived?'yes':'not yet'} · Distance from origin: ${t.distance.toFixed(2)} m`,
        `Actual eyes clear: ${t.eyesClear?'yes':'no'} · Actual muzzle clear: ${t.muzzleClear?'yes':'no'}`,
        `Time remaining: ${t.remaining.toFixed(2)} s · Original Hold limit unchanged; no firing request`,...t.alternatives];
}
