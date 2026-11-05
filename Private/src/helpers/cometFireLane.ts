export type FireLaneContext = {
    state:string;reason:string;action:string;context:string;shooter:string;shooterName:string;side:string;execution:string;
    validFor:number;wait:number;shotAge:number;width:number;prediction:number;speed:number;
    x:number;y:number;z:number;fromX:number;fromY:number;fromZ:number;toX:number;toY:number;toZ:number;goalX:number;goalY:number;goalZ:number;
    applied:boolean;confirmed:boolean;inside:boolean;alternatives:string[];
}
export function parseCometFireLane(r:any):FireLaneContext|null {
    if(!r||Array.isArray(r)||!['native','holding','stepping','ended'].includes(r.state)
        ||['reason','action','context','shooter','shooterName','side','execution'].some(k=>typeof r[k]!=='string')||!r.context||!r.shooter
        ||!['','left','right'].includes(r.side)
        ||['validFor','wait','shotAge','width','prediction','speed','x','y','z','fromX','fromY','fromZ','toX','toY','toZ','goalX','goalY','goalZ'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
        ||['applied','confirmed','inside'].some(k=>typeof r[k]!=='boolean')
        ||r.validFor<0||r.validFor>.25||r.wait<0||r.shotAge<0||r.speed<0||r.width<.3||r.width>1.5||r.prediction<.1||r.prediction>.6
        ||r.confirmed&&!r.applied||r.validFor>0&&(!r.confirmed||!r.applied)
        ||!['holding','stepping'].includes(r.state)&&(r.applied||r.confirmed||r.validFor!==0)
        ||r.state==='stepping'&&!r.side)return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometFireLaneSummary(t:FireLaneContext):string[] {
    return [`Allied firing lane · ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        `Shooter: ${t.shooterName||t.shooter} · Actual shot ${t.shotAge.toFixed(2)} s ago`,
        `Action: ${t.action} · ${t.execution} · Inside lane: ${t.inside?'yes':'no'}`,
        `Wait: ${t.wait.toFixed(2)} s · Detour: ${t.side||'none'} · Speed: ${t.speed.toFixed(2)} m/s`,
        `Lane margin: ${t.width.toFixed(2)} m per side · Prediction: ${t.prediction.toFixed(2)} s`,
        'Native route retained; this safeguard does not control the shooter.',...t.alternatives];
}
