export type WeaponRangeGun = {id:string;slot:string;name:string;class:string;optic:string;fingerprint:string;loaded:number;reserve:number;known:boolean;usable:boolean;automatic:boolean;bolt:boolean;closeScore:number;longScore:number}
export type WeaponRangeContext = {
 state:string;choice:string;reason:string;selectionReason:string;mode:string;action:string;from:string;to:string;target:string;source:string;arbitration:string;
 episode:number;distance:number;contactAge:number;sinceShot:number;stableFor:number;elapsed:number;validFor:number;
 incoming:boolean;protected:boolean;requested:boolean;accepted:boolean;inHands:boolean;ready:boolean;weapons:WeaponRangeGun[];alternatives:string[];
}
export function parseCometWeaponRange(r:any):WeaponRangeContext|null {
 const finite=(v:any)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
 if(!r||Array.isArray(r)||!['choice','requested','drawing','ready','ended'].includes(r.state)||!['Keep','Switch'].includes(r.choice)
  ||!['Keep','Long','Close'].includes(r.mode)||['reason','selectionReason','action','from','to','target','source','arbitration'].some(k=>typeof r[k]!=='string')
  ||!['personal-vision','personal-hearing','personal-memory'].includes(r.source)||!Number.isSafeInteger(r.episode)||r.episode<1
  ||['distance','contactAge','sinceShot','stableFor','elapsed','validFor'].some(k=>!finite(r[k]))||r.validFor>.5
  ||['incoming','protected','requested','accepted','inHands','ready'].some(k=>typeof r[k]!=='boolean')
  ||(r.accepted||r.inHands||r.ready)&&!r.requested||r.ready&&!r.inHands
  ||r.requested&&(r.choice!=='Switch'||!r.to||r.from===r.to)
  ||r.state==='choice'&&r.requested||r.state==='requested'&&!r.requested||r.state==='drawing'&&(!r.inHands||r.ready)
  ||r.state==='ready'&&!r.ready||r.state==='ended'&&r.validFor!==0||r.state!=='ended'&&r.validFor<=0
  ||!Array.isArray(r.weapons)||r.weapons.length!==2||r.weapons.some((g:any)=>!g||Array.isArray(g)
    ||['id','slot','name','class','optic','fingerprint'].some(k=>typeof g[k]!=='string')||!g.id||!['FirstPrimaryWeapon','SecondPrimaryWeapon'].includes(g.slot)
    ||!['iron','dot','scope','scope-and-dot','unknown'].includes(g.optic)
    ||['loaded','reserve'].some(k=>!Number.isSafeInteger(g[k])||g[k]<0)||!finite(g.closeScore)||!finite(g.longScore)
    ||['known','usable','automatic','bolt'].some(k=>typeof g[k]!=='boolean'))
  ||r.weapons[0].id===r.weapons[1].id||!r.weapons.some((g:any)=>g.id===r.from)||r.to&&!r.weapons.some((g:any)=>g.id===r.to))return null;
 return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometWeaponRangeSummary(t:WeaponRangeContext):string[] {
 const yn=(v:boolean)=>v?'yes':'no';
 return [`Weapon by distance · ${t.mode} · ${t.choice} · ${t.state} · ${t.reason.replace(/-/g,' ')}`,
  `Selection: ${t.selectionReason||t.reason} · Shared weapon arbiter: ${t.arbitration||'not requested'}`,
  `Known contact: ${t.target||'none'} · ${t.source} · ${t.contactAge.toFixed(1)} s old · ${t.distance.toFixed(1)} m`,
  ...t.weapons.map(g=>`${g.id===t.from?'Held':'Alternative'}: ${g.name||g.id} · ${g.class} · ${g.optic} · ${g.automatic?'auto available':'no auto'} · Loaded ${g.loaded} / reserve ${g.reserve} · Usable: ${yn(g.usable)} · Equipment known: ${yn(g.known)} · Close/long fit: ${g.closeScore}/${g.longScore}`),
  `Incoming fire: ${yn(t.incoming)} · Protective cover: ${yn(t.protected)} · Last shot ${t.sinceShot.toFixed(1)} s ago · Stable ${t.stableFor.toFixed(1)} s`,
  `From ${t.from} → ${t.to||'keep'} · Requested / accepted / in hands / ready: ${[t.requested,t.accepted,t.inHands,t.ready].map(yn).join(' / ')}`,
  `Elapsed ${t.elapsed.toFixed(1)} s · Fit scores compare equipment, not accuracy or damage`,...t.alternatives];
}
