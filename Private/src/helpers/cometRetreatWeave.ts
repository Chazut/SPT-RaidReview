export type RetreatWeaveContext = {
    state:string; reason:string; action:string; target:string; context:string; source:string; jump:string; jumpOutcome:string;
    validFor:number; yaw:number; pitch:number; speed:number; observedYaw:number; observedPitch:number; contactAge:number; goalDistance:number;
    knownX:number; knownY:number; knownZ:number; x:number; y:number; z:number;
    switches:number; jumpRequests:number; acceptedJumps:number; takeoffs:number; landings:number;
    moveRequested:boolean; gazeRequested:boolean; grounded:boolean; landingRollSpent:boolean; alternatives:string[];
}
export function parseCometRetreatWeave(r:any):RetreatWeaveContext|null {
    if(!r||Array.isArray(r)||!['evading','native','ended'].includes(r.state)
        ||['reason','action','target','context','source','jump','jumpOutcome'].some(k=>typeof r[k]!=='string')||!r.target||!r.context
        ||!['','switch','landing'].includes(r.jump)||!['none','accepted-awaiting-takeoff','native-refused','airborne-observed','landing-observed','takeoff-not-observed'].includes(r.jumpOutcome)
        ||['validFor','yaw','pitch','speed','observedYaw','observedPitch','contactAge','goalDistance','knownX','knownY','knownZ','x','y','z'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
        ||['switches','jumpRequests','acceptedJumps','takeoffs','landings'].some(k=>!Number.isSafeInteger(r[k])||r[k]<0)
        ||['moveRequested','gazeRequested','grounded','landingRollSpent'].some(k=>typeof r[k]!=='boolean')
        ||r.validFor<0||r.validFor>.25||Math.abs(r.yaw)>45||r.pitch<0||r.pitch>65||r.speed<0||r.contactAge<0||r.goalDistance<0
        ||r.acceptedJumps>r.jumpRequests||r.takeoffs>r.acceptedJumps||r.landings>r.takeoffs
        ||r.state!=='evading'&&(r.validFor!==0||r.moveRequested||r.gazeRequested||r.yaw!==0||r.pitch!==0||r.jump!=='')
        ||r.state==='evading'&&(!['SeekCover','Retreat','RunAway'].includes(r.action)||!['personal-vision','personal-fire'].includes(r.source))
        ||r.validFor>0&&!r.moveRequested&&!r.gazeRequested&&!r.jump)return null;
    return {...r,alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((v:any)=>typeof v==='string').slice(0,8):[]};
}
export function cometRetreatWeaveSummary(t:RetreatWeaveContext):string[] {
    return [`Evasive retreat · ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        `Known threat: ${t.target} · ${t.source} · ${t.contactAge.toFixed(2)} s old`,
        `Requested turn: ${t.yaw.toFixed(0)}° · Head down: ${t.pitch.toFixed(0)}° · Movement/gaze applied: ${t.moveRequested?'yes':'no'}/${t.gazeRequested?'yes':'no'}`,
        `Observed turn: ${t.observedYaw.toFixed(1)}° · Observed pitch: ${t.observedPitch.toFixed(1)}° · Speed: ${t.speed.toFixed(2)} m/s`,
        `Cover: ${t.goalDistance.toFixed(1)} m · Turns: ${t.switches} · Grounded: ${t.grounded?'yes':'no'}`,
        `Jump: ${t.jump||'no new request'} · ${t.jumpOutcome.replace(/-/g,' ')} · Requests/accepted/takeoffs/landings: ${t.jumpRequests}/${t.acceptedJumps}/${t.takeoffs}/${t.landings}`,
        `Arrival roll: ${t.landingRollSpent?'spent':'available'} · Native speed and physics retained`,...t.alternatives];
}
