export type QuickReloadContext = {
 state:string;choice:string;reason:string;action:string;weapon:string;oldMagazine:string;replacement:string;target:string;source:string;
 episode:number;loaded:number;capacity:number;oldRounds:number;replacementRounds:number;spareMagazines:number;after:number;droppedRounds:number;
 distance:number;contactAge:number;elapsed:number;validFor:number;
 incoming:boolean;protected:boolean;requested:boolean;started:boolean;callbackSeen:boolean;callbackSuccess:boolean;dropped:boolean;replacementInserted:boolean;finished:boolean;improved:boolean;
 alternatives:string[];
}
export function parseCometQuickReload(r:any):QuickReloadContext|null {
 if(!r||Array.isArray(r)||!['choice','requested','reloading','completed','ended'].includes(r.state)||!['Normal','Quick'].includes(r.choice)
  ||['reason','action','weapon','oldMagazine','replacement','target','source'].some(k=>typeof r[k]!=='string')||!r.weapon||!r.replacement
  ||!['personal-vision','personal-hearing','personal-memory'].includes(r.source)
  ||['episode','loaded','capacity','oldRounds','replacementRounds','spareMagazines','after','droppedRounds'].some(k=>!Number.isSafeInteger(r[k])||r[k]<0)||r.episode<1
  ||r.loaded>r.capacity||r.oldRounds>r.loaded
  ||['distance','contactAge','elapsed','validFor'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)||r.validFor>.5
  ||['incoming','protected','requested','started','callbackSeen','callbackSuccess','dropped','replacementInserted','finished','improved'].some(k=>typeof r[k]!=='boolean')
  ||r.callbackSuccess&&!r.callbackSeen||[r.started,r.callbackSeen,r.dropped,r.replacementInserted,r.finished].some(Boolean)&&!r.requested
  ||r.requested&&(r.choice!=='Quick'||!r.oldMagazine||r.oldMagazine===r.replacement)
  ||!r.dropped&&r.droppedRounds!==0||r.finished&&(!r.callbackSuccess||!r.replacementInserted)
  ||r.improved&&(!r.finished||r.after<=r.loaded)
  ||r.state==='choice'&&r.requested||r.state==='requested'&&(!r.requested||r.started)
  ||r.state==='reloading'&&(!r.started||r.finished)||r.state==='completed'&&!r.finished
  ||r.state==='ended'&&r.validFor!==0||r.state!=='ended'&&r.validFor<=0)return null;
 return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometQuickReloadSummary(t:QuickReloadContext):string[] {
 const yn=(v:boolean)=>v?'yes':'no';
 return [`Fast reload · ${t.choice} · ${t.state} · ${t.reason.replace(/-/g,' ')}`,
  `Ammo: ${t.loaded}/${t.capacity} · Old magazine: ${t.oldRounds} rounds · Replacement: ${t.replacementRounds} rounds · Loaded reachable spares: ${t.spareMagazines} (includes replacement)`,
  `Weapon: ${t.weapon} · Magazine: ${t.oldMagazine||'none'} → ${t.replacement}`,
  `Known contact: ${t.target||'none'} · ${t.source} · ${t.contactAge.toFixed(1)} s old · ${t.distance.toFixed(1)} m`,
  `Incoming fire: ${yn(t.incoming)} · Protective cover: ${yn(t.protected)}`,
  `Requested / animation observed / callback received / callback success: ${[t.requested,t.started,t.callbackSeen,t.callbackSuccess].map(yn).join(' / ')}`,
  `Magazine drop confirmed: ${yn(t.dropped)}${t.dropped?` · ${t.droppedRounds} rounds left in the world`:''}`,
  `Replacement inserted / completed / ammo increased: ${[t.replacementInserted,t.finished,t.improved].map(yn).join(' / ')} · Ammo now: ${t.after}`,
  `Elapsed ${t.elapsed.toFixed(1)} s · Native animation; a request alone does not prove a drop`,...t.alternatives];
}
