export type CoverFeintContext = {
    state:string;kind:string;reason:string;target:string;source:string;action:string;soundEvent:string;
    episode:number;completedPeeks:number;moveRequests:number;jumpsAccepted:number;soundEvents:number;playbackSubmissions:number;
    validFor:number;elapsed:number;contactAge:number;peekChance:number;magazineChance:number;peekRoll:number;magazineRoll:number;orderRoll:number;peekWeight:number;magazineWeight:number;exposure:number;hold:number;pause:number;speed:number;distanceMoved:number;
    x:number;y:number;z:number;knownX:number;knownY:number;knownZ:number;goalX:number;goalY:number;goalZ:number;
    requested:boolean;accepted:boolean;movementObserved:boolean;exposedObserved:boolean;returnedObserved:boolean;magazineRequested:boolean;magazineAccepted:boolean;animationObserved:boolean;weaponReady:boolean;drewFire:boolean;approachObserved:boolean;
    alternatives:string[];
}
export function parseCometCoverFeint(r:any):CoverFeintContext|null {
    if(!r||Array.isArray(r)||!['planning','out-pending','out','show','back-pending','back','pause','final-hold','mag-pending','mag-check','hold','ended'].includes(r.state)
        ||!['peek','magazine',''].includes(r.kind)||['reason','target','source','action','soundEvent'].some(k=>typeof r[k]!=='string')||!r.target||r.source!=='personal-vision'||r.action!=='Freeze'
        ||['episode','completedPeeks','moveRequests','jumpsAccepted','soundEvents','playbackSubmissions'].some(k=>!Number.isSafeInteger(r[k])||r[k]<0)
        ||['validFor','elapsed','contactAge','peekChance','magazineChance','peekRoll','magazineRoll','orderRoll','peekWeight','magazineWeight','exposure','hold','pause','speed','distanceMoved','x','y','z','knownX','knownY','knownZ','goalX','goalY','goalZ'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
        ||['requested','accepted','movementObserved','exposedObserved','returnedObserved','magazineRequested','magazineAccepted','animationObserved','weaponReady','drewFire','approachObserved'].some(k=>typeof r[k]!=='boolean')
        ||['validFor','elapsed','contactAge','exposure','hold','pause','speed','distanceMoved','peekWeight','magazineWeight'].some(k=>r[k]<0)
        ||['peekChance','magazineChance'].some(k=>r[k]<0||r[k]>100)||['peekRoll','magazineRoll','orderRoll'].some(k=>r[k]<0||r[k]>=100)
        ||r.episode<1||r.completedPeeks>2||r.moveRequests>4||r.jumpsAccepted>2||r.validFor>.3
        ||r.accepted&&!r.requested||r.movementObserved&&r.moveRequests===0||r.returnedObserved&&r.moveRequests<2
        ||r.magazineAccepted&&!r.magazineRequested||r.animationObserved&&!r.magazineAccepted||r.playbackSubmissions>0&&!r.magazineAccepted
        ||r.state==='ended'&&r.validFor!==0||r.state!=='ended'&&(r.validFor<=0||!r.kind||!r.requested)
        ||['mag-pending','mag-check','hold'].includes(r.state)&&r.kind!=='magazine'
        ||['out-pending','out','show','back-pending','back','pause','final-hold'].includes(r.state)&&r.kind!=='peek')return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometCoverFeintSummary(t:CoverFeintContext):string[] {
    const yn=(v:boolean)=>v?'yes':'no';
    return [`Cover feint · ${t.kind||'stay in cover'} · ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        `Known contact: ${t.target} · Personal sighting ${t.contactAge.toFixed(1)} s ago`,
        `Peek: ${t.peekChance}% chance / ${t.peekRoll.toFixed(1)} roll · Magazine: ${t.magazineChance}% / ${t.magazineRoll.toFixed(1)} · Order weights ${t.peekWeight.toFixed(1)} / ${t.magazineWeight.toFixed(1)}`,
        `Requested / accepted / movement / returned: ${[t.requested,t.accepted,t.movementObserved,t.returnedObserved].map(yn).join(' / ')}`,
        `Peeks completed: ${t.completedPeeks} · Exposure after arrival: ${t.exposure.toFixed(2)} s · Exposed observed: ${yn(t.exposedObserved)} · Jumps accepted: ${t.jumpsAccepted}`,
        `Magazine requested / accepted / animation / weapon ready: ${[t.magazineRequested,t.magazineAccepted,t.animationObserved,t.weaponReady].map(yn).join(' / ')} · Hold duration: ${t.hold.toFixed(1)} s`,
        `Native sound events: ${t.soundEvents} (${t.soundEvent||'none'}) · Playback submissions: ${t.playbackSubmissions} · Enemy hearing not confirmed`,
        `Observed incoming fire: ${yn(t.drewFire)} · Observed approach: ${yn(t.approachObserved)} · These observations do not prove the feint caused them`,
        `Actual movement ${t.distanceMoved.toFixed(1)} m · Speed ${t.speed.toFixed(1)} m/s · Elapsed ${t.elapsed.toFixed(1)} s`,...t.alternatives];
}
