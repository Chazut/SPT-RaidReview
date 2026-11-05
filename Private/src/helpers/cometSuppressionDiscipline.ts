export type SuppressionDisciplineContext = {
 state:string;reason:string;target:string;weapon:string;mode:string;source:string;action:string;supportPlan:string;
 episode:number;loaded:number;capacity:number;reserve:number;burstLimit:number;burstShots:number;actualShots:number;
 contactAge:number;elapsed:number;remaining:number;pauseRemaining:number;validFor:number;
 knownX:number;knownY:number;knownZ:number;aimX:number;aimY:number;aimZ:number;
 requested:boolean;accepted:boolean;clear:boolean;allySafe:boolean;aligned:boolean;alternatives:string[];
}
export function parseCometSuppressionDiscipline(r:any):SuppressionDisciplineContext|null {
 const inactive=r?.state==='ended'||r?.state==='rejected';
 if(!r||Array.isArray(r)||!['waiting','firing','paused','ended','rejected'].includes(r.state)
  ||['reason','target','weapon','mode','source','action','supportPlan'].some(k=>typeof r[k]!=='string')
  ||['episode','loaded','capacity','reserve','burstLimit','burstShots','actualShots'].some(k=>!Number.isSafeInteger(r[k])||r[k]<0)
  ||r.burstLimit<1||r.burstLimit>15||r.burstShots>r.actualShots||r.reserve>r.capacity
  ||['contactAge','elapsed','remaining','pauseRemaining','validFor'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)
  ||r.validFor>.3||r.remaining>15||r.pauseRemaining>10.4
  ||['knownX','knownY','knownZ','aimX','aimY','aimZ'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
  ||['requested','accepted','clear','allySafe','aligned'].some(k=>typeof r[k]!=='boolean')
  ||r.accepted&&!r.requested||r.burstShots>0&&!r.requested
  ||inactive&&r.validFor!==0||!inactive&&(r.validFor<=0||r.episode<1||!r.weapon||!r.target||r.loaded>r.capacity
    ||!['personal-vision','personal-incoming'].includes(r.source))
  ||r.state==='firing'&&(!r.clear||!r.allySafe||!r.aligned||r.pauseRemaining>0)
  ||r.state==='paused'&&(r.pauseRemaining<=0||r.burstShots<r.burstLimit))return null;
 return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometSuppressionDisciplineSummary(t:SuppressionDisciplineContext):string[] {
 const yes=(v:boolean)=>v?'yes':'no';
 return [`Suppression: ${t.state==='firing'?'permitted':t.state} · ${t.reason.replace(/-/g,' ')}`,
  `Actual shots: ${t.burstShots}/${t.burstLimit} this burst · ${t.actualShots} this sequence`,
  `Pause: ${t.pauseRemaining.toFixed(1)} s · Sequence remaining: ${t.remaining.toFixed(1)} s`,
  `Magazine: ${t.loaded}/${t.capacity} · Reserve: ${t.reserve} rounds · Weapon: ${t.weapon||'none'} (${t.mode||'unknown'})`,
  `Known contact: ${t.target||'none'} · ${t.source||'none'} · ${t.contactAge.toFixed(1)} s old`,
  `Remembered point: ${[t.knownX,t.knownY,t.knownZ].map(x=>x.toFixed(1)).join(', ')} · Frozen aim: ${[t.aimX,t.aimY,t.aimZ].map(x=>x.toFixed(1)).join(', ')}`,
  `Clear angle / ally safe / aligned: ${[t.clear,t.allySafe,t.aligned].map(yes).join(' / ')}`,
  `Current burst request / accepted: ${yes(t.requested)} / ${yes(t.accepted)}. Permission alone is not a shot.`,
  ...(t.burstShots>t.burstLimit?['An extra native shot was observed after the burst limit; suppression was stopped.']:[]),...t.alternatives];
}
