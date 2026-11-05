export type PistolSwapContext = {
    state:string;choice:string;reason:string;weapon:string;pistol:string;target:string;source:string;action:string;
    episode:number;mainLoaded:number;mainCapacity:number;pistolLoaded:number;pistolChamber:number;pistolMagazine:number;pistolCapacity:number;
    distance:number;contactAge:number;reloadScore:number;holdScore:number;pistolScore:number;elapsed:number;validFor:number;
    visible:boolean;protected:boolean;incoming:boolean;requested:boolean;accepted:boolean;inHands:boolean;ready:boolean;
    alternatives:string[];
}
export function parseCometPistolSwap(r:any):PistolSwapContext|null {
    if(!r||Array.isArray(r)||!['choice','requested','drawing','ready','ended'].includes(r.state)||!['Pistol','Reload','Hold','Native'].includes(r.choice)
        ||['reason','weapon','pistol','target','source','action'].some(k=>typeof r[k]!=='string')||!r.weapon
        ||!['personal-vision','personal-hearing','personal-memory'].includes(r.source)
        ||['episode','mainLoaded','mainCapacity','pistolLoaded','pistolChamber','pistolMagazine','pistolCapacity'].some(k=>!Number.isSafeInteger(r[k])||r[k]<0)
        ||['distance','contactAge','reloadScore','holdScore','pistolScore','elapsed','validFor'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
        ||['distance','contactAge','elapsed','validFor'].some(k=>r[k]<0)||r.validFor>.5
        ||r.episode<1||r.mainLoaded>r.mainCapacity||r.pistolLoaded!==r.pistolChamber+r.pistolMagazine||r.pistolLoaded>r.pistolCapacity
        ||['visible','protected','incoming','requested','accepted','inHands','ready'].some(k=>typeof r[k]!=='boolean')
        ||r.accepted&&!r.requested||r.inHands&&!r.accepted||r.ready&&!r.inHands||r.requested&&(r.choice!=='Pistol'||!r.pistol)
        ||r.state==='choice'&&r.requested||r.state==='requested'&&(!r.requested||r.inHands)
        ||r.state==='drawing'&&(!r.inHands||r.ready)||r.state==='ready'&&!r.ready
        ||r.state==='ended'&&r.validFor!==0||r.state!=='ended'&&r.validFor<=0)return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometPistolSwapSummary(t:PistolSwapContext):string[] {
    const yn=(v:boolean)=>v?'yes':'no';
    return [`Pistol swap · ${t.choice} · ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        `Primary: ${t.mainLoaded}/${t.mainCapacity} rounds · Pistol: ${t.pistolLoaded}/${t.pistolCapacity} (${t.pistolChamber} chamber + ${t.pistolMagazine} magazine)`,
        `Known contact: ${t.target||'none'} · ${t.source} · ${t.contactAge.toFixed(1)} s old · ${t.distance.toFixed(1)} m`,
        `Protective cover reached: ${yn(t.protected)} · Visible: ${yn(t.visible)} · Incoming fire: ${yn(t.incoming)}`,
        `Scores: pistol ${t.pistolScore.toFixed(2)} / reload ${t.reloadScore.toFixed(2)} / keep ready ${t.holdScore.toFixed(2)}`,
        `Requested / accepted / in hands / ready: ${[t.requested,t.accepted,t.inHands,t.ready].map(yn).join(' / ')}`,
        `Elapsed ${t.elapsed.toFixed(1)} s · Native draw animation; an accepted request is not a confirmed switch`,...t.alternatives];
}
