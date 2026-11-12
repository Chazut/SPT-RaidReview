export type TradeContext={death:string;mate:string;mateName:string;evidence:string;confidence:string;choice:string;status:string;reason:string;confirmed:boolean;deathAge:number;delay:number;ammo:number;remaining:number;roll:number;chance:number}
export type ManeuverContext={plan:string;state:string;role:string;reason:string;support:string;supportName:string;fireState:string;supportReady:boolean;confirmed:boolean;remaining:number;chance:number;roll:number;shots:number;members:string[]}

export type EntranceContext={state:string;passage:string;primary:string;supportStatus:string;entryReason:string;watchDuration:number;watchRemaining:number;extended:boolean;rolled:boolean;entryRoll:number;entryChance:number;ammo:number;crossed:boolean;openRequested:boolean;openObserved:boolean;passageX:number;passageY:number;passageZ:number}

export type CoverMateContext={mate:string;mateName:string;operation:string;treatment:string;sector:string;status:string;reason:string;busy:boolean;weaponReady:boolean;confirmed:boolean;stalled:boolean;operationAge:number;remaining:number;separation:number;protectors:number}

export type StormContext={plan:string;state:string;status:string;reason:string;observer:string;cue:string;score:number;threshold:number;roll:number;chance:number;ammo:number;remaining:number;evidenceAge:number;departure:number;eta:number;ready:number;required:number;confirmed:boolean;evidence:string[];members:string[]}

export type CrossfireContext={outcome?:string;sightPose?:string;searchPass?:string;revalidations?:number;revalidation?:string;storm?:StormContext|null;trade?:TradeContext|null;coverMate?:CoverMateContext|null;maneuver?:ManeuverContext|null;entrance?:EntranceContext|null;state:string;reason:string;execution:string;contact:string;source:string;support:string;supportName:string;episode:number;applied:boolean;reserved:boolean;validFor:number;contactAge:number;remaining:number;angle:number;pathLength:number;roll:number;chance:number;x:number;y:number;z:number;goalX:number|null;goalY:number|null;goalZ:number|null;candidates:number;alternatives:string[]}

const text=(v:any)=>typeof v==='string'&&v.length<=512

const num=(v:any,min:number,max:number)=>Number.isFinite(v)&&v>=min&&v<=max

function validManeuver(m:any):boolean{

 return !!m&&!Array.isArray(m)&&['preparing','active','converging','ended'].includes(m.state)&&['flank','support','rear'].includes(m.role)

 &&['plan','reason','support','supportName','fireState'].every(k=>text(m[k]))&&m.plan.length>0

 &&['supportReady','confirmed'].every(k=>typeof m[k]==='boolean')

 &&num(m.remaining,0,40)&&num(m.chance,0,100)&&num(m.roll,0,100)&&Number.isSafeInteger(m.shots)&&num(m.shots,0,100000)

 &&Array.isArray(m.members)&&m.members.length>=2&&m.members.length<=16&&m.members.every(text)

}

function validEntrance(e:any):boolean{

 return !!e&&!Array.isArray(e)&&['planning','moving','watching','preparing-entry','opening','entering','ended'].includes(e.state)

 &&['passage','primary','supportStatus','entryReason'].every(k=>text(e[k]))

 &&['extended','rolled','crossed','openRequested','openObserved'].every(k=>typeof e[k]==='boolean')

 &&num(e.watchDuration,1,30)&&num(e.watchRemaining,0,40)&&num(e.entryRoll,0,100)&&num(e.entryChance,0,100)&&num(e.ammo,0,100)

 &&['passageX','passageY','passageZ'].every(k=>num(e[k],-100000,100000))

 &&(!e.crossed||e.state==='entering'||e.state==='ended')

}

function validCoverMate(c:any):boolean{
 return !!c&&!Array.isArray(c)&&['selected','moving','awaiting facing','covering','ended'].includes(c.status)
 &&['mate','mateName','operation','treatment','sector','reason'].every(k=>text(c[k]))&&c.mate.length>0&&c.operation.length>0&&c.sector.length>0
 &&['Reload','Medicine','Surgery'].includes(c.treatment)&&['busy','weaponReady','confirmed','stalled'].every(k=>typeof c[k]==='boolean')
 &&num(c.operationAge,0,86400)&&num(c.remaining,0,90)&&num(c.separation,0,100000)&&Number.isInteger(c.protectors)&&num(c.protectors,0,3)
 &&(!c.confirmed||c.status==='covering')&&(!c.stalled||c.status==='ended')
}

