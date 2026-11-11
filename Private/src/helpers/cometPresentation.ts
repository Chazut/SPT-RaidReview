import { CometMapEvent, CometMapRecord, cometMapState, cometReason } from './cometMap'
import { formatDecisionLabel, getDecisionSource } from './botBehavior'
import { squadEventTitle, CrossfireContext } from './cometCrossfire'
import { cometTacticalDeviceLabel, TacticalDevicesContext } from './cometTacticalDevices'
import { cometFeatureLabel } from './cometFeatureLabels'
import { observedMotionLabel } from './cometJournal'

export type CometMode = 'simple' | 'debug'
export type CometSymbol = 'move' | 'hold' | 'fire' | 'reload' | 'medical' | 'grenade' | 'door' | 'look' | 'light' | 'voice' | 'quiet'
type Context = Record<string, unknown>
type Point = { x: number; y: number; z: number }
type Rule = { key: string; index: string; title: string; symbol: CometSymbol; observed: (c: Context) => boolean; destination?: (c: Context) => Point | null }
const yes = (...keys: string[]) => (c: Context) => keys.some(k => c[k] === true)
const rule = (key: string, index: string, title: string, symbol: CometSymbol, observed: Rule['observed'], destination?: Rule['destination']): Rule => ({ key, index, title, symbol, observed, destination })

// Some contexts are recorded on a shared decision event. Name the context itself,
// not the enclosing event (notably the shared context for several squad tactics).
const activityFeatures: Record<string, string> = {
    quiet:'P02', silentSearch:'P08',
    postCombat:'H04', medicalChoice:'H01', medicalPosture:'H03', surgeryInterruption:'H02',
    reloadTiming:'W01', quickReload:'W04', pistolSwap:'W02', weaponReturn:'W03', weaponRange:'W05', handsRecovery:'W10',
    grenadeJudgment:'G01', grenadeReaction:'G05', ownGrenadeSafety:'G04', gasExposure:'G08',
    doorApproach:'D01', doorJumpPeek:'D02', doorRunBy:'D03', doorStepPeek:'D04', doorFakeGrenade:'D05',
    doorFakeMedical:'D06', doorEntry:'D15', doorRoomClear:'D08', doorAmbush:'D09', doorSupport:'D11', doorEmergency:'D13',
    doorMotion:'C04', doorClosing:'C05', combatStep:'M01', firePause:'M02', cornerPeek:'M03', combatLean:'M04',
    cornerChase:'M05', cornerPrefire:'M06', angleWatch:'M07', holdAngle:'M08', coverTravel:'M09', adsTravel:'M10',
    retreatWeave:'M11', tacticalJump:'M12', outdoorRelocation:'M13', coverFeint:'M14', fireLane:'S07', squadFire:'S08',
    suppressionDiscipline:'W07', lightDiscipline:'L01', tacticalDevices:'L02', restLights:'L03', squadVoice:'S09', readyStance:'H05',
}
function activityFeature(key: string, c: Context): string {
    if (key === 'crossfire') return c.storm ? 'S06' : c.maneuver ? 'S03' : c.coverMate ? 'S04' : c.trade ? 'S05' : c.entrance ? 'S02' : 'S01'
    return activityFeatures[key] || ''
}

