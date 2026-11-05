export type PostCombatContext = {
 state:string;reason:string;episode:number;applied:boolean;validFor:number;elapsed:number;remaining:number;watchRemaining:number;
 ammoPercent:number;medicalUseful:boolean;medicalBusy:boolean;advanceChance:number;advanceRoll:number;advanceSelected:boolean;
 contact:string;contactAge:number;x:number|null;y:number|null;z:number|null;execution:string;alternatives:string[];
};
const text=(v:any)=>typeof v==='string'&&v.length<=512;
const num=(v:any,min:number,max:number)=>Number.isFinite(v)&&v>=min&&v<=max;
export function parseCometPostCombat(t:any):PostCombatContext|null {
 if(!t||Array.isArray(t)||!['cover','medical','reload','hands','watch','regroup','check','ended'].includes(t.state)
 ||['reason','contact','execution'].some(k=>!text(t[k]))
 ||['applied','medicalUseful','medicalBusy','advanceSelected'].some(k=>typeof t[k]!=='boolean')
 ||!Number.isSafeInteger(t.episode)||t.episode<1||!num(t.validFor,0,1)
 ||['elapsed','remaining','watchRemaining','contactAge'].some(k=>!num(t[k],0,86400))
 ||['ammoPercent','advanceChance','advanceRoll'].some(k=>!num(t[k],0,100))
 ||(!t.applied&&t.validFor!==0)||t.applied&&(t.state==='ended'||t.validFor===0)
 ||!([t.x,t.y,t.z].every(v=>v==null)||[t.x,t.y,t.z].every(v=>num(v,-100000,100000)))
 ||!Array.isArray(t.alternatives)||t.alternatives.length>4||t.alternatives.some((a:any)=>!text(a)))return null;
 return t;
}
export function cometPostCombatSummary(t:PostCombatContext):string[]{return [
 `Recovery: ${t.state} · ${t.reason.replace(/-/g,' ')}`,
 `Execution: ${t.execution} · episode ${t.episode}`,
 `Elapsed ${t.elapsed.toFixed(1)} s · budget remaining ${t.remaining.toFixed(1)} s · watch remaining ${t.watchRemaining.toFixed(1)} s`,
 `Magazine: ${t.ammoPercent.toFixed(0)}% · useful treatment: ${t.medicalUseful?'yes':'no'} · medicine active: ${t.medicalBusy?'yes':'no'}`,
 `Check last known position: ${t.advanceSelected?'selected':'not selected'} · chance ${t.advanceChance.toFixed(0)}% · roll ${t.advanceRoll.toFixed(1)}`,
 t.x!=null&&t.y!=null&&t.z!=null?`Remembered contact: ${t.contact || 'unknown'} · ${t.contactAge.toFixed(1)} s old · (${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)})`:'No remembered contact position',
 ...t.alternatives
 ];}
