export interface LightDisciplineContext {
    state:string; reason:string; contact:string; source:string; action:string; tactic:string; weapon:string; execution:string; scope:string;
    known:{x:number;y:number;z:number}|null; contactAge:number|null; distance:number|null; speed:number|null;
    holdWait:number; hiddenWait:number; visibleWait:number; validFor:number;
    requested:boolean; observedOff:boolean; nightVision:boolean; devices:number; activeDevices:number; modes:string[]; alternatives:string[];
}
export function parseCometLightDiscipline(r:any):LightDisciplineContext|null {
    if(!r||Array.isArray(r)||!['waiting','dark','yielded','released'].includes(r.state)
        ||['reason','contact','source','action','tactic','weapon','execution','scope'].some(k=>typeof r[k]!=='string')
        ||!r.reason||!r.execution||r.scope!=='held weapon'
        ||['requested','observedOff','nightVision'].some(k=>typeof r[k]!=='boolean')
        ||['holdWait','hiddenWait','visibleWait','validFor','devices','activeDevices'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)
        ||['contactAge','distance','speed'].some(k=>r[k]!==null&&(typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0))
        ||!Number.isInteger(r.devices)||!Number.isInteger(r.activeDevices)||r.devices>16||r.activeDevices>r.devices
        ||r.holdWait>3||r.hiddenWait>5||r.visibleWait>.5||r.validFor>.8
        ||r.known!==null&&(!r.known||['x','y','z'].some(k=>typeof r.known[k]!=='number'||!Number.isFinite(r.known[k])))
        ||r.observedOff!==(r.devices>0&&r.activeDevices===0)
        ||r.validFor>0&&r.state!=='dark'
        ||!Array.isArray(r.modes)||r.modes.length>16||r.modes.some((v:any)=>typeof v!=='string')
        ||r.state==='dark'&&(!r.observedOff||!r.contact||!r.known||!['personal-hearing','personal-vision'].includes(r.source)
            ||r.contactAge===null||r.distance===null||r.speed===null||!r.weapon||!r.tactic||r.modes.length!==r.devices))return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometLightDisciplineSummary(t:LightDisciplineContext):string[] {
    const known=t.known?`${t.known.x.toFixed(1)}, ${t.known.y.toFixed(1)}, ${t.known.z.toFixed(1)}`:'unavailable';
    return [`Ambush lights · ${t.state.replace(/-/g,' ')}`,
        `Reason: ${t.reason.replace(/-/g,' ')} · ${t.tactic || 'no tactical wait'}`,
        `Action: ${t.action || 'none'} · ${t.execution}`,
        `Known contact: ${t.contact||'none'} · ${t.source||'no personal evidence'}${t.contactAge!==null?` · ${t.contactAge.toFixed(1)} s old`:''}`,
        `Last known position: ${known}${t.distance!==null?` · ${t.distance.toFixed(1)} m away`:''}`,
        `Switch-off requested: ${t.requested?'yes':'no'} · Observed OFF: ${t.observedOff?'yes':'no'} · Active devices: ${t.activeDevices}/${t.devices}`,
        `Night vision: ${t.nightVision?'ON':'OFF'} · Selected device modes preserved${t.modes.length?` (${t.modes.join(', ')})`:''}`,
        `Remaining wait: hold ${t.holdWait.toFixed(2)} s · hidden ${t.hiddenWait.toFixed(2)} s · visible ${t.visibleWait.toFixed(2)} s`,
        'Lighting context only. Behavior colors and combat ownership are unchanged.',...t.alternatives];
}