// These are execution facts or explicitly labelled applied movement settings,
// not eligibility/selection flags. A diagnostic alone must never light up a marker.
const rules: Rule[] = [
    rule('quiet', 'quietIndex', 'Quiet approach', 'quiet', c => c.active === true && c.applied === true && ['walk', 'crouch'].includes(String(c.state))),
    rule('silentSearch', 'silentIndex', 'Checking the last heard position', 'look', c => c.accepted === true && c.actionObserved === true),
    rule('crossfire', 'crossfireIndex', 'Taking another angle with the squad', 'move', yes('applied'), c => point(c, 'goal')),
    rule('postCombat', 'postCombatIndex', 'Recovering after combat', 'medical', yes('applied')),
    rule('medicalChoice', 'medicalChoiceIndex', 'Using medical supplies', 'medical', yes('started')),
    rule('medicalPosture', 'medicalPostureIndex', 'Protecting the body while healing', 'medical', c => c.applied === true && c.using === true),
    rule('surgeryInterruption', 'surgeryInterruptionIndex', 'Interrupting surgery', 'medical', yes('nativeCancelled', 'handsReleased')),
    rule('reloadTiming', 'reloadIndex', 'Reloading', 'reload', yes('started')),
    rule('quickReload', 'quickReloadIndex', 'Quick reload', 'reload', yes('started', 'dropped')),
    rule('pistolSwap', 'pistolIndex', 'Drawing the sidearm', 'reload', yes('inHands')),
    rule('weaponReturn', 'weaponReturnIndex', 'Changing weapon', 'reload', yes('inHands')),
    rule('weaponRange', 'weaponRangeIndex', 'Switching weapon for this range', 'reload', yes('inHands')),
    rule('handsRecovery', 'handsRecoveryIndex', 'Recovering the weapon', 'reload', yes('inHands')),
    rule('grenadeJudgment', 'grenadeJudgmentIndex', 'Throwing a grenade', 'grenade', yes('released')),
    rule('grenadeReaction', 'grenadeReactionIndex', 'Moving away from a grenade', 'grenade', c => c.hasGoal === true && c.state === 'moving', c => point(c, 'goal')),
    rule('ownGrenadeSafety', 'ownGrenadeSafetyIndex', 'Avoiding a squad grenade', 'grenade', c => c.escape === true && c.state === 'fleeing'),
    rule('gasExposure', 'gasExposureIndex', 'Leaving the gas', 'move', c => c.state === 'escaping' && c.hasGoal === true, c => point(c, 'goal')),
    rule('doorApproach', 'doorIndex', 'Approaching the doorway', 'door', yes('moved', 'arrived'), c => point(c)),
    rule('doorJumpPeek', 'jumpIndex', 'Jump-peeking the doorway', 'door', yes('takeoffObserved')),
    rule('doorRunBy', 'runIndex', 'Running past the doorway', 'door', yes('sprintObserved', 'farArrived'), c => point(c, c.returnAccepted ? 'angle' : 'far')),
    rule('doorStepPeek', 'stepIndex', 'Peeking through the doorway', 'door', yes('movementObserved', 'arrived'), c => point(c, c.returnAccepted ? 'stack' : 'point')),
    rule('doorFakeMedical', 'fakeIndex', 'Faking treatment at the doorway', 'door', yes('handsObserved')),
    rule('doorFakeGrenade', 'fakeIndex', 'Faking a grenade at the doorway', 'door', yes('handsObserved')),
    rule('doorRoomClear', 'clearIndex', 'Entering and checking the room', 'door', yes('movementObserved', 'arrived'), c => point(c)),
    rule('doorAmbush', 'ambushIndex', 'Watching the doorway', 'door', yes('movementObserved', 'arrived', 'retainedPosition'), c => point(c)),
    rule('doorSupport', 'supportIndex', 'Covering a teammate at the doorway', 'door', yes('retained', 'arrived'), c => point(c)),
    rule('doorEmergency', 'emergencyIndex', 'Reacting to danger at the doorway', 'door', yes('actionObserved', 'movementObserved'), c => point(c)),
    rule('doorEntry', 'entryIndex', 'Crossing the doorway', 'door', yes('breachObserved', 'crossed')),
    rule('doorMotion', 'doorMotionIndex', 'Correcting a door position', 'door', c => c.state === 'confirmed'),
    rule('doorClosing', 'doorClosingIndex', 'Closing a door', 'door', c => c.state === 'confirmed'),
    rule('combatStep', 'combatIndex', 'Moving while fighting', 'move', yes('movementObserved'), c => point(c, 'goal')),
    rule('firePause', 'pauseIndex', 'Stopping to shoot', 'fire', yes('stopObserved')),
    rule('cornerPeek', 'cornerIndex', 'Peeking from cover', 'look', yes('arrived', 'openObserved'), c => point(c, 'goal')),
    rule('combatLean', 'leanIndex', 'Leaning to evade shots', 'move', yes('tiltObserved', 'headMotionObserved')),
    rule('retreatWeave', 'weaveIndex', 'Evading while retreating', 'move', c => c.state === 'evading' && (c.moveRequested === true || c.gazeRequested === true)),
    rule('coverTravel', 'travelIndex', 'Moving to cover', 'move', c => ['dash','face-walk'].includes(String(c.state)) && c.observed !== 'stationary' && (c.sprintRequested === true || c.walkRequested === true)),
    rule('angleWatch', 'angleIndex', 'Watching a likely enemy angle', 'look', c => c.requested === true && c.aligned === true),
    rule('cornerChase', 'chaseIndex', 'Following the enemy around a corner', 'move', yes('movementObserved'), c => point(c, 'goal')),
    rule('cornerPrefire', 'prefireIndex', 'Prefiring the corner', 'fire', c => typeof c.actualShots === 'number' && c.actualShots > 0),
    rule('holdAngle', 'holdAngleIndex', 'Adjusting the firing angle', 'look', yes('arrived'), c => point(c)),
    rule('adsTravel', 'adsIndex', 'Lowering sights while moving', 'move', c => c.requestedOff === true && c.observedADS === false),
    rule('tacticalJump', 'tacticalJumpIndex', 'Tactical jump', 'move', yes('takeoffObserved')),
    rule('outdoorRelocation', 'relocationIndex', 'Relocating to another position', 'move', yes('movementObserved'), c => point(c, 'destination')),
    rule('coverFeint', 'feintIndex', 'Baiting a reaction from cover', 'hold', yes('movementObserved', 'animationObserved', 'exposedObserved'), c => point(c, 'goal')),
    rule('fireLane', 'fireLaneIndex', 'Clearing a teammate\'s firing line', 'move', c => c.state === 'stepping' && c.confirmed === true, c => point(c, 'goal')),
    rule('squadFire', 'squadFireIndex', 'Holding fire for a teammate', 'hold', yes('startPrevented', 'stopped')),
    rule('suppressionDiscipline', 'suppressionDisciplineIndex', 'Controlling suppression bursts', 'fire', c => c.state === 'paused' || (typeof c.actualShots === 'number' && c.actualShots > 0)),
    rule('restLights', 'restLightsIndex', 'Switching lights off while waiting', 'light', c => c.requested === true && c.observedOff === true),
    rule('lightDiscipline', 'lightDisciplineIndex', 'Concealing weapon lights', 'light', c => c.requested === true && c.observedOff === true),
    rule('tacticalDevices', 'tacticalDevicesIndex', 'Adjusting weapon devices', 'light', c => c.requested === true && c.observed === true),
    rule('squadVoice', 'squadVoiceIndex', 'Managing squad voice calls', 'voice', yes('filtered', 'played')),
    rule('readyStance', 'readyStanceIndex', 'Keeping the weapon ready', 'hold', yes('observedRaised')),
]
function activityTitle(r: Rule, c: Context): string {
    // P02 records caps applied to native movement, not measured footsteps or
    // proof that the opponent did not hear the bot. Do not promise total silence.
    if (r.key === 'quiet') return c.state === 'crouch' ? 'Quiet approach (crouch requested)' : 'Quiet approach (slower movement)'
    if (r.key === 'silentSearch') return c.movementObserved === true
        ? c.walking === true ? 'Walking to the last heard position' : 'Searching after the enemy went quiet'
        : 'Checking the last heard position'
    if (r.key === 'crossfire') return squadEventTitle(c as unknown as CrossfireContext)
    if (r.key === 'tacticalDevices') {
        const d = c as unknown as TacticalDevicesContext
        const changed = d.accessories.map((a,i) => a.requested && a.confirmed ? cometTacticalDeviceLabel(d,i) : '').filter(Boolean)
        return `${changed.length ? changed.join(', ') : 'Weapon devices'} ${d.target ? 'ON' : 'OFF'}`
    }
    if (r.key === 'coverTravel') return c.state === 'dash' ? 'Sprinting to cover' : 'Moving to cover while facing the threat'
    return r.title
}
function activityReason(r: Rule, c: Context, event: CometMapEvent): string {
    if (r.key === 'quiet') return `Reducing movement noise while approaching a known contact.${c.lootBonus === true ? ' Heard the enemy looting.' : ''}`
    if (r.key === 'silentSearch') return `The enemy went quiet${typeof c.silence === 'number' ? ` for ${c.silence.toFixed(1)} s` : ''}; checking the last heard location.`
    if (r.key === 'retreatWeave') return `Movement/gaze commands applied. Observed head pitch: ${Number(c.observedPitch).toFixed(0)}°; turn: ${Number(c.observedYaw).toFixed(0)}°.`
    if (r.key === 'tacticalDevices') return `COMET applied ${c.source === 'SAIN' ? "SAIN's requested" : 'the holstered weapon'} state; confirmed on the weapon.`
    return cometReason(String(c.reason || event.reason))
}
function activityStatus(r: Rule): string {
    if (r.key === 'quiet') return 'Movement settings applied'
    return r.key === 'retreatWeave' ? 'Movement/gaze commands applied' : 'Observed intervention'
}
function activityEnded(r: Rule, c: Context): boolean {
    return ['ended', 'released', 'completed', 'failed'].includes(String(c.state))
        || (r.key === 'quiet' && c.state === 'normal' && c.active !== true)
}
export function cometEventAt(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    const events = record?.events || []
    let lo = 0, hi = events.length
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (events[mid].time <= at) lo = mid + 1; else hi = mid }
    return events[lo - 1]
}
function indexed(record: CometMapRecord | undefined, last: CometMapEvent | undefined, index: string) {
    const i = (last as unknown as Record<string, unknown> | undefined)?.[index]
    return typeof i === 'number' && i >= 0 ? record?.events[i] : undefined
}
const point = (c: Context, prefix = ''): Point | null => {
    const keys = prefix ? [`${prefix}X`, `${prefix}Y`, `${prefix}Z`] : ['x', 'y', 'z']
    const values = keys.map(k => c[k])
    return values.every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 100000)
        ? { x: values[0] as number, y: values[1] as number, z: values[2] as number } : null
}
export function actionSymbol(action: string): CometSymbol {
    if (/grenade|throw/i.test(action)) return 'grenade'
    if (/heal|medic|firstaid|surgery|stim/i.test(action)) return 'medical'
    if (/reload|weapon|pistol|hands/i.test(action)) return 'reload'
    if (/door|room|entry|entrance/i.test(action)) return 'door'
    if (/shoot|fire|suppress/i.test(action)) return 'fire'
    if (/watch|peek|angle/i.test(action)) return 'look'
    if (/hold|cover|freeze/i.test(action)) return 'hold'
    return 'move'
}
export const symbolText: Record<CometSymbol, string> = { move: '↗', hold: '◇', fire: '⌖', reload: '↻', medical: '+', grenade: '●', door: '⇥', look: '◉', light: '☼', voice: '♪', quiet: '⌁' }
type Activity = { title: string; featureTitle: string; reason: string; symbol: CometSymbol; event?: CometMapEvent; destination: Point | null; status: string }
export type CometPresentation = {
    owner: string; title: string; status: string; reason: string; badge: boolean; symbol: CometSymbol | null;
    signal: { glyph: string; title: string } | null; destination: Point | null; event?: CometMapEvent;
    interventions: Activity[]; score: number | null; factors: { label: string; delta: number }[];
    alternatives: { label: string; eligible: boolean; score: number | null; reason: string }[];
    contact: string; selection: string; featureTitle: string; plan: string; planSymbol: CometSymbol | null;
    movement: string;
}
export function cometPresentation(record: CometMapRecord | undefined, at: number, sampledDecision = '', sampledAt = 0, ghost = false, names: Record<string, string> = {}, resolved?: ReturnType<typeof cometMapState>): CometPresentation {
    const state = resolved || cometMapState(record, at, sampledDecision, sampledAt, ghost)
    const last = cometEventAt(record, at)
    const handoff = indexed(record, last, 'controlIndex')
    const external = ['orbit', 'questing', 'looting', 'extraction', 'sleep', 'other']
    const handedOff = handoff && (handoff.controlHandoff?.pending || external.includes(handoff.controlHandoff?.owner || '')) ? handoff.time : -Infinity
    const sampleSource = getDecisionSource(sampledDecision)
    const outsideCombat = ['ORBIT', 'Phobos', 'QuestingBots', 'LB'].includes(sampleSource)
    const boundary = Math.max(handedOff, outsideCombat ? sampledAt : -Infinity)
    const life = indexed(record, last, 'lifecycleIndex')
    const stopped = ghost || !!(life && life.lifecycle?.state !== 'resumed')
    const motionEvent = indexed(record, last, 'motionIndex')
    const motion = motionEvent?.controlJournal?.motion
    const movement = !stopped && motion && motionEvent && motionEvent.time > boundary && at >= motionEvent.time && at-motionEvent.time < motion.validFor*1000
        ? `${observedMotionLabel(motion)}${motion.speed>=.12?` · ${motion.speed.toFixed(1)} m/s`:''}` : ''
    const interventions: Activity[] = []
    if (!stopped) for (const r of rules) {
        const c = (state as unknown as Record<string, unknown>)[r.key] as Context | undefined
        const event = indexed(record, last, r.index)
        if (!c || !event || event.time <= boundary || !r.observed(c)) continue
        if (r.key === 'silentSearch' && sampledAt >= event.time && !['SAIN:Search', 'COMET:Search'].includes(sampledDecision)) continue
        if (['ended', 'released', 'failed', 'completed', 'refused', 'unavailable'].includes(String(c.state))) continue
        const destination = r.destination?.(c) || null
        interventions.push({ title: activityTitle(r,c), featureTitle: cometFeatureLabel(activityFeature(r.key,c)), reason: activityReason(r,c,event), symbol: r.symbol, event, destination, status: activityStatus(r) })
    }
    // An active quiet approach is useful context throughout its short lease;
    // routine stance/device updates must not continually hide it.
    interventions.sort((a, b) => Number(b.symbol === 'quiet') - Number(a.symbol === 'quiet') || (b.event?.time || 0) - (a.event?.time || 0))
    const currentCore = !stopped && state.actionActive && (!state.event || state.event.time > handedOff)
    const observedCore = currentCore && (sampledDecision === state.decision || !!state.crossfire?.applied || !!state.postCombat?.applied)
    const core: Activity | null = currentCore ? { title: state.crossfire ? squadEventTitle(state.crossfire) : formatDecisionLabel(state.decision), featureTitle: cometFeatureLabel(state.crossfire ? activityFeature('crossfire',state.crossfire as unknown as Context) : state.event?.feature), reason: state.crossfire ? cometReason(state.crossfire.reason) : state.event ? cometReason(state.event.choiceReason || state.event.reason) : 'Recorded in the bot\'s behavior.', symbol: actionSymbol(state.decision), event: state.event, destination: null, status: observedCore ? 'In progress' : 'Chosen · execution not yet observed' } : null
    // Show the concrete observed action before the general tactical plan. Keep
    // the plan's score attached to that plan, never to an auxiliary intervention.
    const primary = interventions[0] || core
    const plan = core && primary !== core && primary?.title !== core.title ? core.title : ''
    let owner = ghost ? 'Ghost' : getDecisionSource(state.decision) || 'Unknown'
    if (currentCore) owner = observedCore ? 'COMET / SAIN' : sampleSource || 'Unknown'
    else if (handoff && handoff.time >= sampledAt && at - handoff.time < 30000) owner = ({ orbit: 'ORBIT', questing: 'Questing Bots', looting: 'Looting Bots', sain: 'SAIN', sleep: 'Ghost', extraction: 'Extraction', other: 'Other layer' } as Record<string, string>)[handoff.controlHandoff?.owner || ''] || owner
    if (outsideCombat && sampledAt >= (state.event?.time ?? -Infinity)) owner = sampleSource
    const ghostObjective = ghost && sampleSource === 'ORBIT' ? (sampledDecision === 'Orbit:Synthetic' ? 'Patrolling' : formatDecisionLabel(sampledDecision)) : ''
    if (ghost) owner = ghostObjective ? 'Ghost / ORBIT' : 'Ghost'
    const event = core?.event || primary?.event || interventions[0]?.event
    const chosen = event?.candidates.find(c => c.decision === (core ? state.decision.replace(/^COMET:/, '') : event.decision))
    const factorKeys = [['loadoutDelta','Equipment'],['opponentDelta','Opponent'],['opportunityDelta','Opportunity'],['coverResponseDelta','Cover / exposure'],['fearDelta','Fear / pressure'],['progressDelta','Progress']] as const
    const factors = factorKeys.flatMap(([key,label]) => chosen && typeof chosen[key] === 'number' && chosen[key] !== 0 ? [{label,delta:chosen[key]!}] : []).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta))
    const alternatives = (event?.candidates || []).filter(c => c !== chosen).sort((a,b)=>Number(b.eligible)-Number(a.eligible)||(b.score??-Infinity)-(a.score??-Infinity)).map(c=>({label:formatDecisionLabel('COMET:'+c.decision),eligible:c.eligible,score:c.score,reason:cometReason(c.reason)}))
    const contact = event?.contact
    const contactSource = ({ seen:'Seen',heard:'Heard','shared-seen':'Sight shared by squad','shared-heard':'Sound shared by squad','sain-last-known':'Last known contact' } as Record<string,string>)[contact?.source || ''] || 'Known contact'
    const contactText = contact ? [contactSource, names[contact.target || ''], contact.distance != null && contact.distance >= 0 ? `${contact.distance.toFixed(0)} m at decision` : '', contact.age != null && contact.age >= 0 ? `${(contact.age + Math.max(0,at-(event?.time??at))/1000).toFixed(1)} s old` : ''].filter(Boolean).join(' · ') : ''
    const mix = event?.mixing
    const probability = mix?.options.find(o=>o.decision===mix.selected)?.probability
    const selection = mix ? `${mix.mistake?.selected ? 'Occasional mistake affected this choice. ' : ''}${probability != null ? `Weighted choice: ${(probability*100).toFixed(1)}% at selection.` : cometReason(mix.state)}` : ''
    // A short cue uses the recorded event time, never wall-clock timers or "an enemy
    // is currently visible". Replaying backwards therefore produces the same cue.
    let signal: CometPresentation['signal'] = null
    if (!stopped) {
        const detection = indexed(record,last,'closeIndex')
        const hearing = indexed(record,last,'hearingIndex')
        const threat = indexed(record,last,'attentionIndex')
        if (detection && at-detection.time < 2000 && detection.closeDetection?.visualAcquired) signal={glyph:'!',title:'New visual contact confirmed'}
        else if (threat && at-threat.time < 2000 && threat.stage==='accepted' && threat.threat?.previous !== threat.threat?.selected && threat.threat?.candidates.some(c=>c.target===threat.threat?.selected && c.visible)) signal={glyph:'!',title:'Switched attention to a visible enemy'}
        else if (hearing && at-hearing.time < 2000 && hearing.hearing?.outcome==='heard') signal={glyph:'?',title:'Movement heard'}
    }
    return { owner, title: primary?.title || (ghost ? ghostObjective || 'Sleeping' : formatDecisionLabel(state.decision) || (owner==='ORBIT'?'Following an objective':'No COMET action observed')), featureTitle: primary?.featureTitle || '', plan, planSymbol: observedCore ? core!.symbol : null, status: primary?.status || 'Current behavior', reason: primary?.reason || '', badge: !!observedCore || interventions.length>0, symbol: interventions[0]?.symbol || (observedCore ? core!.symbol : null), signal,
        destination: interventions.find(a=>a.destination)?.destination || null, event, interventions, score: chosen?.score ?? null, factors, alternatives, contact:contactText, selection, movement }
}

