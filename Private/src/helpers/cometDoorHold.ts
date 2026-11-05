export type DoorHoldContext = {
    outcome:string; reason:string; door:string; currentAngle:boolean; currentProtection:number; candidateProtection:number;
    pathLength:number; estimatedTravel:number; availableTime:number; usefulWait:number; minimumUsefulWait:number; validFor:number; alternatives:string[]
}
export function parseCometDoorHold(r:any):DoorHoldContext|null {
    if(!r||Array.isArray(r)||!['stay','move','native-hold','reconsider'].includes(r.outcome))return null
    const keys=['currentProtection','candidateProtection','pathLength','estimatedTravel','availableTime','usefulWait','minimumUsefulWait','validFor']
    if(keys.some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)||r.currentProtection>1||r.candidateProtection>1)return null
    if(r.outcome==='stay'&&(r.currentAngle!==true||r.currentProtection<2/3||r.estimatedTravel!==0))return null
    if(r.outcome==='move'&&(r.candidateProtection<2/3||r.candidateProtection+1e-6<r.currentProtection||r.usefulWait<=0||r.usefulWait+1e-6<r.minimumUsefulWait||r.estimatedTravel+r.usefulWait>r.availableTime+1e-6))return null
    return {...Object.fromEntries(keys.map(k=>[k,r[k]])),outcome:r.outcome,reason:typeof r.reason==='string'?r.reason:'',door:typeof r.door==='string'?r.door:'',currentAngle:r.currentAngle===true,
        alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((x:any)=>typeof x==='string').slice(0,12):[]} as DoorHoldContext
}
export function cometDoorHoldSummary(t:DoorHoldContext):string[]{
    const choices:Record<string,string>={stay:'Keep the current doorway angle; no move requested',move:'Reposition selected; arrival not confirmed here','native-hold':'Keep native Hold; no suitable doorway move',reconsider:'Reconsider another action'}
    return [choices[t.outcome],t.reason.replace(/-/g,' '),`Door: ${t.door||'none selected'}`,
        `Protection samples: current ${(t.currentProtection*100).toFixed(0)}% / candidate ${(t.candidateProtection*100).toFixed(0)}% (against remembered contact)`,
        `At selection: route ${t.pathLength.toFixed(1)} m · estimated travel ${t.estimatedTravel.toFixed(1)} s · available ${t.availableTime.toFixed(1)} s`,
        `Estimated useful wait ${t.usefulWait.toFixed(1)} s · minimum after moving ${t.minimumUsefulWait.toFixed(1)} s`,
        ...t.alternatives,'Travel and protection are estimates, not proof of a successful ambush.']
}
