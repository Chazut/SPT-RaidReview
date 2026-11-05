export type CornerPrefireContext = {
    state:string; reason:string; target:string; weapon:string; mode:string; action:string; source:string;
    episode:number; parentEpisode:number; ammoStart:number; ammo:number; capacity:number; reserve:number; quota:number; actualShots:number;
    chance:number; roll:number; remaining:number; validFor:number; contactAge:number; cornerDistance:number; knownCornerDistance:number; fireElapsed:number;
    knownX:number; knownY:number; knownZ:number; aimX:number; aimY:number; aimZ:number;
    selected:boolean; requested:boolean; accepted:boolean; clear:boolean; allySafe:boolean; aligned:boolean; alternatives:string[];
}
export function parseCometCornerPrefire(r:any):CornerPrefireContext|null {
    if(!r||Array.isArray(r)||!['waiting','firing','ended'].includes(r.state)
        ||['reason','target','weapon','mode','action','source'].some(k=>typeof r[k]!=='string')
        ||r.action!=='RushEnemy'||r.source!=='personal-vision'
        ||['episode','parentEpisode','ammoStart','ammo','capacity','reserve','quota','actualShots','chance','roll','remaining','validFor','contactAge','cornerDistance','knownCornerDistance','fireElapsed'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)
        ||['knownX','knownY','knownZ','aimX','aimY','aimZ'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
        ||['episode','parentEpisode','ammoStart','ammo','capacity','reserve','quota','actualShots'].some(k=>!Number.isInteger(r[k]))
        ||['selected','requested','accepted','clear','allySafe','aligned'].some(k=>typeof r[k]!=='boolean')
        ||r.chance>100||r.roll>=100||r.validFor>.2||r.validFor>r.remaining||r.quota<1||r.quota>6||r.actualShots>r.quota
        ||(r.accepted||r.actualShots>0)&&!r.requested||r.requested&&!r.selected
        ||r.state==='firing'&&!r.requested||r.state==='waiting'&&r.requested
        ||r.state==='ended'&&(r.validFor!==0||r.remaining!==0)
        ||r.state!=='ended'&&(!r.selected||!r.target||!r.weapon||r.capacity<=0))return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,6):[]};
}
export function cometCornerPrefireSummary(t:CornerPrefireContext):string[] {
    return [`Corner prefire · ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        `Known contact: ${t.target||'none'} · Personal vision · ${t.contactAge.toFixed(2)} s old`,
        `Last observed position: ${t.knownX.toFixed(1)}, ${t.knownY.toFixed(1)}, ${t.knownZ.toFixed(1)}`,
        `Fixed aim point: ${t.aimX.toFixed(1)}, ${t.aimY.toFixed(1)}, ${t.aimZ.toFixed(1)} · Not the hidden enemy position`,
        `Chance: ${t.chance.toFixed(0)}% · Roll: ${t.roll.toFixed(1)} · M05 opportunity: ${t.parentEpisode}`,
        `Fire request: ${t.requested?'yes':'no'} · Native acceptance: ${t.accepted?'yes':'not confirmed'} · Actual shots: ${t.actualShots} / ${t.quota}`,
        `Magazine: ${t.ammo} / ${t.capacity} · At selection: ${t.ammoStart} · Reserve: ${t.reserve} · Mode: ${t.mode||'unknown'}`,
        `Muzzle clear: ${t.clear?'yes':'no'} · Allies clear: ${t.allySafe?'yes':'no'} · Aligned: ${t.aligned?'yes':'no'}`,
        `Distance to corner: ${t.cornerDistance.toFixed(1)} m · Last sighting to corner: ${t.knownCornerDistance.toFixed(1)} m`,
        `Firing window elapsed: ${t.fireElapsed.toFixed(2)} s · Time remaining: ${t.remaining.toFixed(2)} s`,...t.alternatives];
}
