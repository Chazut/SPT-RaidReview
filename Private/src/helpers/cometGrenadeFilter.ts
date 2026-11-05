export type GrenadeFilterAlternative={item:string;template:string;name:string;category:string;reason:string;eligible:boolean};
export type GrenadeFilterContext={state:string;reason:string;item:string;template:string;name:string;category:string;previous:string;validFor:number;alternatives:GrenadeFilterAlternative[]};
const categories=['fragmentation','flash','smoke','gas','special','unknown','dummy'];
const text=(v:any)=>typeof v==='string'&&v.length<=512;
export function parseCometGrenadeFilter(t:any):GrenadeFilterContext|null {
 if(!t||Array.isArray(t)||!['selected','validated','blocked','ended'].includes(t.state)
  ||['reason','item','template','name','category','previous'].some(k=>!text(t[k]))||!categories.includes(t.category)
  ||!Number.isFinite(t.validFor)||t.validFor<0||t.validFor>1||t.state==='ended'&&t.validFor!==0
  ||!Array.isArray(t.alternatives)||t.alternatives.length>32)return null;
 const ids=new Set<string>();
 for(const a of t.alternatives){
  if(!a||Array.isArray(a)||['item','template','name','category','reason'].some(k=>!text(a[k]))||!a.item
   ||!categories.includes(a.category)||typeof a.eligible!=='boolean'||ids.has(a.item)
   ||a.eligible&&!['fragmentation','flash'].includes(a.category))return null;
  ids.add(a.item);
 }
 if(['selected','validated'].includes(t.state)&&(!t.item||!['fragmentation','flash'].includes(t.category)
  ||!t.alternatives.some((a:GrenadeFilterAlternative)=>a.item===t.item&&a.eligible&&a.category===t.category)))return null;
 return t;
}
export function cometGrenadeFilterSummary(t:GrenadeFilterContext):string[] {
 return [`Offensive grenade filter: ${t.state} · ${t.reason.replace(/-/g,' ')}`,
  ...(t.item?[`Selected item: ${t.name||t.template} · ${t.category} · ${t.item}`]:[]),
  ...(t.previous&&t.previous!==t.item?[`Previous item: ${t.previous}`]:[]),
  'Eligibility and preparation only; this does not confirm projectile release.',
  ...t.alternatives.map(a=>`${a.eligible?'Eligible':'Excluded'}: ${a.name||a.template} · ${a.category} · ${a.item} · ${a.reason.replace(/-/g,' ')}`)];
}
