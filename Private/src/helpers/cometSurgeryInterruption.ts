export type SurgeryInterruptionContext = {
 state:string;reason:string;item:string;part:string;requested:boolean;nativeCancelled:boolean;
 handsReleased:boolean;weaponReady:boolean;completed:boolean;applied:boolean;validFor:number;retryRemaining:number;
 evidence:null|{kind:string;contact:string;age:number;distance:number;x:number;y:number;z:number};alternatives:string[];
};
const text=(v:any)=>typeof v==='string'&&v.length<=512;
const num=(v:any,min:number,max:number)=>Number.isFinite(v)&&v>=min&&v<=max;
export function parseCometSurgeryInterruption(t:any):SurgeryInterruptionContext|null {
 if(!t||Array.isArray(t)||!['monitoring','cancel-requested','hands-released','weapon-ready','ended'].includes(t.state)
 ||['reason','item','part'].some(k=>!text(t[k]))||!t.item||!t.part
 ||['requested','nativeCancelled','handsReleased','weaponReady','completed','applied'].some(k=>typeof t[k]!=='boolean')
 ||!num(t.validFor,0,1)||!num(t.retryRemaining,0,60)||(!t.applied&&t.validFor!==0)
 ||t.applied&&['ended','weapon-ready'].includes(t.state)||t.weaponReady&&!t.handsReleased
 ||['cancel-requested','hands-released','weapon-ready'].includes(t.state)&&!t.requested
 ||t.state==='hands-released'&&!t.handsReleased||t.state==='weapon-ready'&&!t.weaponReady
 ||t.state==='monitoring'&&t.requested
 ||!Array.isArray(t.alternatives)||t.alternatives.length>4||t.alternatives.some((a:any)=>!text(a)))return null;
 const e=t.evidence;
 if(e!==null&&(!e||Array.isArray(e)||!['visible','known','footstep'].includes(e.kind)||!text(e.contact)||!num(e.age,0,100000)||!num(e.distance,0,100000)||['x','y','z'].some(k=>!num(e[k],-100000,100000))))return null;
 return t;
}
export function cometSurgeryInterruptionSummary(t:SurgeryInterruptionContext):string[]{return [
 `Surgery: ${t.state.replace(/-/g,' ')} · ${t.reason.replace(/-/g,' ')}`,
 `Item: ${t.item} · ${t.part} · limb restored: ${t.completed?'observed':'not observed'}`,
 `Stop requested: ${t.requested?'yes':'no'} · native cancellation flag: ${t.nativeCancelled?'observed':'not observed'}`,
 `Medicine hands released: ${t.handsReleased?'yes':'no'} · weapon ready: ${t.weaponReady?'observed':'not observed'}`,
 t.evidence?`Personal ${t.evidence.kind} evidence: ${t.evidence.contact||'heard footsteps'} · ${t.evidence.distance.toFixed(1)} m · ${t.evidence.age.toFixed(1)} s old · position ${t.evidence.x.toFixed(1)}, ${t.evidence.y.toFixed(1)}, ${t.evidence.z.toFixed(1)}`:'No position disclosed; own injury, detected danger or operation status only',
 `Surgery retry delay remaining: ${t.retryRemaining.toFixed(1)} s; H01 safety checks still apply`,
 ...t.alternatives
 ];}
