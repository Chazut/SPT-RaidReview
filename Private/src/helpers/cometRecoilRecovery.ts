export type RecoilRecoveryContext = {
 state:string;reason:string;weapon:string;weaponClass:string;action:string;target:string;applied:boolean;
 multiplier:number;beforeHorizontal:number;beforeVertical:number;afterHorizontal:number;afterVertical:number;
 coefficient:number;step:number;elapsed:number;validFor:number;shots:number;steps:number;alternatives:string[];
}
export function parseCometRecoilRecovery(r:any):RecoilRecoveryContext|null {
 if(!r||Array.isArray(r)||!['started','recovering','settled','ended'].includes(r.state)
  ||['reason','weapon','weaponClass','action','target'].some(k=>typeof r[k]!=='string')
  ||!['marksmanRifle','sniperRifle'].includes(r.weaponClass)||!r.weapon||typeof r.applied!=='boolean'
  ||['multiplier','coefficient','step','elapsed','validFor'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)
  ||r.multiplier<=1||r.multiplier>3||r.step>.25||r.validFor>.75
  ||['beforeHorizontal','beforeVertical','afterHorizontal','afterVertical'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||Math.abs(r[k])>180)
  ||['shots','steps'].some(k=>!Number.isSafeInteger(r[k])||r[k]<0)||r.shots<1
  ||['settled','ended'].includes(r.state)&&r.validFor!==0
  ||['started','recovering'].includes(r.state)&&r.validFor<=0
  ||r.state==='started'&&(r.applied||r.step!==0||r.afterHorizontal!==r.beforeHorizontal||r.afterVertical!==r.beforeVertical)
  ||r.state==='ended'&&(r.applied||r.step!==0)
  ||r.state==='settled'&&(r.afterHorizontal!==0||r.afterVertical!==0)
  ||r.applied&&(r.step<=0||r.coefficient<=0||r.steps<1)
  ||['recovering','settled'].includes(r.state)&&(
      Math.abs(r.afterHorizontal)>Math.abs(r.beforeHorizontal)+1e-6||Math.abs(r.afterVertical)>Math.abs(r.beforeVertical)+1e-6
      ||r.afterHorizontal*r.beforeHorizontal<0||r.afterVertical*r.beforeVertical<0))return null;
 return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((s:any)=>typeof s==='string').slice(0,8):[]};
}
export function cometRecoilRecoverySummary(t:RecoilRecoveryContext):string[] {
 return [`${t.weaponClass==='marksmanRifle'?'DMR':'Sniper'} recovery x${t.multiplier.toFixed(1)} · ${t.state} · ${t.reason.replace(/-/g,' ')}`,
  `Weapon: ${t.weapon} · Known contact: ${t.target||'none (recovery does not choose targets)'}`,
  `Horizontal offset: ${t.beforeHorizontal.toFixed(3)}° → ${t.afterHorizontal.toFixed(3)}°`,
  `Vertical offset: ${t.beforeVertical.toFixed(3)}° → ${t.afterVertical.toFixed(3)}°`,
  `Last observed step: ${(t.step*1000).toFixed(1)} ms · ${t.applied?'Recovery applied':'No extra recovery in this observation'}`,
  `${t.shots} shot(s), ${t.steps} recovery step(s) in this episode. Samples are not every frame.`,
  'Initial recoil and fire rate stay native. This is not a confirmed hit.',...t.alternatives];
}
