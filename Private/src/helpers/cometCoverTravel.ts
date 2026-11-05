export type CoverTravelContext = {
    state:string; reason:string; target:string; context:string; source:string; observed:string;
    contactAge:number; validFor:number; remaining:number; length:number; turn:number; exposure:number;
    speed:number; facingDot:number; knownX:number; knownY:number; knownZ:number; x:number; y:number; z:number;
    geometry:boolean; protected:boolean; nativeSprint:boolean; sprintRequested:boolean; walkRequested:boolean; gazeRequested:boolean;
    alternatives:string[];
}
export function parseCometCoverTravel(r:any):CoverTravelContext|null {
    if(!r||Array.isArray(r)||!['face-walk','dash','native','ended'].includes(r.state)
        ||['reason','target','context','source','observed'].some(k=>typeof r[k]!=='string')||!r.target||!r.context||r.source!=='personal-vision'
        ||!['stationary','sprinting','backpedaling','strafing','walking-forward'].includes(r.observed)
        ||['contactAge','validFor','remaining','length','turn','exposure','speed','facingDot','knownX','knownY','knownZ','x','y','z'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
        ||['geometry','protected','nativeSprint','sprintRequested','walkRequested','gazeRequested'].some(k=>typeof r[k]!=='boolean')
        ||r.contactAge<0||r.validFor<0||r.validFor>.2||r.remaining<0||r.length<0||r.turn<0||r.turn>180||r.exposure<0||r.exposure>1||r.speed<0||Math.abs(r.facingDot)>1
        ||r.sprintRequested&&r.walkRequested||r.gazeRequested&&r.state!=='face-walk'
        ||r.state==='face-walk'&&(r.sprintRequested||!r.geometry)
        ||r.state==='dash'&&(r.walkRequested||!r.geometry||!r.protected)
        ||['native','ended'].includes(r.state)&&(r.validFor!==0||r.walkRequested||r.sprintRequested||r.gazeRequested))return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometCoverTravelSummary(t:CoverTravelContext):string[] {
    return [`Travel to cover · ${t.state.replace(/-/g,' ')} · ${t.reason.replace(/-/g,' ')}`,
        `Known contact: ${t.target} · Personal vision · ${t.contactAge.toFixed(2)} s old`,
        `Known position: ${t.knownX.toFixed(1)}, ${t.knownY.toFixed(1)}, ${t.knownZ.toFixed(1)}`,
        `Cover destination: ${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)}`,
        `Actual route: ${t.length.toFixed(1)} m · Largest turn: ${t.turn.toFixed(0)} degrees`,
        `Estimated route exposure: ${(t.exposure*100).toFixed(0)}% · Endpoint protected: ${t.protected?'yes':'no'} (sampled body rays)`,
        `Native sprint intention: ${t.nativeSprint?'yes':'no'} · Walk requested: ${t.walkRequested?'yes':'no'} · Sprint requested: ${t.sprintRequested?'yes':'no'}`,
        `Actual movement: ${t.observed.replace(/-/g,' ')} · ${t.speed.toFixed(2)} m/s · Gaze requested: ${t.gazeRequested?'yes':'no'}`,
        `Facing phase left: ${t.remaining.toFixed(2)} s · SAIN retains its route and urgent actions`,...t.alternatives];
}