function validTrade(d:any):boolean{
 return !!d&&!Array.isArray(d)&&['death','mate','mateName','evidence','reason'].every(k=>text(d[k]))&&d.death.length>0&&d.mate.length>0
 &&['sector only','witnessed attacker association'].includes(d.confidence)&&['push','watch'].includes(d.choice)
 &&['selected','moving','awaiting facing','watching','ended'].includes(d.status)&&typeof d.confirmed==='boolean'
 &&num(d.deathAge,0,86400)&&num(d.delay,0,5)&&num(d.ammo,0,100)&&num(d.remaining,0,30)&&num(d.roll,0,100)&&num(d.chance,0,100)
 &&(!d.confirmed||d.status==='watching')&&(d.choice!=='push'||d.confidence==='witnessed attacker association')
}

function validStorm(s:any):boolean{
 return !!s&&!Array.isArray(s)&&['preparing','active','ended'].includes(s.state)&&['planning','ready','moving','ended','declined'].includes(s.status)
 &&['plan','reason','observer','cue'].every(k=>text(s[k]))&&s.plan.length>0&&s.observer.length>0
 &&num(s.score,0,1)&&num(s.threshold,.1,1)&&num(s.roll,0,100)&&num(s.chance,0,100)&&num(s.ammo,0,100)
 &&num(s.remaining,0,23)&&num(s.evidenceAge,0,86400)&&num(s.departure,-1,86400)&&num(s.eta,0,100000)
 &&Number.isInteger(s.ready)&&num(s.ready,0,16)&&Number.isInteger(s.required)&&num(s.required,2,16)&&typeof s.confirmed==='boolean'
 &&Array.isArray(s.evidence)&&s.evidence.length<=8&&s.evidence.every(text)
 &&Array.isArray(s.members)&&s.members.length>=2&&s.members.length<=16&&s.members.every(text)
 &&(!s.confirmed||s.state==='active'&&s.status==='moving'&&s.departure>=0)
}

export function parseCometCrossfire(t:any):CrossfireContext|null{

 if(!t||Array.isArray(t)||!['planning','ready','moving','holding','ended'].includes(t.state)

 ||['reason','execution','contact','source','support','supportName'].some(k=>!text(t[k]))

 ||['applied','reserved'].some(k=>typeof t[k]!=='boolean')||!Number.isSafeInteger(t.episode)||t.episode<1

 ||t.storm!=null&&(!validStorm(t.storm)||t.trade!=null||t.coverMate!=null||t.maneuver!=null||t.entrance!=null)
 ||t.applied&&t.storm&&(!t.storm.confirmed||t.state!=='moving')
 ||t.trade!=null&&(!validTrade(t.trade)||t.coverMate!=null||t.maneuver!=null||t.entrance!=null)
 ||t.applied&&t.trade&&(t.state==='moving'?t.trade.status!=='moving':t.trade.status!=='watching'||!t.trade.confirmed)
 ||t.maneuver!=null&&!validManeuver(t.maneuver)

 ||t.applied&&t.maneuver&&(!t.maneuver.confirmed||t.maneuver.state==='ended')

 ||t.entrance!=null&&!validEntrance(t.entrance)
 ||t.coverMate!=null&&(!validCoverMate(t.coverMate)||t.entrance!=null||t.maneuver!=null)
 ||t.applied&&t.coverMate&&(t.state==='moving'?t.coverMate.status!=='moving':t.coverMate.status!=='covering'||!t.coverMate.confirmed)

 ||['outcome','sightPose','searchPass','revalidation'].some(k=>t[k]!=null&&!text(t[k]))
 ||t.revalidations!=null&&(!Number.isSafeInteger(t.revalidations)||!num(t.revalidations,0,100000))
 ||!Number.isInteger(t.candidates)||!num(t.candidates,0,t.entrance?48:72)||!num(t.validFor,0,1)

 ||!num(t.contactAge,0,86400)||!num(t.remaining,0,t.coverMate?90:t.entrance?48:40)||!num(t.angle,0,180)||!num(t.pathLength,0,60)

 ||!num(t.roll,0,100)||!num(t.chance,0,100)||['x','y','z'].some(k=>!num(t[k],-100000,100000))

 ||!([t.goalX,t.goalY,t.goalZ].every(v=>v==null)||[t.goalX,t.goalY,t.goalZ].every(v=>num(v,-100000,100000)))

 ||!Array.isArray(t.alternatives)||t.alternatives.length>8||t.alternatives.some((v:any)=>!text(v))

 ||t.applied&&(!['moving','holding'].includes(t.state)||!t.reserved||t.validFor<=0||t.goalX==null)

 ||t.applied&&t.entrance&&(t.state==='moving'?!['moving','entering'].includes(t.entrance.state):!['watching','preparing-entry','opening'].includes(t.entrance.state))

 ||!t.applied&&t.validFor!==0||t.state==='ended'&&t.reserved)return null

 return t

}

