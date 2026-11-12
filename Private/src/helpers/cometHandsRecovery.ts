export type HandsRecoveryContext = {
 state:string;reason:string;kind:string;held:string;targetWeapon:string;targetSlot:string;operation:string;action:string;contact:string;
 attempts:number;limit:number;confirmedSeconds:number;requiredSeconds:number;retryRemaining:number;requestAge:number;validFor:number;
 reloadFlag:boolean;nativeReload:boolean;accepted:boolean;inHands:boolean;ready:boolean;alternatives:string[];
}
export function parseCometHandsRecovery(r:any):HandsRecoveryContext|null {
 if(!r||Array.isArray(r)||!['observing','waiting','requested','waiting-native','refused','timeout','recovered','exhausted','ended'].includes(r.state)
  ||!['reload','grenade'].includes(r.kind)
  ||['reason','held','targetWeapon','targetSlot','operation','action','contact'].some(k=>typeof r[k]!=='string')||!r.held
  ||['confirmedSeconds','requiredSeconds','retryRemaining','requestAge','validFor'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)
  ||r.validFor>6||r.requiredSeconds<1||r.requiredSeconds>20
  ||!Number.isSafeInteger(r.attempts)||r.attempts<0||!Number.isSafeInteger(r.limit)||r.limit<0||r.limit>3
  ||r.kind==='grenade'&&(r.attempts>3||r.limit<1)
  ||['reloadFlag','nativeReload','accepted','inHands','ready'].some(k=>typeof r[k]!=='boolean')
  ||['recovered','ended'].includes(r.state)!==(r.validFor===0)
  ||r.ready&&(!r.inHands||r.kind!=='grenade'||r.state!=='recovered')
  ||r.accepted&&r.attempts===0
  ||r.state==='refused'&&r.accepted
  ||['requested','waiting-native','refused','timeout'].includes(r.state)&&r.attempts===0
  ||r.state==='exhausted'&&r.attempts<r.limit
  ||r.kind==='grenade'&&r.attempts>0&&(!r.targetWeapon||!['FirstPrimaryWeapon','SecondPrimaryWeapon','Holster'].includes(r.targetSlot))
  ||r.state==='recovered'&&r.kind==='grenade'&&!r.ready
  ||r.state==='recovered'&&r.kind==='reload'&&r.reloadFlag)return null;
 return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometHandsRecoverySummary(t:HandsRecoveryContext):string[] {
 return [`${t.kind==='reload'?'Stale reload flag':'Abandoned grenade'} · ${t.state} · ${t.reason.replace(/-/g,' ')}`,
  `Hands: ${t.held} · Native operation: ${t.operation}`,
  `Confirmed inactivity: ${t.confirmedSeconds.toFixed(1)} / ${t.requiredSeconds.toFixed(1)} s · Attempts: ${t.attempts}${t.limit>0?`/${t.limit}`:''}`,
  `Native reload: ${t.nativeReload?'active':'inactive'} · Reload flag: ${t.reloadFlag?'set':'clear'}`,
  ...(t.kind==='grenade'?[`Existing weapon: ${t.targetWeapon||'unavailable'} · In hands: ${t.inHands?'yes':'no'} · Ready: ${t.ready?'yes':'no'}`]:[]),
  `Request accepted: ${t.accepted?'yes':'no'} · Result: ${t.state==='recovered'?'observed recovery':'not confirmed'}`,
  `Retry wait: ${t.retryRemaining.toFixed(1)} s · Request age: ${t.requestAge.toFixed(1)} s`,
  `Known contact: ${t.contact||'none (maintenance does not choose targets)'}`,
  'Maintenance only; recorded behavior colors stay unchanged.',...t.alternatives];
}
