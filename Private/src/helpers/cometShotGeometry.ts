export type ShotGeometryContext = {
 state:string;reason:string;consumer:string;target:string;action:string;weapon:string;ammo:string;
 allowed:boolean;fresh:boolean;allySafe:boolean;cached:boolean;penetrationEstimated:boolean;
 passThroughSurfaces:number;age:number;validFor:number;estimatedChance:number;conservativePower:number;
 muzzleX:number;muzzleY:number;muzzleZ:number;aimX:number;aimY:number;aimZ:number;
 surfaces:{material:string;lane:string;kind:string;distance:number;level:number;chance:number;ricochet:number;incidence:number;known:boolean;forward:boolean}[];
 alternatives:string[];
}
export function parseCometShotGeometry(r:any):ShotGeometryContext|null {
 if(!r||Array.isArray(r)||!['clear','pass-through','penetrable','blocked','deferred','released'].includes(r.state)
  ||['reason','consumer','target','action','weapon','ammo'].some(k=>typeof r[k]!=='string')
  ||['allowed','fresh','allySafe','cached','penetrationEstimated'].some(k=>typeof r[k]!=='boolean')
  ||['age','validFor','estimatedChance','conservativePower'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)
  ||r.validFor>.2||r.estimatedChance>1||!Number.isSafeInteger(r.passThroughSurfaces)||r.passThroughSurfaces<0||r.passThroughSurfaces>32
  ||['muzzleX','muzzleY','muzzleZ','aimX','aimY','aimZ'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
  ||!Array.isArray(r.surfaces)||r.surfaces.length>32||r.surfaces.some((s:any)=>!s||Array.isArray(s)
    ||['material','lane','kind'].some(k=>typeof s[k]!=='string')||typeof s.known!=='boolean'||typeof s.forward!=='boolean'
    ||['distance','level','chance','ricochet','incidence'].some(k=>typeof s[k]!=='number'||!Number.isFinite(s[k])||s[k]<0)
    ||s.chance>1||s.ricochet>1||s.incidence>180)
  ||r.allowed!==['clear','pass-through','penetrable'].includes(r.state)
  ||r.allowed&&(!r.fresh||!r.allySafe||r.validFor<=0)
  ||r.state==='released'&&r.validFor!==0
  ||r.state==='deferred'&&r.fresh
  ||r.state==='clear'&&r.surfaces.length!==0
  ||r.state==='pass-through'&&(r.passThroughSurfaces!==r.surfaces.length||!r.passThroughSurfaces||r.penetrationEstimated||r.estimatedChance!==0||r.surfaces.some((s:any)=>!['door','glass'].includes(s.kind)))
  ||r.state==='penetrable'&&(!r.penetrationEstimated||r.estimatedChance<.5||r.conservativePower<=0)
  ||r.allowed&&r.surfaces.some((s:any)=>!['aim','barrel'].includes(s.lane)||!['solid','door','glass'].includes(s.kind)))return null;
 return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometShotGeometrySummary(t:ShotGeometryContext):string[] {
 return [`Shot ${t.allowed?'permitted':t.state} · ${t.reason.replace(/-/g,' ')}`,
  `Requested by: ${t.consumer||'native manual fire'} · Known target: ${t.target||'none'}`,
  `Weapon: ${t.weapon||'unknown'} · Ammunition: ${t.ammo||'unknown'}`,
  `Muzzle: ${[t.muzzleX,t.muzzleY,t.muzzleZ].map(x=>x.toFixed(1)).join(', ')} · Aim: ${[t.aimX,t.aimY,t.aimZ].map(x=>x.toFixed(1)).join(', ')}`,
  `Allies clear: ${t.allySafe?'yes':'no'} · ${t.cached?'Cached refusal or same-frame check':'Fresh query'} · ${t.age.toFixed(2)} s old`,
  ...(t.passThroughSurfaces?[`Doors / window glass: ${t.passThroughSurfaces} surface crossings allowed. Native ballistics still decide the outcome.`]:[]),
  ...(t.penetrationEstimated?[`Other surfaces: conservative native estimate ${(t.estimatedChance*100).toFixed(0)}%, power ${t.conservativePower.toFixed(1)}. Not a guaranteed penetration.`]:[]),
  ...t.surfaces.map(s=>`${s.lane} · ${s.kind} (${s.material}) · ${s.distance.toFixed(1)} m · ${s.forward?'entry':'exit'}`),
  'Permission is not a fired shot or a confirmed hit.',...t.alternatives];
}