export const cometCrossfireTitle=(t:CrossfireContext)=>t.storm?'Coordinated squad assault - S06':t.trade?'Teammate death reaction - S05':t.coverMate?'Cover a busy teammate - S04':t.maneuver?'Squad support and flanking - S03':t.entrance?'Secondary entrance - S02':'Squad crossfire angles - S01'

export const cometCrossfireDecision=(t:CrossfireContext)=>'COMET:Crossfire'+(t.storm?'StormMoving':t.trade?'Trade'+(t.state==='moving'?(t.trade.choice==='push'?'Pushing':'Moving'):'Watching'):t.coverMate?'CoverMate'+(t.state==='moving'?'Moving':'Holding'):t.maneuver?'Maneuver'+(t.maneuver.role==='rear'?'Rear':t.maneuver.role==='support'?(t.maneuver.fireState==='observed suppression fire'?'Suppressing':'Supporting'):t.state==='moving'?'Moving':'Holding'):t.entrance?(t.entrance.state==='entering'?'EntranceEntering':t.state==='moving'?'EntranceMoving':'EntranceWatching'):t.state[0].toUpperCase()+t.state.slice(1))

export function cometCrossfireSummary(t:CrossfireContext):string[]{return[

 ...(t.storm?[
 `Plan ${t.storm.plan}: ${t.storm.state} - ${t.storm.status} - ${t.storm.reason.replace(/-/g,' ')}`,
 `Observed weakness: ${t.storm.score.toFixed(2)} / ${t.storm.threshold.toFixed(2)} required - observer ${t.storm.observer}`,
 ...t.storm.evidence.map(e=>'Evidence: '+e),
 `Participation: ${t.storm.roll.toFixed(1)} / ${t.storm.chance.toFixed(0)}% - loaded magazine ${t.storm.ammo.toFixed(0)}%`,
 `Ready attackers: ${t.storm.ready} - minimum to start: ${t.storm.required} - ${t.storm.confirmed?'native movement confirmed':'movement not confirmed'}`,
 `Opening: ${t.storm.cue||'observed equipment'} - evidence ${t.storm.evidenceAge.toFixed(1)} s old - estimated travel ${t.storm.eta.toFixed(1)} s`,
 `Departure: ${t.storm.departure>=0?t.storm.departure.toFixed(2)+' s':'not started'}`,
 ...t.storm.members.map(m=>'Squadmate: '+m)
 ]:[]),
 ...(t.trade?[
 `Lost teammate: ${t.trade.mateName||t.trade.mate} · ${t.trade.deathAge.toFixed(1)} s ago · ${t.trade.evidence}`,
 `Reaction: ${t.trade.choice} · ${t.trade.status} · ${t.trade.reason.replace(/-/g,' ')}`,
 `Association: ${t.trade.confidence} · reaction delay ${t.trade.delay.toFixed(2)} s`,
 `Push roll: ${t.trade.roll.toFixed(1)} / ${t.trade.chance.toFixed(0)}% · loaded magazine ${t.trade.ammo.toFixed(0)}%`,
 `Execution: ${t.trade.confirmed?'facing confirmed':'not facing yet'} · death ${t.trade.death}`
 ]:[]),
 ...(t.coverMate?[
 `Teammate: ${t.coverMate.mateName||t.coverMate.mate} · ${t.coverMate.treatment} · ${t.coverMate.operationAge.toFixed(1)} s observed`,
 `Coverage: ${t.coverMate.status} · ${t.coverMate.confirmed?'facing confirmed':'not confirmed'} · ${t.coverMate.reason.replace(/-/g,' ')}`,
 `Operation: ${t.coverMate.operation} · ${t.coverMate.busy?'busy':'finishing'} · weapon ${t.coverMate.weaponReady?'ready':'not ready'}${t.coverMate.stalled?' · operation stalled':''}`,
 `Sector: ${t.coverMate.sector} · ${t.coverMate.protectors} protectors · separation ${t.coverMate.separation.toFixed(1)} m`
 ]:[]),
 ...(t.maneuver?[`Plan ${t.maneuver.plan}: ${t.maneuver.state} - ${t.maneuver.remaining.toFixed(1)} s remaining`,

 `Role: ${t.maneuver.role} - ${t.maneuver.confirmed?'confirmed':'awaiting execution'} - ${t.maneuver.reason.replace(/-/g,' ')}`,

 `Support: ${t.maneuver.supportName||t.maneuver.support} - ${t.maneuver.supportReady?'ready':'not confirmed'}`,

 `Fire: ${t.maneuver.fireState} - ${t.maneuver.shots} actual shots`,

 `Squad plan roll: ${t.maneuver.roll.toFixed(1)} / ${t.maneuver.chance.toFixed(0)}%`,

 ...t.maneuver.members.map(m=>'Squadmate: '+m)]:[]),

 `${t.storm?'Squad assault':t.trade?'Teammate death reaction':t.coverMate?'Teammate cover':t.entrance?'Secondary entrance':'Crossfire'}: ${t.entrance?.state||t.state} · ${t.reason.replace(/-/g,' ')}`,

 `Execution: ${t.execution} · episode ${t.episode} · ${t.remaining.toFixed(1)} s remaining`,

 ...(!t.coverMate&&!t.trade&&!t.storm?[`Supporting teammate: ${t.supportName || t.support || 'none'} · independent choice ${t.roll.toFixed(1)} / ${t.chance.toFixed(0)}%`]:[]),

 `Known contact: ${t.contact || 'none'} · ${t.source || 'no source'} · ${t.contactAge.toFixed(1)} s old · (${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)})`,

 `Angle ${t.angle.toFixed(0)}° · route ${t.pathLength.toFixed(1)} m · ${t.candidates} candidates checked`,

 ...(t.outcome?[`Outcome: ${t.outcome.replace(/-/g,' ')} (positioning result, not a confirmed hit)`]:[]),
 ...(t.sightPose?[`Firing position: ${t.sightPose.replace(/-/g,' ')}`]:[]),
 ...(t.searchPass?[`Search: ${t.searchPass.replace(/-/g,' ')}`]:[]),
 ...(t.revalidations?[`Context rechecks: ${t.revalidations} · ${(t.revalidation||'').replace(/-/g,' ')}`]:[]),

 t.goalX!=null&&t.goalY!=null&&t.goalZ!=null?`Position (${t.goalX.toFixed(1)}, ${t.goalY.toFixed(1)}, ${t.goalZ.toFixed(1)}) · ${t.reserved?'reserved':'released'}`:'No position selected',

 ...(t.entrance?[

 `Primary access: ${t.entrance.primary||'not found'} · secondary: ${t.entrance.passage||'not found'}`,

 `Partner: ${t.entrance.supportStatus} · loaded ammunition ${t.entrance.ammo.toFixed(0)}%`,

 `Watch: ${t.entrance.watchDuration.toFixed(1)} s · ${t.entrance.watchRemaining.toFixed(1)} s remaining · extension ${t.entrance.extended?'used':'not used'}`,

 `Entry: ${t.entrance.entryReason} · ${t.entrance.rolled?`roll ${t.entrance.entryRoll.toFixed(1)} / ${t.entrance.entryChance.toFixed(0)}%`:'not rolled yet'}`,

 `Door opening: ${t.entrance.openRequested?'requested':'not requested'} / ${t.entrance.openObserved?'open observed':'not observed'} · threshold ${t.entrance.crossed?'crossed':'not crossed'}`

 ]:[]),

 ...t.alternatives.map(a=>'Rejected alternative: '+a)

]}

export function squadTacticTitle(c: CrossfireContext): string {
    return c.storm ? 'Rush a vulnerable enemy' : c.maneuver ? 'Support and flanking'
        : c.coverMate ? 'Cover a busy teammate' : c.trade ? 'React to a teammate going down'
        : c.entrance ? 'Use another entrance' : 'Create a crossfire'
}
export function squadRole(c: CrossfireContext): string {
    if (c.maneuver) return c.maneuver.role === 'support' ? 'Support' : c.maneuver.role === 'rear' ? 'Rear guard' : 'Flank'
    if (c.storm) return 'Assault'
    if (c.coverMate) return 'Cover teammate'
    if (c.trade) return c.trade.choice === 'push' ? 'Push' : 'Watch angle'
    if (c.entrance) return c.entrance.state === 'entering' ? 'Enter' : c.state === 'moving' ? 'Reposition' : 'Watch entrance'
    return c.state === 'holding' ? 'Hold angle' : 'Reposition'
}
export function squadEventTitle(c: CrossfireContext): string {
    return `${squadTacticTitle(c)}: ${squadRole(c).toLowerCase()}`
}