const escape = (s: string) => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export const cometActionText = (action: { title: string; featureTitle: string }): string => action.featureTitle && action.featureTitle !== action.title ? `${action.featureTitle}: ${action.title}` : action.title
export function cometMarkerHtml(view: CometPresentation, role = ''): string {
    // Preserve the map's plan glyph and its separate intervention glyph.
    const markerSymbol = view.planSymbol || view.symbol
    const active = view.badge ? `<span class="rr-comet-mark" aria-label="${escape('COMET: '+cometActionText(view))}" title="${escape('COMET: '+cometActionText(view))}">✦</span><span class="rr-comet-action" aria-hidden="true">${symbolText[markerSymbol || 'move']}</span>` : ''
    const extra = view.interventions.find(a => a.symbol !== markerSymbol)
    const auxiliary = extra ? `<span class="rr-comet-aux" title="${escape(cometActionText(extra))}" aria-label="${escape(cometActionText(extra))}">${symbolText[extra.symbol]}</span>` : ''
    return active + auxiliary + (view.signal ? `<span class="rr-comet-signal" aria-label="${escape(view.signal.title)}" title="${escape(view.signal.title)}">${view.signal.glyph}</span>` : '')
        + (role ? `<span class="rr-comet-role">${escape(role)}</span>` : '')
}
export function cometSimpleTooltip(view: CometPresentation): string {
    return `<div class="rr-comet-brief"><b>${escape(view.owner)}</b> · ${escape(cometActionText(view))}${view.plan?`<div>Plan: ${escape(view.plan)}</div>`:''}${view.status.startsWith('Chosen')?`<div>${escape(view.status)}</div>`:''}${view.movement?`<div>Observed: ${escape(view.movement)}</div>`:''}${view.reason?`<div>${escape(view.reason)}</div>`:''}${view.interventions.filter(a=>a.title!==view.title).slice(0,2).map(a=>`<div>${symbolText[a.symbol]} ${escape(cometActionText(a))}</div>`).join('')}${view.score!=null?`<div>${view.plan?'Plan':'Decision'} score: ${view.score.toFixed(1)}</div>`:''}<small>Click the bot for details</small></div>`
}

