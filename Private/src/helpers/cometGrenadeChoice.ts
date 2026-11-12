export type GrenadeChoiceAlternative={category?:string;item:string;template:string;name:string;reason:string;fuse:number|null;eligible:boolean};
export type GrenadeChoiceContext={state:string;reason:string;target:string;source:string;item:string;template:string;name:string;preference:string;
 knownX:number;knownY:number;knownZ:number;distance:number;flight:number;fuse:number;margin:number;requiredMargin:number;validFor:number;alternatives:GrenadeChoiceAlternative[]};
const finite=(v:any)=>typeof v==='number'&&Number.isFinite(v);
export function parseCometGrenadeChoice(r:any):GrenadeChoiceContext|null {
 if(!r||Array.isArray(r)||!['selected','validated','blocked','ended'].includes(r.state)
  ||['reason','target','source','item','template','name','preference'].some(k=>typeof r[k]!=='string')||!r.target
  ||!['short-indoors','short-close','long-outdoors','flash-fallback',''].includes(r.preference)
  ||['knownX','knownY','knownZ','distance','flight','fuse','margin','requiredMargin','validFor'].some(k=>!finite(r[k]))
  ||r.distance<0||r.distance>200||r.flight<0||r.flight>30||r.fuse<0||r.fuse>30
  ||r.requiredMargin<0||r.requiredMargin>3||r.validFor<0||r.validFor>1
  ||r.state==='ended'&&r.validFor!==0||!Array.isArray(r.alternatives)||r.alternatives.length>32)return null;
 for(const a of r.alternatives)if(!a||Array.isArray(a)||['item','template','name','reason'].some(k=>typeof a[k]!=='string')
  ||a.category!==undefined&&!['fragmentation','flash','smoke','gas','special','unknown','dummy'].includes(a.category)||typeof a.eligible!=='boolean'||a.fuse!==null&&!finite(a.fuse)||a.eligible&&(a.fuse===null||(a.category==='flash'?a.fuse<=0:a.fuse<2.5)||a.fuse>30))return null;
 if(['selected','validated'].includes(r.state)&&(!r.item
  ||Math.abs(r.margin-(r.fuse-r.flight))>.001||!r.alternatives.some((a:GrenadeChoiceAlternative)=>a.item===r.item&&a.eligible)))return null;
 return r;
}
export function cometGrenadeChoiceSummary(t:GrenadeChoiceContext):string[] {
 return [`Grenade choice: ${t.state} · ${t.reason.replace(/-/g,' ')}`,
  `Known contact: ${t.target} · ${t.source} · ${t.knownX.toFixed(1)}, ${t.knownY.toFixed(1)}, ${t.knownZ.toFixed(1)}`,
  ...(t.item?[`Selected item: ${t.name || t.template} · ${t.item} · fuse ${t.fuse.toFixed(2)} s`]:[]),
  `Estimated flight: ${t.flight.toFixed(2)} s · arrival margin ${t.margin.toFixed(2)} s${t.requiredMargin>0?` (recorded minimum ${t.requiredMargin.toFixed(2)} s)`:''}`,
  `Preference: ${t.preference.replace(/-/g,' ')} · ${t.distance.toFixed(1)} m · selection is not projectile release`,
  ...t.alternatives.map(a=>`${a.eligible?'Candidate':'Rejected'}: ${a.name || a.template} · ${a.category||'fragmentation'} · ${a.item} · fuse ${a.fuse===null?'unknown':a.fuse.toFixed(2)+' s'} · ${a.reason.replace(/-/g,' ')}`)];
}
