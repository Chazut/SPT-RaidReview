export interface SquadVoiceContext {
    request:string;state:string;reason:string;phrase:string;source:string;mode:string;action:string;execution:string;
    urgent:boolean;filtered:boolean;played:boolean;chance:number;roll:number;botWait:number;squadWait:number;validFor:number;alternatives:string[];
}
export function parseCometSquadVoice(r:any):SquadVoiceContext|null {
    if(!r||Array.isArray(r)||!['requested','queued','superseded','native-declined','released','native-no-voice','filtered','native-played','native-not-played'].includes(r.state)
        ||!['Normal','Reduced','Disabled'].includes(r.mode)
        ||['request','reason','phrase','source','action','execution'].some(k=>typeof r[k]!=='string'||!r[k])
        ||['urgent','filtered','played'].some(k=>typeof r[k]!=='boolean')
        ||['chance','roll','botWait','squadWait','validFor'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
        ||r.chance<0||r.chance>100||r.roll < -1||r.roll>=100||r.botWait<0||r.botWait>30||r.squadWait<0||r.squadWait>15||r.validFor<0||r.validFor>2
        ||r.filtered!==(r.state==='filtered')||r.played!==(r.state==='native-played')
        ||r.filtered&&r.mode==='Normal'||r.filtered&&r.mode==='Reduced'&&r.urgent
        ||r.validFor>0&&!r.played&&!r.filtered)return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((s:any)=>typeof s==='string').slice(0,8):[]};
}
export function cometSquadVoiceSummary(t:SquadVoiceContext):string[] {
    return [`Squad voice · ${t.mode} · ${t.state.replace(/-/g,' ')}`,
        `Phrase: ${t.phrase}${t.urgent?' · Urgent alert':''}`,
        `Reason: ${t.reason.replace(/-/g,' ')}`,
        `Action: ${t.action} · ${t.execution}`,
        `Source: ${t.source} · Request: ${t.request}`,
        `Ordinary chance: ${t.chance}%${t.roll>=0?` · Roll: ${t.roll.toFixed(1)}`:' · No additional roll'}`,
        `Remaining gap: bot ${t.botWait.toFixed(1)} s · squad ${t.squadWait.toFixed(1)} s`,
        'Voice context only. SAIN keeps combat ownership and the behavior color.',...t.alternatives];
}
