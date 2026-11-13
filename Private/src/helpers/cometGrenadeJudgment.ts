export type GrenadeJudgmentContext = {
 target:string;source:string;state:string;reason:string;item:string;episode:number;count:number;samples:number;
 age:number;x:number;y:number;z:number;campSeconds:number;baseChance:number;campBonus:number;roomBonus:number;vulnerableBonus:number;
 lastPenalty:number;fade:number;chance:number;retryRemaining:number;validFor:number;roll:number|null;
 requested:boolean;accepted:boolean;released:boolean;nativeStarted?:boolean;nativePhase?:string;hands?:string;alternatives:string[];
}
export function parseCometGrenadeJudgment(r:any):GrenadeJudgmentContext|null {
 if(!r||Array.isArray(r)||!['blocked','timeout','assessed','eligible','declined','requested','accepted','unconfirmed','interrupted','refused','released','ended'].includes(r.state)
  ||['target','source','reason','item'].some(k=>typeof r[k]!=='string')||!r.target
  ||['age','campSeconds','baseChance','campBonus','roomBonus','vulnerableBonus','lastPenalty','fade','chance','retryRemaining','validFor'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)
  ||['x','y','z'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
  ||['episode','count','samples'].some(k=>!Number.isSafeInteger(r[k])||r[k]<0)||r.count>256||r.validFor>2||r.chance>95||r.fade>1
  ||r.roll!==null&&(typeof r.roll!=='number'||!Number.isFinite(r.roll)||r.roll<0||r.roll>=100)
  ||['requested','accepted','released'].some(k=>typeof r[k]!=='boolean')
  ||r.accepted&&!r.requested||r.released&&(!r.accepted||r.state!=='released'&&r.state!=='ended')
  ||['eligible','declined','requested','accepted','refused','released'].includes(r.state)&&r.roll===null
  ||r.state==='eligible'&&r.roll>=r.chance||r.state==='declined'&&r.roll<r.chance
  ||r.state==='released'&&!r.released||r.state==='accepted'&&!r.accepted||r.state==='refused'&&r.accepted
  ||['unconfirmed','interrupted'].includes(r.state)&&(!r.requested||!r.accepted||r.released)
  ||(r.state==='ended')!==(r.validFor===0))return null;
 return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometGrenadeJudgmentSummary(t:GrenadeJudgmentContext):string[] {
 return [`Grenade judgment: ${t.state} · ${t.reason.replace(/-/g,' ')}`,
  `Known contact: ${t.target} · ${t.source} · ${t.age.toFixed(1)} s old`,
  `Known position: ${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)}`,
  `Confirmed presence: ${t.campSeconds.toFixed(1)} s · ${t.samples} observations`,
  `Base ${t.baseChance}% · Presence +${t.campBonus} · Room +${t.roomBonus} · Heard opportunity +${t.vulnerableBonus} · Last grenade -${t.lastPenalty}`,
  t.roll===null?'No probability roll: eligibility or safety check blocked the opportunity':`Age factor: ${t.fade.toFixed(2)} · Chance: ${t.chance.toFixed(1)}% · Roll: ${t.roll.toFixed(1)}`,
  `Usable grenades: ${t.count} · Retry wait: ${t.retryRemaining.toFixed(1)} s`,
  `Requested: ${t.requested?'yes':'no'} · Native accepted: ${t.accepted?'yes':'no'} · Projectile observed: ${t.released?'yes':'no'}`,
  ...(typeof t.nativeStarted==='boolean'?[`Native throw started: ${t.nativeStarted?'yes':'no'} · Phase: ${t.nativePhase||'unknown'} · Hands: ${t.hands||'unknown'}`]:[]),
  ...t.alternatives];
}
