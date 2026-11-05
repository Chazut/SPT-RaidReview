export type WeaponReturnGun = { id:string;slot:string;resource:string;loaded:number;chamber:number;magazine:number;capacity:number;reserve:number;usable:boolean }
export type WeaponReturnContext = {
    state:string;choice:string;reason:string;origin:string;action:string;from:string;to:string;fromSlot:string;toSlot:string;target:string;source:string;
    episode:number;loaded:number;reserve:number;targetLoaded:number;targetReserve:number;
    contactAge:number;distance:number;quietFor:number;holdRemaining:number;returnRemaining:number;retryRemaining:number;elapsed:number;validFor:number;
    incoming:boolean;far:boolean;protected:boolean;reloading:boolean;requested:boolean;accepted:boolean;inHands:boolean;ready:boolean;
    weapons:WeaponReturnGun[];alternatives:string[];
}
const gunSlot=(s:string)=>['FirstPrimaryWeapon','SecondPrimaryWeapon','Holster'].includes(s);
function validGun(g:any):boolean {
    return !!g&&!Array.isArray(g)&&['id','slot','resource'].every(k=>typeof g[k]==='string')&&typeof g.usable==='boolean'
        &&['loaded','chamber','magazine','capacity','reserve'].every(k=>Number.isSafeInteger(g[k])&&g[k]>=0)
        &&g.loaded===g.chamber+g.magazine&&g.loaded<=g.capacity&&(g.id?gunSlot(g.slot):g.loaded===0&&!g.usable);
}
export function parseCometWeaponReturn(r:any):WeaponReturnContext|null {
    if(!r||Array.isArray(r)||!['choice','requested','drawing','ready','ended'].includes(r.state)||!['Keep','Switch','Native'].includes(r.choice)
        ||['reason','origin','action','from','to','fromSlot','toSlot','target','source'].some(k=>typeof r[k]!=='string')||!r.from||!gunSlot(r.fromSlot)
        ||!['personal-vision','personal-hearing','personal-memory'].includes(r.source)
        ||['episode','loaded','reserve','targetLoaded','targetReserve'].some(k=>!Number.isSafeInteger(r[k])||r[k]<0)||r.episode<1
        ||['contactAge','distance','quietFor','holdRemaining','returnRemaining','retryRemaining','elapsed','validFor'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)||r.validFor>.5
        ||['incoming','far','protected','reloading','requested','accepted','inHands','ready'].some(k=>typeof r[k]!=='boolean')
        ||r.accepted&&!r.requested||r.inHands&&!r.accepted||r.ready&&!r.inHands||r.requested&&(r.choice!=='Switch'||!r.to||!gunSlot(r.toSlot)||r.from===r.to)
        ||r.state==='choice'&&r.requested||r.state==='requested'&&(!r.requested||r.inHands)||r.state==='drawing'&&(!r.inHands||r.ready)
        ||r.state==='ready'&&!r.ready||r.state==='ended'&&r.validFor!==0||r.state!=='ended'&&r.validFor<=0
        ||!Array.isArray(r.weapons)||r.weapons.length!==4||!r.weapons.every(validGun))return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometWeaponReturnSummary(t:WeaponReturnContext):string[] {
    const yn=(v:boolean)=>v?'yes':'no';
    const guns=t.weapons.filter((g,i,a)=>g.id&&a.findIndex(x=>x.id===g.id)===i);
    return [`Weapon return · ${t.choice} · ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        `Request source: ${t.origin} · ${t.fromSlot} (${t.from}) → ${t.toSlot||'no target'} (${t.to||'none'})`,
        ...guns.map(g=>`${g.slot}: ${g.loaded}/${g.capacity} rounds (${g.chamber} chamber + ${g.magazine} magazine) · Reserve ${g.reserve} (${g.resource}) · Usable: ${yn(g.usable)}`),
        `Known contact: ${t.target||'none'} · ${t.source} · ${t.contactAge.toFixed(1)} s old · ${t.distance.toFixed(1)} m`,
        `Quiet ${t.quietFor.toFixed(1)} s · Incoming fire: ${yn(t.incoming)} · Far threat: ${yn(t.far)} · Protective cover: ${yn(t.protected)}`,
        `Hold / primary reload grace / retry remaining: ${t.holdRemaining.toFixed(1)} / ${t.returnRemaining.toFixed(1)} / ${t.retryRemaining.toFixed(1)} s · Reloading: ${yn(t.reloading)}`,
        `Requested / accepted / in hands / ready: ${[t.requested,t.accepted,t.inHands,t.ready].map(yn).join(' / ')}`,
        `Elapsed ${t.elapsed.toFixed(1)} s · Native draw animation; an accepted request is not a confirmed switch`,...t.alternatives];
}
