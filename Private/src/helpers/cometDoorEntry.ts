export type DoorEntryContext = {
    state:string; reason:string; context:string; door:string; target:string; source:string; interaction:string; network:string;
    chance:number; roll:number; stamina:number; remaining:number; contactAge:number; knownX:number; knownY:number; knownZ:number; validFor:number;
    rolled:boolean; requested:boolean; breachObserved:boolean; doorOpenObserved:boolean; animationFinished:boolean; crossed:boolean; arrived:boolean; alternatives:string[];
}
export function parseCometDoorEntry(r:any):DoorEntryContext|null {
    if(!r||Array.isArray(r)||!['evaluating','approaching','interacting','crossing','completed','ended'].includes(r.state))return null;
    if(['reason','context','door','target','source','interaction','network'].some(k=>typeof r[k]!=='string')||!r.door||!r.target
        ||!['prepared','rush','retreat','search','move'].includes(r.context)
        ||['chance','roll','stamina','remaining','contactAge','validFor'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)
        ||['knownX','knownY','knownZ'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
        ||r.chance>100||r.roll>=100||r.stamina>100||(r.rolled!==undefined&&typeof r.rolled!=='boolean')
        ||['requested','breachObserved','doorOpenObserved','animationFinished','crossed','arrived'].some(k=>typeof r[k]!=='boolean')
        ||(r.breachObserved&&!r.requested)||(r.crossed&&(!r.breachObserved||!r.doorOpenObserved||!r.animationFinished))
        ||(r.state==='crossing'&&!r.animationFinished)||(r.state==='interacting'&&!r.requested)
        ||(r.animationFinished&&(!r.breachObserved||!r.doorOpenObserved))||(r.arrived&&!r.crossed)||(r.state==='completed'&&!r.arrived))return null;
    return {...r,rolled:r.rolled!==false,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((x:any)=>typeof x==='string').slice(0,8):[]};
}
export function cometDoorEntrySummary(t:DoorEntryContext):string[]{
    return [`Door ${t.door}: ${t.state} (${t.context})`,t.reason.replace(/-/g,' '),
        `Chance ${t.chance.toFixed(0)}% · ${t.rolled?'Roll '+t.roll.toFixed(1):'Not rolled (ineligible)'} · Stamina ${t.stamina.toFixed(0)}%`,
        `Known contact: ${t.target} · ${t.source||'not recorded'} · ${t.contactAge.toFixed(1)} s old`,
        `Native animation: ${t.animationFinished?'finished':t.requested?'not yet confirmed finished':'not started'}`,
        `Remaining budget: ${t.remaining.toFixed(1)} s`,
        t.arrived?'Crossing and arrival observed':t.crossed?'Threshold crossing observed':t.breachObserved?'This bot breached the door; crossing not yet confirmed':t.requested?'Native kick requested; success not yet confirmed':'No native kick requested',
        `Interaction: ${t.interaction||'not recorded'} · ${t.network}`,...t.alternatives];
}
