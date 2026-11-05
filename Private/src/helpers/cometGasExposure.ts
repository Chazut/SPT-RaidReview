export type GasExposureContext={state:string;reason:string;provider:string;cloud:string;protection:string;intensity:number;x:number;y:number;z:number;goalX:number;goalY:number;goalZ:number;validFor:number;clouds:number;inside:boolean;hasGoal:boolean;cough:boolean;alternatives:string[]};
const text=(v:any)=>typeof v==='string'&&v.length<=512;
export function parseCometGasExposure(t:any):GasExposureContext|null {
 if(!t||Array.isArray(t)||!['exposed','escaping','planning','yielded','retry','recovering','protected','ended'].includes(t.state)
 ||['reason','provider','cloud','protection'].some(k=>!text(t[k]))||!['None','Respirator','Full'].includes(t.protection)
 ||t.provider!=='Manimal-CSGas 2.0.0'||!Number.isFinite(t.intensity)||t.intensity<0||t.intensity>1
 ||['x','y','z','goalX','goalY','goalZ'].some(k=>!Number.isFinite(t[k])||Math.abs(t[k])>100000)
 ||!Number.isInteger(t.clouds)||t.clouds<0||t.clouds>128||['inside','hasGoal','cough'].some(k=>typeof t[k]!=='boolean')
 ||!Number.isFinite(t.validFor)||t.validFor<0||t.validFor>1||t.state==='ended'&&t.validFor!==0
 ||t.inside&&!t.cloud||t.hasGoal&&t.state==='ended'||t.cough&&(!t.inside||t.protection!=='None')
 ||!Array.isArray(t.alternatives)||t.alternatives.length>8||t.alternatives.some((a:any)=>!text(a)))return null;
 return t;
}
export function cometGasExposureSummary(t:GasExposureContext):string[]{return [
 `CS gas: ${t.state} · ${t.reason.replace(/-/g,' ')}`,
 `Provider: ${t.provider} · cloud: ${t.cloud||'no current exposure'} · active clouds: ${t.clouds}`,
 `Irritation: ${Math.round(t.intensity*100)}% · mask protection: ${t.protection} · ${t.inside?'inside gas':'outside gas'}`,
 ...(t.hasGoal?[`Escape destination: ${t.goalX.toFixed(1)}, ${t.goalY.toFixed(1)}, ${t.goalZ.toFixed(1)}`]:[]),
 ...(t.cough?['Cough requested']:[]),
 'No enemy contact is inferred from gas exposure. Explosives keep priority.',...t.alternatives];}
