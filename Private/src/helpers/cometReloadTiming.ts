export type ReloadTimingContext = {
    state:string;choice:string;reason:string;weapon:string;target:string;source:string;weaponClass:string;resource:string;action:string;
    episode:number;loaded:number;capacity:number;chamber:number;magazine:number;reserve:number;threats:number;reserveForFight:number;after:number;
    ratio:number;reloadScore:number;holdScore:number;contactAge:number;distance:number;elapsed:number;validFor:number;
    critical:boolean;protected:boolean;visible:boolean;incoming:boolean;busyObserved:boolean;requested:boolean;accepted:boolean;started:boolean;finished:boolean;improved:boolean;
    alternatives:string[];
}
export function parseCometReloadTiming(r:any):ReloadTimingContext|null {
    if(!r||Array.isArray(r)||!['choice','requested','reloading','ended'].includes(r.state)||!['Reload','Hold','Native'].includes(r.choice)
        ||['reason','weapon','target','source','weaponClass','resource','action'].some(k=>typeof r[k]!=='string')
        ||!r.weapon||!['personal-vision','personal-hearing','personal-memory'].includes(r.source)
        ||!['none','magazine','loose-ammo','not-needed'].includes(r.resource)
        ||['episode','loaded','capacity','chamber','magazine','reserve','threats','reserveForFight','after'].some(k=>!Number.isSafeInteger(r[k])||r[k]<0)
        ||['ratio','reloadScore','holdScore','contactAge','distance','elapsed','validFor'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
        ||['contactAge','distance','elapsed','validFor'].some(k=>r[k]<0)||r.ratio<0||r.ratio>1||r.validFor>.5
        ||r.episode<1||r.loaded!==r.chamber+r.magazine||r.loaded>r.capacity
        ||['critical','protected','visible','incoming','busyObserved','requested','accepted','started','finished','improved'].some(k=>typeof r[k]!=='boolean')
        ||r.accepted&&!r.requested||r.started&&!r.accepted||r.finished&&!r.started||r.improved&&(!r.finished||r.after<=r.loaded)
        ||r.requested&&r.choice!=='Reload'||r.state==='reloading'&&!r.started
        ||r.state==='requested'&&!r.requested||r.state==='ended'&&r.validFor!==0||r.state!=='ended'&&r.validFor<=0)return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometReloadTimingSummary(t:ReloadTimingContext):string[] {
    const yn=(v:boolean)=>v?'yes':'no';
    return [`Reload timing · ${t.choice} · ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        `Ammo: ${t.loaded}/${t.capacity} (${t.chamber} chamber + ${t.magazine} magazine) · ${t.weaponClass} · Critical: ${yn(t.critical)}`,
        `Available reload resource: ${t.resource} · ${t.reserve} rounds · Short-fight reserve: ${t.reserveForFight}`,
        `Known contact: ${t.target||'none'} · ${t.source} · ${t.contactAge.toFixed(1)} s old · ${t.distance.toFixed(1)} m`,
        `Protective cover reached: ${yn(t.protected)} · Incoming fire: ${yn(t.incoming)} · Other threats: ${t.threats} · Personal busy cue: ${yn(t.busyObserved)}`,
        `Scores: reload ${t.reloadScore.toFixed(2)} / keep ready ${t.holdScore.toFixed(2)}`,
        `Requested / accepted / animation / finished: ${[t.requested,t.accepted,t.started,t.finished].map(yn).join(' / ')}`,
        `Ammo gain observed: ${yn(t.improved)} · Last observed ammo: ${t.after} · Elapsed ${t.elapsed.toFixed(1)} s`,
        `Native animations and weapon fallback; no forced reload cancellation`,...t.alternatives];
}
