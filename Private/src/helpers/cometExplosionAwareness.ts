export type ExplosionAwarenessContext={state:string;reason:string;signal:string;kind:string;evidence:string;target:string;evidenceAge:number;x:number;y:number;z:number;contactX:number|null;contactY:number|null;contactZ:number|null;distance:number;audible:boolean;applied:boolean;remaining:number;validFor:number;alternatives:string[]};
const text=(v:any)=>typeof v==='string'&&v.length<=512;
const coordinate=(v:any)=>Number.isFinite(v)&&Math.abs(v)<=100000;
export function parseCometExplosionAwareness(t:any):ExplosionAwarenessContext|null {
 if(!t||Array.isArray(t)||!['heard','ignored','look','ended'].includes(t.state)
 ||!['blast','smoke','flash','special'].includes(t.kind)||!['unknown','own','known-ally','seen-throw'].includes(t.evidence)
 ||['reason','signal','target'].some(k=>!text(t[k]))||!t.signal
 ||['x','y','z'].some(k=>!coordinate(t[k]))
 ||!Number.isFinite(t.distance)||t.distance<0||t.distance>100000
 ||!Number.isFinite(t.evidenceAge)||t.evidenceAge<0||t.evidenceAge>31
 ||!Number.isFinite(t.remaining)||t.remaining<0||t.remaining>8
 ||!Number.isFinite(t.validFor)||t.validFor<0||t.validFor>Math.min(1,t.remaining)
 ||['audible','applied'].some(k=>typeof t[k]!=='boolean')
 ||t.evidence==='seen-throw'&&(!t.target||['contactX','contactY','contactZ'].some(k=>!coordinate(t[k])))
 ||t.evidence!=='seen-throw'&&(t.target!==''||['contactX','contactY','contactZ'].some(k=>t[k]!==null))
 ||t.state!=='look'&&(t.remaining!==0||t.validFor!==0||t.applied)
 ||t.state==='look'&&(!t.audible||t.kind!=='blast'||t.remaining<=0||['own','known-ally'].includes(t.evidence))
 ||!t.applied&&t.validFor!==0
 ||!Array.isArray(t.alternatives)||t.alternatives.length>8||t.alternatives.some((a:any)=>!text(a)))return null;
 return t;
}
export function cometExplosionAwarenessSummary(t:ExplosionAwarenessContext):string[]{return [
 `Explosion: ${t.state} · ${t.reason.replace(/-/g,' ')}`,
 `Effect: ${t.kind} · heard: ${t.audible?'yes':'no'} · distance: ${t.distance.toFixed(1)} m`,
 `Explosion position: ${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)}`,
 t.evidence==='seen-throw'?`Personally witnessed throw: ${t.target} · ${t.evidenceAge.toFixed(1)} s old · frozen position: ${t.contactX!.toFixed(1)}, ${t.contactY!.toFixed(1)}, ${t.contactZ!.toFixed(1)}`
 :t.evidence==='own'?'Own throw':t.evidence==='known-ally'?'Personally witnessed allied throw':'Thrower unknown; no enemy contact created',
 `Look request: ${t.applied?'applied':t.state==='look'?'pending':'none'} · remaining: ${t.remaining.toFixed(1)} s`,...t.alternatives];}
