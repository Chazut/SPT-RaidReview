export type GrenadeTrajectoryAlternative = {kind:string;reason:string;x:number;y:number;z:number;angle:number;accepted:boolean;clearance:number}
export type GrenadeTrajectoryContext = {
 state:string;reason:string;target:string;source:string;kind:string;door:string;knownX:number;knownY:number;knownZ:number;
 x:number;y:number;z:number;angle:number;attempts:number;clearance:number;validFor:number;alternatives:GrenadeTrajectoryAlternative[];
}
const kinds=['last-known','blind-corner','open-door'];
const finite=(v:any)=>typeof v==='number'&&Number.isFinite(v);
export function parseCometGrenadeTrajectory(r:any):GrenadeTrajectoryContext|null {
 if(!r||Array.isArray(r)||!['searching','prepared','validated','blocked','ended'].includes(r.state)
  ||['reason','target','source','kind','door'].some(k=>typeof r[k]!=='string')||!r.target
  ||['knownX','knownY','knownZ','x','y','z','clearance','validFor'].some(k=>!finite(r[k]))
  ||!Number.isSafeInteger(r.attempts)||r.attempts<0||![0,5,15,25,35,45].includes(r.angle)
  ||r.clearance<0||r.clearance>1||r.validFor<0||r.validFor>1
  ||r.state==='ended'&&r.validFor!==0
  ||['prepared','validated'].includes(r.state)&&(!kinds.includes(r.kind)||r.angle===0)
  ||!Array.isArray(r.alternatives)||r.alternatives.length>20)return null;
 for(const a of r.alternatives)if(!a||Array.isArray(a)||!kinds.includes(a.kind)||typeof a.reason!=='string'
  ||['x','y','z','clearance'].some(k=>!finite(a[k]))||a.clearance<0||a.clearance>1
  ||![0,5,15,25,35,45].includes(a.angle)||typeof a.accepted!=='boolean'
  ||a.accepted&&a.angle===0)return null;
 return r;
}
const point=(x:number,y:number,z:number)=>`${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`;
export function cometGrenadeTrajectorySummary(t:GrenadeTrajectoryContext):string[] {
 return [`Grenade trajectory: ${t.state} · ${t.reason.replace(/-/g,' ')}`,
  `Known contact: ${t.target} · ${t.source} · ${point(t.knownX,t.knownY,t.knownZ)}`,
  ...(t.kind?[`Aim: ${t.kind.replace(/-/g,' ')} · ${point(t.x,t.y,t.z)} · ${t.angle}°${t.clearance>0?` · clearance ${t.clearance.toFixed(2)} m`:''}${t.door?` · door ${t.door}`:''}`]:[]),
  `Native arc attempts: ${t.attempts} · ${t.state==='searching'?'pending, no G01 roll yet':'throw and projectile release tracked separately'}`,
  ...t.alternatives.map(a=>`${a.accepted?'Clear':'Rejected'}: ${a.kind.replace(/-/g,' ')}${a.angle?` ${a.angle}°`:''} · ${a.reason.replace(/-/g,' ')} · ${point(a.x,a.y,a.z)}`)];
}