export type CometEpisode = { start: number; end: number; count: number; title: string; featureTitle: string; status: string; event: CometMapEvent }
// The readable history groups repeated observations, without treating a request
// or a scoring evaluation as an executed action. Full events remain in Debug.
export function cometEpisodes(record?: CometMapRecord): CometEpisode[] {
    const episodes: CometEpisode[] = []
    let previousKey = ''
    const squadPlans = new Set<string>()
    const observedActions = new Set<string>()
    for (const event of record?.events || []) {
        let title = '', status = '', feature = event.feature
        const c = event.crossfire
        const planKey = c ? `${event.cometSession}:${event.instance}:${c.maneuver?.plan || c.storm?.plan || c.episode}` : ''
        if (c && (c.applied || c.reserved || c.maneuver?.plan || c.storm?.plan || squadPlans.has(planKey))) {
            feature = activityFeature('crossfire',c as unknown as Context)
            title = squadEventTitle(c)
            status = c.state === 'ended' || c.maneuver?.state === 'ended' || c.storm?.state === 'ended' ? 'Ended / interrupted' : c.applied ? 'Execution confirmed' : 'Planned · not yet executed'
            squadPlans.add(planKey)
        } else if (['A01','A02','A03'].includes(event.feature) && event.stage === 'accepted') {
            title = formatDecisionLabel('COMET:' + event.decision); status = 'Chosen by COMET'
        } else if (event.reason === 'comet-service-pause') {
            continue // The following A13 event explains the pause without claiming SAIN took over.
        } else if (event.handoff && ['kept','service-paused','service-revalidate'].includes(event.handoff.state)) {
            title = event.handoff.state === 'kept' ? 'Plan retained' : event.handoff.state === 'service-paused' ? 'Plan paused' : 'Plan reevaluation'
            status = cometReason(event.handoff.reason)
        } else if (event.stage === 'released' && ['A01','A02','A03','A13'].includes(event.feature)) {
            title = 'Returned control'; status = 'COMET action ended'
        } else if (event.controlHandoff) {
            title = 'Control handed over'; status = cometReason(event.controlHandoff.owner)
        } else if (event.lifecycle) {
            title = 'Bot state changed'; status = cometReason(event.lifecycle.state)
        } else {
            const ended = rules.find(r => {
                const c = (event as unknown as Context)[r.key] as Context | undefined
                return c && activityEnded(r,c) && observedActions.has(`${event.cometSession}:${event.instance}:${r.key}`)
            })
            const match = rules.find(r => {
                const c = (event as unknown as Context)[r.key] as Context | undefined
                return !!c && !['ended','released','completed','failed','rejected','unavailable'].includes(String(c.state)) && r.observed(c)
            })
            if (ended) {
                const context = (event as unknown as Context)[ended.key] as Context
                feature = activityFeature(ended.key,context)
                title = activityTitle(ended,context); status = context.state === 'completed' ? 'Completed' : 'Stopped / released'
                observedActions.delete(`${event.cometSession}:${event.instance}:${ended.key}`)
            }
            else if (match) {
                feature = activityFeature(match.key,(event as unknown as Context)[match.key] as Context)
                title = activityTitle(match, (event as unknown as Context)[match.key] as Context); status = activityStatus(match)
                observedActions.add(`${event.cometSession}:${event.instance}:${match.key}`)
            }
            else continue
        }
        const featureTitle = cometFeatureLabel(feature)
        const key = [event.cometSession, event.instance, planKey, feature, title, status, event.contact?.target, event.reason].join('|')
        const prev = episodes[episodes.length-1]
        if (prev && key === previousKey && event.time - prev.end <= 5000) {
            // Keep the first observation: a grouped future update must not leak
            // into the replay when inspecting its starting time.
            prev.end = event.time; prev.count++
        } else episodes.push({ start: event.time, end: event.time, count: 1, title, featureTitle, status, event })
        previousKey = key
    }
    return episodes
}
