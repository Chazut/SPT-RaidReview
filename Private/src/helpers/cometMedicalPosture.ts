export type MedicalPostureContext = {
 state:string;reason:string;treatment:string;item:string;using:boolean;medicineHands:boolean;weaponReady:boolean;
 neutral:boolean;grounded:boolean;tilt:number;stableFor:number;resumeDelay:number;applied:boolean;validFor:number;alternatives:string[];
};
const text=(v:any)=>typeof v==='string'&&v.length<=512;
const num=(v:any,min:number,max:number)=>Number.isFinite(v)&&v>=min&&v<=max;
export function parseCometMedicalPosture(t:any):MedicalPostureContext|null {
 if(!t||Array.isArray(t)||!['protecting','waiting-weapon','centering','settling','resumed','ended'].includes(t.state)
 ||['reason','treatment','item'].some(k=>!text(t[k]))
 ||['using','medicineHands','weaponReady','neutral','grounded','applied'].some(k=>typeof t[k]!=='boolean')
 ||!num(t.validFor,0,1)||!num(t.resumeDelay,0,1)||!num(t.stableFor,0,10)||!num(t.tilt,-100,100)
 ||(!t.applied&&t.validFor!==0)||t.applied&&['resumed','ended'].includes(t.state)
 ||t.state==='protecting'&&!t.using&&!t.medicineHands
 ||['waiting-weapon','centering','settling','resumed'].includes(t.state)&&(t.using||t.medicineHands)
 ||t.state==='waiting-weapon'&&t.weaponReady
 ||t.state==='centering'&&(!t.weaponReady||t.neutral)
 ||['settling','resumed'].includes(t.state)&&(!t.weaponReady||!t.neutral)
 ||t.state==='resumed'&&t.stableFor+1e-6<t.resumeDelay
 ||!Array.isArray(t.alternatives)||t.alternatives.length>4||t.alternatives.some((a:any)=>!text(a)))return null;
 return t;
}
export function cometMedicalPostureSummary(t:MedicalPostureContext):string[]{return [
 `Posture: ${t.state.replace(/-/g,' ')} · ${t.reason.replace(/-/g,' ')}`,
 `Treatment: ${t.treatment || 'native medicine'}${t.item ? ' · Item: '+t.item : ''}`,
 `Medicine use flag: ${t.using?'active':'inactive'} · medicine still in hands: ${t.medicineHands?'yes':'no'}`,
 `Weapon ready: ${t.weaponReady?'yes':'no'} · lean centered: ${t.neutral?'yes':'no'} · observed tilt: ${t.tilt.toFixed(2)}`,
 `Stable weapon/posture: ${t.stableFor.toFixed(2)} / ${t.resumeDelay.toFixed(2)} s · ${t.grounded?'grounded':'airborne'}`,
 'Own hands and posture only; no enemy position used',
 ...t.alternatives
 ];}
