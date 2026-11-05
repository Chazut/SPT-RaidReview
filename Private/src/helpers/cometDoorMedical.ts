import { parseCometDoorFake, cometDoorFakeSummary, DoorFakeContext } from './cometDoorFake'

export type DoorMedicalContext = DoorFakeContext & {
    kind: 'heal'|'stim'; styleRoll?:number; medicalPreference?:number; grenadeEligible:boolean; medicalEligible:string;
    medical: { item:string; bodyPart:string; resourceBefore?:number; resourceAfter?:number; resourceSpent?:number; consumptionObserved:boolean; consumptionEvidence:string;
        useCallbackCompleted:boolean; useCallbackSucceeded:boolean; nativeStopRequested:boolean; medicalHandoff:boolean; cooldownRestored:boolean }
}
const text=(v:unknown)=>typeof v==='string'?v:''
const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:undefined
export function parseCometDoorMedical(raw:any):DoorMedicalContext|null {
    const m=raw?.medical
    if(!m||Array.isArray(raw)||Array.isArray(m)||!['heal','stim'].includes(raw.kind)||m.kind!==raw.kind)return null
    const nativeStopRequested=raw.drawRequested===true&&raw.handsObserved===true&&raw.holsterRequested===true&&m.nativeStopRequested===true
    // A void StopUse call is evidence of a request, never fabricated selector acceptance.
    const common=parseCometDoorFake({...raw,holsterAccepted:raw.holsterAccepted===true||nativeStopRequested})
    if(!common)return null
    const before=num(m.resourceBefore),after=num(m.resourceAfter)
    const spent=num(m.resourceSpent)
    const consumed=m.consumptionObserved===true&&((before!=null&&after!=null&&after<before-.001)||(spent!=null&&spent>.001&&m.consumptionEvidence==='resource-decreased')||m.consumptionEvidence==='native-medical-item-consumed')
    if(common.state==='completed'&&(consumed||m.medicalHandoff===true))return null
    return {...common,grenade:'',guard:false,holsterAccepted:common.holsterRequested&&raw.holsterAccepted===true,kind:raw.kind,
        styleRoll:num(raw.styleRoll),medicalPreference:num(raw.medicalPreference),grenadeEligible:raw.grenadeEligible===true,medicalEligible:text(raw.medicalEligible),
        medical:{item:text(m.item),bodyPart:text(m.bodyPart),resourceBefore:before,resourceAfter:after,resourceSpent:spent,consumptionObserved:consumed,
            consumptionEvidence:consumed?text(m.consumptionEvidence):'not-observed',useCallbackCompleted:common.drawRequested&&m.useCallbackCompleted===true,
            useCallbackSucceeded:common.drawRequested&&m.useCallbackCompleted===true&&m.useCallbackSucceeded===true,nativeStopRequested,
            medicalHandoff:m.medicalHandoff===true,cooldownRestored:m.cooldownRestored===true}}
}
export function cometDoorMedicalSummary(t:DoorMedicalContext,names:Record<string,string>={}):string[]{
    const m=t.medical,f=(v?:number)=>v==null?'?':v.toFixed(1)
    const shared=cometDoorFakeSummary(t,names)
    return [`Medical feint (${t.kind==='heal'?'light heal':'stimulant'}): ${t.state} · ${t.reason.replace(/-/g,' ')}`,
        shared[1],shared[2],shared[3],shared[4],
        `Shared selection: medical preference ${f(t.medicalPreference)}% · Style roll ${f(t.styleRoll)} · Grenade ${t.grenadeEligible?'eligible':'unavailable'} · Medical ${t.medicalEligible||'unavailable'}`,
        `Item ${m.item||'?'} · Body part ${m.bodyPart||'?'} · Draw ${t.drawRequested?'requested':'not requested'} · Hands ${t.handsObserved?'medicine observed':'not confirmed'}`,
        `Draw callback ${t.callbackCompleted?(t.callbackSucceeded?'accepted':'failed'):'not received'} · Use callback ${m.useCallbackCompleted?'received (not proof of consumption)':'not received'}`,
        `Consumption: ${m.consumptionObserved?'observed':'not observed'} · ${m.consumptionEvidence.replace(/-/g,' ')} · Resource ${f(m.resourceBefore)} → ${f(m.resourceAfter)} · Observed spent ${f(m.resourceSpent)}`,
        `Weapon return: ${t.weaponReady?'ready observed':t.holsterAccepted?'accepted; not yet ready':m.nativeStopRequested?'native stop requested; readiness pending':t.holsterRequested?'requested; refused':'not requested'} · Attempts ${t.holsterAttempts??0}`,
        `Real medical priority: ${m.medicalHandoff?'handed back to SAIN':'no handoff recorded'} · Own cancellation cooldown ${m.cooldownRestored?'restored':'not changed'}`,
        `Recovery ${t.recoveryFailed?'failed':'no failure recorded'} · Elapsed ${f(t.elapsed)} s`,
        ...(t.interrupted?[`Interrupted: ${t.interrupted.replace(/-/g,' ')}`]:[]),`Perceived reaction: ${(t.reaction||'not observed').replace(/-/g,' ')}`,...t.alternatives,
        'Real native animations; no refunds or reversed healing. No claim that the opponent heard or believed the feint. Native behavior colors are preserved.']
}
