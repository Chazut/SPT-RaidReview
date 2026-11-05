export type AngleWatchContext = {
    state:string; reason:string; target:string; source:string; action:string; candidate:string; kind:string;
    episode:number; leanSide:number; contactAge:number; remaining:number; validFor:number;
    knownX:number; knownY:number; knownZ:number; aimX:number; aimY:number; aimZ:number;
    requestedPitch:number; observedPitch:number; angleError:number;
    requested:boolean; aligned:boolean; elevation:boolean; wallBlocked:boolean; moving:boolean; leanRequested:boolean; alternatives:string[];
}
export function parseCometAngleWatch(r:any):AngleWatchContext|null {
    if(!r||Array.isArray(r)||!['watching','ended'].includes(r.state)
        ||['reason','target','source','action','candidate','kind'].some(k=>typeof r[k]!=='string')
        ||!['personal-vision','personal-hearing'].includes(r.source)||!['corner','wall','pitch','none'].includes(r.kind)
        ||!['Search','RushEnemy','HoldInCover','StandAndShoot'].includes(r.action)
        ||['episode','leanSide','contactAge','remaining','validFor','knownX','knownY','knownZ','aimX','aimY','aimZ','requestedPitch','observedPitch','angleError'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
        ||!Number.isInteger(r.episode)||r.episode<1||![-1,0,1].includes(r.leanSide)
        ||r.contactAge<0||r.remaining<0||r.validFor<0||r.validFor>.2||r.validFor>r.remaining
        ||Math.abs(r.requestedPitch)>90||Math.abs(r.observedPitch)>90||r.angleError<0||r.angleError>180
        ||['requested','aligned','elevation','wallBlocked','moving','leanRequested'].some(k=>typeof r[k]!=='boolean')
        ||r.aligned!==(r.angleError<=8)||r.leanRequested&&r.leanSide===0
        ||r.state==='ended'&&(r.validFor!==0||r.remaining!==0)
        ||r.state==='watching'&&(!r.requested||!r.target||!r.candidate||r.kind==='none'||r.remaining<=0))return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometAngleWatchSummary(t:AngleWatchContext):string[] {
    return [`Watch useful angle · ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        `Known contact: ${t.target} · ${t.source==='personal-vision'?'Personal vision':'Personal hearing (watch only)'} · ${t.contactAge.toFixed(2)} s old`,
        `Known position: ${t.knownX.toFixed(1)}, ${t.knownY.toFixed(1)}, ${t.knownZ.toFixed(1)}`,
        `Chosen opening: ${t.candidate} · ${t.kind} · ${t.aimX.toFixed(1)}, ${t.aimY.toFixed(1)}, ${t.aimZ.toFixed(1)}`,
        `Gaze requested: ${t.requested?'yes':'no'} · Observed alignment: ${t.aligned?'yes':'not yet'} · Error: ${t.angleError.toFixed(1)}°`,
        `Pitch requested / observed: ${t.requestedPitch.toFixed(1)}° / ${t.observedPitch.toFixed(1)}° · Elevation evidence: ${t.elevation?'yes':'no'}`,
        `Close wall: ${t.wallBlocked?'yes':'no'} · Moving: ${t.moving?'yes':'no'} · Native lean requested: ${t.leanRequested?'yes':'no'}`,
        `Time remaining: ${t.remaining.toFixed(2)} s · No firing or route request`,...t.alternatives];
}
