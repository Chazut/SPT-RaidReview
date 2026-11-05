export type OwnGrenadeSafetyContext={state:string;reason:string;owner:string;item:string;source:string;outcome:string;projectile:number;active:number;
 x:number;y:number;z:number;radius:number;distance:number;age:number;validFor:number;routeBlocked:boolean;escape:boolean;alternatives:string[]};
export function parseCometOwnGrenadeSafety(r:any):OwnGrenadeSafetyContext|null {
 if(!r||Array.isArray(r)||!['tracking','waiting','fleeing','released','ended'].includes(r.state)
  ||['reason','owner','item','source','outcome'].some(k=>typeof r[k]!=='string'||r[k].length>500)||!r.owner||!r.item
  ||!['own-throw','observed-squad-throw'].includes(r.source)||!['live','outcome-unknown','confirmed-explosion'].includes(r.outcome)
  ||['x','y','z','radius','distance','age','validFor','projectile','active'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
  ||!Number.isInteger(r.projectile)||r.projectile< -2147483648||r.projectile>2147483647||!Number.isInteger(r.active)||r.active<0||r.active>64
  ||r.radius<=0||r.radius>150||r.distance<0||r.age<0||r.validFor<0||r.validFor>.5
  ||['released','ended'].includes(r.state)&&r.validFor!==0||r.state==='released'&&r.outcome!=='confirmed-explosion'
  ||r.state==='fleeing'&&(r.outcome!=='live'||!r.escape)||typeof r.escape!=='boolean'||typeof r.routeBlocked!=='boolean'
  ||!Array.isArray(r.alternatives)||r.alternatives.length>8||r.alternatives.some((v:any)=>typeof v!=='string'||v.length>500))return null;
 return r;
}
export function cometOwnGrenadeSafetySummary(t:OwnGrenadeSafetyContext):string[] {
 return [`Own grenade safety: ${t.state} · ${t.reason.replace(/-/g,' ')}`,
  `Known grenade: ${t.projectile} · owner ${t.owner} · ${t.source.replace(/-/g,' ')} · ${t.outcome.replace(/-/g,' ')}`,
  `Last position: ${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)} · distance ${t.distance.toFixed(1)} m · danger radius ${t.radius.toFixed(1)} m`,
  `Age ${t.age.toFixed(2)} s · ${t.active} unconfirmed grenade(s) · route ${t.routeBlocked?'blocked':'not blocked'} · native escape ${t.escape?'requested':'not requested'}`,
  ...t.alternatives];
}
