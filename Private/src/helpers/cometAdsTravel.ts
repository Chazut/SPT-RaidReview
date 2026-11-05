export type AdsTravelContext = {
    state:string; reason:string; action:string; target:string;
    validFor:number; sinceShot:number; speed:number; retryIn:number;
    nativeADS:boolean; requestedOff:boolean; observedADS:boolean; moving:boolean; firing:boolean; preparing:boolean; sprinting:boolean;
    alternatives:string[];
}
export function parseCometAdsTravel(r:any):AdsTravelContext|null {
    if(!r||Array.isArray(r)||!['suppressing','native','waiting','released'].includes(r.state)
        ||['reason','action','target'].some(k=>typeof r[k]!=='string')||!r.action
        ||['validFor','sinceShot','speed','retryIn'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)
        ||['nativeADS','requestedOff','observedADS','moving','firing','preparing','sprinting'].some(k=>typeof r[k]!=='boolean')
        ||r.validFor>.25||r.state!=='suppressing'&&(r.validFor!==0||r.requestedOff)
        ||r.state==='suppressing'&&(!['SeekCover','Retreat','RunAway','RushEnemy'].includes(r.action)||!r.nativeADS||!r.moving||r.firing||r.preparing||r.sprinting)
        ||r.validFor>0&&!r.requestedOff)return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometAdsTravelSummary(t:AdsTravelContext):string[] {
    return [`ADS travel · ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        `Native action: ${t.action} · Known target: ${t.target||'none required for escape'}`,
        `SAIN wants ADS: ${t.nativeADS?'on':'off'} · ADS release requested: ${t.requestedOff?'yes':'no'}`,
        `Observed ADS: ${t.observedADS?'on':'off'} · Observed speed: ${t.speed.toFixed(2)} m/s`,
        `Firing: ${t.firing?'yes':'no'} · Preparing fire: ${t.preparing?'yes':'no'} · Since last shot: ${t.sinceShot.toFixed(2)} s`,
        `Retry delay: ${t.retryIn.toFixed(2)} s · Native route and movement speed retained`,...t.alternatives];
}
