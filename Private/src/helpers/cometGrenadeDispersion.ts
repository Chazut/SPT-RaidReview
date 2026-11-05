export type GrenadeDispersionContext={state:string;reason:string;squad:string;peer:string;token:number;peers:number;x:number;y:number;z:number;
 spacing:number;memberRange:number;nearest:number;leaseRemaining:number;validFor:number;alternatives:string[]};
export function parseCometGrenadeDispersion(t:any):GrenadeDispersionContext|null {
 if(!t||Array.isArray(t)||!['reserved','shared','ended'].includes(t.state)
  ||['reason','squad','peer'].some(k=>typeof t[k]!=='string'||t[k].length>500)||!t.squad
  ||['token','peers','x','y','z','spacing','memberRange','nearest','leaseRemaining','validFor'].some(k=>typeof t[k]!=='number'||!Number.isFinite(t[k]))
  ||!Number.isSafeInteger(t.token)||t.token<=0||!Number.isInteger(t.peers)||t.peers<0||t.peers>32
  ||t.spacing<1||t.spacing>8||t.memberRange<5||t.memberRange>60||(t.nearest<0&&t.nearest!==-1)
  ||t.leaseRemaining<0||t.leaseRemaining>1.001||t.validFor<0||t.validFor>.5
  ||t.state==='ended'&&(t.leaseRemaining!==0||t.validFor!==0)
  ||t.state==='shared'&&(!t.peer||t.nearest<0||t.nearest>=t.spacing||t.peers<1)
  ||!Array.isArray(t.alternatives)||t.alternatives.length>8||t.alternatives.some((s:any)=>typeof s!=='string'||s.length>500))return null;
 return t;
}
export function cometGrenadeDispersionSummary(t:GrenadeDispersionContext):string[] {
 return [`Squad dispersion: ${t.state} · ${t.reason.replace(/-/g,' ')}`,
  `Safe destination: ${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)} · preferred spacing ${t.spacing.toFixed(1)} m`,
  `${t.peers} nearby active reservation(s) · coordination range ${t.memberRange.toFixed(1)} m`,
  t.nearest>=0?`Nearest reserved destination: ${t.nearest.toFixed(1)} m · teammate ${t.peer}`:'No competing destination on this floor',
  `Reservation #${t.token} · ${t.leaseRemaining.toFixed(2)} s remaining at this event`,
  ...(t.state==='shared'?['Shared safe exit: no separate safe point found within this search budget; no waiting.']:[]),
  ...t.alternatives];
}
