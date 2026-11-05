export type FlashContinuityContext={state:string;reason:string;source:string;target:string;requestedDuration:number;remaining:number;strongRemaining:number;blindFireRemaining:number;validFor:number;hasRemembered:boolean;gasActive:boolean;x:number;y:number;z:number;alternatives:string[]};
const text=(v:any)=>typeof v==='string'&&v.length<=512;
export function parseCometFlashContinuity(t:any):FlashContinuityContext|null {
 if(!t||Array.isArray(t)||!['started','new-flash','extended','active','ended'].includes(t.state)
 ||!['native-flash','continuation'].includes(t.source)||['reason','target'].some(k=>!text(t[k]))
 ||['requestedDuration','remaining','strongRemaining','blindFireRemaining'].some(k=>!Number.isFinite(t[k])||t[k]<0||t[k]>86400)
 ||t.strongRemaining>t.remaining+.001||['x','y','z'].some(k=>!Number.isFinite(t[k])||Math.abs(t[k])>100000)
 ||['hasRemembered','gasActive'].some(k=>typeof t[k]!=='boolean')||t.hasRemembered&&!t.target
 ||!Number.isFinite(t.validFor)||t.validFor<0||t.validFor>1
 ||t.state==='ended'&&(t.validFor!==0||t.remaining!==0||t.strongRemaining!==0||t.hasRemembered)
 ||!Array.isArray(t.alternatives)||t.alternatives.length>8||t.alternatives.some((a:any)=>!text(a)))return null;
 return t;
}
export function cometFlashContinuitySummary(t:FlashContinuityContext):string[]{return [
 `Flash: ${t.state} · ${t.reason.replace(/-/g,' ')}`,
 `Source: ${t.source==='continuation'?'duration-only continuation':'real flash event'} · requested duration: ${t.requestedDuration.toFixed(1)} s`,
 `Remaining: ${t.remaining.toFixed(1)} s · stronger phase: ${t.strongRemaining.toFixed(1)} s · before blind fire allowed: ${t.blindFireRemaining.toFixed(1)} s`,
 t.hasRemembered?`Frozen personal visual memory: ${t.target} at ${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)}`:'No personally seen enemy position available',
 `Separate gas irritation: ${t.gasActive?'active':'inactive'}`,...t.alternatives];}
