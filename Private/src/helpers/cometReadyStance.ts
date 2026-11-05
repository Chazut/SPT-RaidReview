export type ReadyStanceContext = {
 state:string;reason:string;evidence:string;contact:string;distance:number|null;cueAge:number;sinceFight:number;remaining:number;
 nativePatrol:boolean;requested:boolean;observedRaised:boolean;applied:boolean;validFor:number;alternatives:string[];
};
const text=(v:any)=>typeof v==='string'&&v.length<=512;
const num=(v:any,min:number,max:number)=>Number.isFinite(v)&&v>=min&&v<=max;
export function parseCometReadyStance(t:any):ReadyStanceContext|null {
 if(!t||Array.isArray(t)||!['holding','pending','native','suspended','expired','released'].includes(t.state)
 ||['reason','evidence','contact'].some(k=>!text(t[k]))
 ||['nativePatrol','requested','observedRaised','applied'].some(k=>typeof t[k]!=='boolean')
 ||!num(t.validFor,0,1)||!num(t.remaining,0,90)||!num(t.cueAge,0,86400)||!num(t.sinceFight,0,86400)
 ||t.distance!=null&&!num(t.distance,0,100000)
 ||t.requested&&(!t.nativePatrol||!['holding','pending'].includes(t.state)||t.remaining<=0)
 ||t.applied&&(!t.requested||!t.observedRaised||t.state!=='holding'||t.validFor<=0||t.validFor>t.remaining)
 ||!t.applied&&t.validFor!==0||t.state==='holding'&&!t.applied
 ||!Array.isArray(t.alternatives)||t.alternatives.length>4||t.alternatives.some((a:any)=>!text(a)))return null;
 return t;
}
export function cometReadyStanceSummary(t:ReadyStanceContext):string[]{return [
 `Weapon posture: ${t.state} · ${t.reason.replace(/-/g,' ')}`,
 `Raised posture requested: ${t.requested?'yes':'no'} · raised posture observed: ${t.observedRaised?'yes':'no'}`,
 `Remaining ${t.remaining.toFixed(1)} s · last exchange ${t.sinceFight.toFixed(1)} s ago`,
 `Evidence: ${t.evidence || 'none'} · ${t.cueAge.toFixed(1)} s old`,
 `Known contact: ${t.contact || 'none'}${t.distance!=null?` · observed distance ${t.distance.toFixed(1)} m`:''}`,
 `Native lowered patrol posture requested: ${t.nativePatrol?'yes':'no'}`,
 ...t.alternatives
];}
