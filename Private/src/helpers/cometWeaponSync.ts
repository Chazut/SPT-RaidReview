export type WeaponSyncSlot = {
 slot:string;actual:string;name:string;nativeBefore:string;sainBefore:string;nativeAfter:string;sainAfter:string;
 nativePresent:boolean;sainPresent:boolean;nativeMatches:boolean;sainMatches:boolean;selectorMatches:boolean;contentsChanged:boolean;
 nativeOperation:string;sainOperation:string;
}
export type WeaponSyncContext = {
 state:string;reason:string;trigger:string;action:string;held:string;nativeCurrentBefore:string;sainCurrentBefore:string;nativeCurrentAfter:string;sainCurrentAfter:string;
 changed:boolean;verified:boolean;selectorUpdated:boolean;nativeCurrentUpdated:boolean;sainCurrentUpdated:boolean;resourcesInvalidated:boolean;
 validFor:number;sampleMilliseconds:number;slots:WeaponSyncSlot[];
}
export function parseCometWeaponSync(r:any):WeaponSyncContext|null {
 const finite=(v:any)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
 if(!r||Array.isArray(r)||!['deferred','applied','verified','failed','ended'].includes(r.state)
  ||['reason','trigger','action','held','nativeCurrentBefore','sainCurrentBefore','nativeCurrentAfter','sainCurrentAfter'].some(k=>typeof r[k]!=='string')
  ||['changed','verified','selectorUpdated','nativeCurrentUpdated','sainCurrentUpdated','resourcesInvalidated'].some(k=>typeof r[k]!=='boolean')
  ||!finite(r.validFor)||r.validFor>2||!finite(r.sampleMilliseconds)
  ||r.state==='ended'&&r.validFor!==0||r.state!=='ended'&&r.validFor<=0
  ||r.state==='verified'&&!r.verified||r.verified&&!['verified','ended'].includes(r.state)
  ||r.state==='applied'&&!r.changed
  ||!Array.isArray(r.slots)||![0,3].includes(r.slots.length)
  ||r.slots.length===0&&!['failed','ended'].includes(r.state))return null;
 const slots=new Set<string>(),ids=new Set<string>();
 for(const s of r.slots) {
  if(!s||Array.isArray(s)||['slot','actual','name','nativeBefore','sainBefore','nativeAfter','sainAfter','nativeOperation','sainOperation'].some(k=>typeof s[k]!=='string')
   ||!['FirstPrimaryWeapon','SecondPrimaryWeapon','Holster'].includes(s.slot)||slots.has(s.slot)||s.actual&&ids.has(s.actual)
   ||['nativePresent','sainPresent','nativeMatches','sainMatches','selectorMatches','contentsChanged'].some(k=>typeof s[k]!=='boolean')
   ||!['keep','add','replace','remove'].includes(s.nativeOperation)||!['keep','add','replace','remove','refresh'].includes(s.sainOperation)
   ||r.verified&&(s.nativeAfter!==s.actual||s.sainAfter!==s.actual))return null;
  slots.add(s.slot);if(s.actual)ids.add(s.actual);
 }
 if(r.verified&&(r.slots.length!==3||r.held&&(r.nativeCurrentAfter!==r.held||r.sainCurrentAfter!==r.held||!ids.has(r.held))))return null;
 return {...r,slots:r.slots};
}
export function cometWeaponSyncSummary(t:WeaponSyncContext):string[] {
 const name=(id:string)=>id||'empty';
 const labels:Record<string,string>={FirstPrimaryWeapon:'Primary 1',SecondPrimaryWeapon:'Primary 2',Holster:'Holster'};
 return [`Equipment maintenance: ${t.state} · ${t.reason.replace(/-/g,' ')}`,`Triggered by: ${t.trigger.replace(/-/g,' ')}`,
  ...t.slots.map(s=>`${labels[s.slot]}: ${s.name||name(s.actual)} · Native ${name(s.nativeBefore)} → ${t.verified?name(s.nativeAfter):'pending'} (${s.nativeOperation}) · SAIN ${name(s.sainBefore)} → ${t.verified?name(s.sainAfter):'pending'} (${s.sainOperation})`),
  `Held weapon: ${name(t.held)} · Verified: ${t.verified?'yes':'no'} · Resource caches invalidated: ${t.resourcesInvalidated?'yes':'no'}`,
  'Maintenance only; the recorded bot behavior is unchanged.'];
}
