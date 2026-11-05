export type SquadFireContext = {
    state:string; reason:string; ally:string; allyName:string; kind:string; action:string; geometry:string; execution:string;
    applied:boolean; stopRequested:boolean; stopped:boolean; startPrevented:boolean;
    validFor:number; blockedFor:number; clearFor:number; prediction:number; radius:number; distance:number; speed:number;
    muzzleX:number;muzzleY:number;muzzleZ:number;endX:number;endY:number;endZ:number;
    allyX:number;allyY:number;allyZ:number;predictedX:number;predictedY:number;predictedZ:number;alternatives:string[];
}
export function parseCometSquadFire(r:any):SquadFireContext|null {
    if(!r||Array.isArray(r)||!['blocked','clearing','ended'].includes(r.state)
        ||['reason','ally','allyName','kind','action','geometry','execution'].some(k=>typeof r[k]!=='string')||!r.ally||!r.action
        ||!['body','prediction'].includes(r.kind)
        ||['validFor','blockedFor','clearFor','prediction','radius','distance','speed','muzzleX','muzzleY','muzzleZ','endX','endY','endZ','allyX','allyY','allyZ','predictedX','predictedY','predictedZ'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
        ||['applied','stopRequested','stopped','startPrevented'].some(k=>typeof r[k]!=='boolean')
        ||r.validFor<0||r.validFor>.25||r.blockedFor<0||r.clearFor<0||r.distance<0||r.speed<0
        ||r.prediction<.1||r.prediction>.5||r.radius<(r.kind==='body'?.05:.2)||r.radius>(r.kind==='body'?.35:.8)
        ||r.stopped&&(!r.stopRequested||!r.applied)||r.startPrevented&&!r.applied||r.stopRequested&&!r.applied
        ||r.validFor>0&&(!r.applied||!(r.stopped||r.startPrevented))
        ||r.state==='ended'&&(r.applied||r.stopped||r.stopRequested||r.startPrevented||r.validFor!==0))return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometSquadFireSummary(t:SquadFireContext):string[] {
    return [`Squad firing protection · ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        `Squadmate: ${t.allyName||t.ally} · ${t.kind==='body'?'Current body in barrel path':'Predicted crossing'}`,
        `Action: ${t.action} · ${t.execution}`,
        `Path: ${t.geometry} · Distance: ${t.distance.toFixed(1)} m`,
        `Prediction: ${t.prediction.toFixed(2)} s · Margin: ${t.radius.toFixed(2)} m`,
        `Blocked: ${t.blockedFor.toFixed(2)} s · Continuously clear: ${t.clearFor.toFixed(2)} s`,
        'Own living squad only. SAIN keeps its safety checks and decides whether to resume firing.',...t.alternatives];
}
