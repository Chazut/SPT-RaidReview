import { cometActionMatches } from './cometActionMatch'
import {JournalContext,parseCometJournal} from './cometJournal'
import { ControlHandoffContext, parseCometControlHandoff, cometControlHandoffSummary } from './cometControlHandoff'
import { ValidityContext, parseCometValidity, cometValiditySummary } from './cometValidity'
import { LifecycleContext, parseCometLifecycle, cometLifecycleSummary } from './cometLifecycle'
import { FaultIsolationContext, parseCometFaultIsolation, cometFaultIsolationSummary } from './cometFaultIsolation'
import { CoverScanContext, parseCometCoverScan, cometCoverScanSummary } from './cometCoverScan'
import { MovementRecoveryContext, parseCometMovementRecovery, cometMovementRecoverySummary } from './cometMovementRecovery'
import { DoorClosingContext, parseCometDoorClosing, cometDoorClosingSummary } from './cometDoorClosing'
import { DoorMotionContext, parseCometDoorMotion, cometDoorMotionSummary } from './cometDoorMotion'
import { DoorSpatialContext, parseCometDoorSpatial, cometDoorSpatialSummary } from './cometDoorSpatial'
import { DoorRecoveryContext, parseCometDoorRecovery, cometDoorRecoverySummary } from './cometDoorRecovery'
import { DoorTransitContext, parseCometDoorTransit, cometDoorTransitSummary } from './cometDoorTransit'
import { OutcomeContext, parseCometOutcome, cometOutcomeSummary } from './cometOutcome'
import { EncounterContext, parseCometEncounter, cometEncounterSummary } from './cometEncounter'
import { RestLightsContext, parseCometRestLights, cometRestLightsSummary } from './cometRestLights'
import { TacticalDevicesContext, parseCometTacticalDevices, cometTacticalDevicesSummary } from './cometTacticalDevices'
import { LightDisciplineContext, parseCometLightDiscipline, cometLightDisciplineSummary } from './cometLightDiscipline'
import { SquadVoiceContext, parseCometSquadVoice, cometSquadVoiceSummary } from './cometSquadVoice'
import { SquadFireContext, parseCometSquadFire, cometSquadFireSummary } from './cometSquadFire'
import { FireLaneContext, parseCometFireLane, cometFireLaneSummary } from './cometFireLane'
import { CrossfireContext, parseCometCrossfire, cometCrossfireSummary, cometCrossfireTitle, cometCrossfireDecision } from './cometCrossfire'
import { ReadyStanceContext, parseCometReadyStance, cometReadyStanceSummary } from './cometReadyStance'
import { PostCombatContext, parseCometPostCombat, cometPostCombatSummary } from './cometPostCombat'
import { MedicalPostureContext, parseCometMedicalPosture, cometMedicalPostureSummary } from './cometMedicalPosture'
import { SurgeryInterruptionContext, parseCometSurgeryInterruption, cometSurgeryInterruptionSummary } from './cometSurgeryInterruption'
import { MedicalChoiceContext, parseCometMedicalChoice, cometMedicalChoiceSummary } from './cometMedicalChoice'
import { ExplosionAwarenessContext, parseCometExplosionAwareness, cometExplosionAwarenessSummary } from './cometExplosionAwareness'
import { FlashContinuityContext, parseCometFlashContinuity, cometFlashContinuitySummary } from './cometFlashContinuity'
import { GasExposureContext, parseCometGasExposure, cometGasExposureSummary } from './cometGasExposure'
import { GrenadeFilterContext, parseCometGrenadeFilter, cometGrenadeFilterSummary } from './cometGrenadeFilter'
import { GrenadeDispersionContext, parseCometGrenadeDispersion, cometGrenadeDispersionSummary } from './cometGrenadeDispersion'
import { GrenadeReactionContext, parseCometGrenadeReaction, cometGrenadeReactionSummary } from './cometGrenadeReaction'
import { OwnGrenadeSafetyContext, parseCometOwnGrenadeSafety, cometOwnGrenadeSafetySummary } from './cometOwnGrenadeSafety'
import { GrenadeChoiceContext, parseCometGrenadeChoice, cometGrenadeChoiceSummary } from './cometGrenadeChoice'
import { GrenadeTrajectoryContext, parseCometGrenadeTrajectory, cometGrenadeTrajectorySummary } from './cometGrenadeTrajectory'
import { GrenadeJudgmentContext, parseCometGrenadeJudgment, cometGrenadeJudgmentSummary } from './cometGrenadeJudgment'
import { HandsRecoveryContext, parseCometHandsRecovery, cometHandsRecoverySummary } from './cometHandsRecovery'
import { RecoilRecoveryContext, parseCometRecoilRecovery, cometRecoilRecoverySummary } from './cometRecoilRecovery'
import { ShotGeometryContext, parseCometShotGeometry, cometShotGeometrySummary } from './cometShotGeometry'
import { SuppressionDisciplineContext, parseCometSuppressionDiscipline, cometSuppressionDisciplineSummary } from './cometSuppressionDiscipline'
import { WeaponSyncContext, parseCometWeaponSync, cometWeaponSyncSummary } from './cometWeaponSync'
import { WeaponRangeContext, parseCometWeaponRange, cometWeaponRangeSummary } from './cometWeaponRange'
import { parseMagazineRecovery, isMagazineRecoveryEvent, magazineRecoveryTitle, type MagazineRecoveryContext } from './cometMagazineRecovery'
import { QuickReloadContext, parseCometQuickReload, cometQuickReloadSummary } from './cometQuickReload'
import { WeaponReturnContext, parseCometWeaponReturn, cometWeaponReturnSummary } from './cometWeaponReturn'
import { PistolSwapContext, parseCometPistolSwap, cometPistolSwapSummary } from './cometPistolSwap'
import { ReloadTimingContext, parseCometReloadTiming, cometReloadTimingSummary } from './cometReloadTiming'
import { CoverFeintContext, parseCometCoverFeint, cometCoverFeintSummary } from './cometCoverFeint'
import { OutdoorRelocationContext, parseCometOutdoorRelocation, cometOutdoorRelocationSummary } from './cometOutdoorRelocation'
import { TacticalJumpContext, parseCometTacticalJump, cometTacticalJumpSummary } from './cometTacticalJump'
import { RetreatWeaveContext, parseCometRetreatWeave, cometRetreatWeaveSummary } from './cometRetreatWeave'
import { AdsTravelContext, parseCometAdsTravel, cometAdsTravelSummary } from './cometAdsTravel'
import { CoverTravelContext, parseCometCoverTravel, cometCoverTravelSummary } from './cometCoverTravel'
import { HoldAngleContext, parseCometHoldAngle, cometHoldAngleSummary } from './cometHoldAngle'
import { AngleWatchContext, parseCometAngleWatch, cometAngleWatchSummary } from './cometAngleWatch'
import { CornerPrefireContext, parseCometCornerPrefire, cometCornerPrefireSummary } from './cometCornerPrefire'
import { CornerChaseContext, parseCometCornerChase, cometCornerChaseSummary } from './cometCornerChase'
import { CombatLeanContext, parseCometCombatLean, cometCombatLeanSummary } from './cometCombatLean'
import { CornerPeekContext, parseCometCornerPeek, cometCornerPeekSummary } from './cometCornerPeek'
import { FirePauseContext, parseCometFirePause, cometFirePauseSummary } from './cometFirePause'
import { CombatStepContext, parseCometCombatStep, cometCombatStepSummary } from './cometCombatStep'
import { DoorEntryContext, parseCometDoorEntry, cometDoorEntrySummary } from './cometDoorEntry'
import { DoorReservationContext, parseCometDoorReservation, cometDoorReservationSummary } from './cometDoorReservation'
import { DoorEmergencyContext, parseCometDoorEmergency, cometDoorEmergencySummary } from './cometDoorEmergency'
import { DoorInterruptionContext, parseCometDoorInterruption, cometDoorInterruptionSummary } from './cometDoorInterruption'
import { DoorSupportContext, parseCometDoorSupport, cometDoorSupportSummary } from './cometDoorSupport'
import { DoorHoldContext, parseCometDoorHold, cometDoorHoldSummary } from './cometDoorHold'
import { parseCometDoorAmbush, cometDoorAmbushSummary, DoorAmbushContext } from './cometDoorAmbush'
import { parseCometDoorClear, cometDoorClearSummary, cometDoorClearTitle, DoorClearContext } from './cometDoorClear'
import { parseCometDoorMedical, cometDoorMedicalSummary, DoorMedicalContext } from './cometDoorMedical'
import { parseCometDoorFake, cometDoorFakeSummary, DoorFakeContext } from './cometDoorFake'
import { parseCometDoorStep, cometDoorStepSummary, DoorStepContext } from './cometDoorStep'
import { DoorRunContext, parseCometDoorRun, cometDoorRunSummary } from './cometDoorRun'
import { DoorJumpContext, parseCometDoorJump, cometDoorJumpSummary } from './cometDoorJump'
import { DoorContext, parseCometDoor, cometDoorSummary } from './cometDoor'
import { EnvironmentContext, parseCometEnvironment, cometEnvironmentSummary } from './cometEnvironment'
import { SearchAbandonmentContext, parseCometSearchAbandonment, cometSearchAbandonmentSummary } from './cometSearchAbandonment'
import { SilentSearchContext, parseCometSilentSearch, cometSilentSearchSummary } from './cometSilentSearch'
import { ImpactContext, parseCometImpact, cometImpactSummary } from './cometImpact'
import { CloseDetectionContext, parseCometCloseDetection, cometCloseDetectionSummary } from './cometCloseDetection'

import { FloorHearingContext, parseCometFloorHearing, cometFloorHearingSummary } from './cometFloorHearing'

import { GunfireContext, parseCometGunfire, cometGunfireSummary } from './cometGunfire'

import { parseCometQuiet, cometQuietSummary, type QuietContext } from './cometQuiet'

import { formatDecisionLabel, getBehaviorCategory, getDecisionSource } from './botBehavior'



export type HearingContext = { source: string; kind: string; outcome: string; signal?: number; emittedAt?: number; age?: number;

    distance?: number; range?: number; volume?: number; x?: number; y?: number; z?: number }

export function parseCometHearing(value: any): HearingContext | null {

    if (!value || typeof value !== 'object' || Array.isArray(value) || !['queued', 'heard', 'not-heard'].includes(value.outcome)) return null

    return { source: text(value.source), kind: text(value.kind), outcome: value.outcome, signal: number(value.signal), emittedAt: number(value.emittedAt),

        age: number(value.age), distance: number(value.distance), range: number(value.range), volume: number(value.volume),

        x: number(value.x), y: number(value.y), z: number(value.z) }

}

export function cometHearingSummary(h: HearingContext, names: Record<string, string> = {}): string[] {

    const outcomes: Record<string, string> = { queued: 'Passed to SAIN: hearing not confirmed', heard: 'Personally heard by this PMC', 'not-heard': 'SAIN did not register a personal contact' }

    const lines = [outcomes[h.outcome], `${h.kind || 'Movement'} · ${names[h.source] || h.source || 'Unknown source'} · Signal #${h.signal ?? '?'}`,

        `Distance at delivery: ${h.distance?.toFixed(1) ?? '?'} m · Signal age: ${h.age?.toFixed(2) ?? '?'} s`,

        'Perception evidence only; SAIN keeps detection and shooting rules.']

    if (h.outcome === 'heard' && h.x != null && h.y != null && h.z != null) lines.push(`Perceived position: ${h.x.toFixed(1)}, ${h.y.toFixed(1)}, ${h.z.toFixed(1)}`)

    return lines

}



type Candidate = { scoreBeforeProgress?: number; progressDelta?: number; progressReason?: string; scoreBeforeCoverResponse?: number; coverResponseDelta?: number; coverResponseReason?: string; decision: string; eligible: boolean; score: number | null; reason: string; scoreBeforeFear?: number; fearDelta?: number; scoreBeforeLoadout?: number; loadoutDelta?: number; loadoutReason?: string; scoreBeforeOpponent?: number; opponentDelta?: number; opponentReason?: string; scoreBeforeOpportunity?: number; opportunityDelta?: number; opportunityReason?: string }

export type HandoffContext = { state: string; reason: string; kind: string; fromFeature: string; fromAction: string;

    nativeCombat: string; nativeSelf: string; nativeSquad: string; nativeObserved: boolean; at?: number; retryRemaining?: number; graceRemaining?: number }

export type ProgressContext = { state: string; reason: string; action: string; attempt: string; intent: string; lastOutcome: string; reconsider: boolean;

    at?: number; encounter?: number; holdSeconds?: number; stalledSeconds?: number; movementSeconds?: number; remaining?: number; progressMeters?: number; retryRemaining?: number; failures?: number }

export type CoverResponseContext = { state: string; reason: string; target: string; coverId: string; travelMode: string;

    pathLength?: number; eta?: number; fastEta?: number; exposedSeconds?: number; fastExposedSeconds?: number; knownThreats?: number; scoreCap?: number }

export type OpportunityContext = { target: string; cue: string; state: string; reason: string; travelMode: string;

    episode?: number; heardAt?: number; age?: number; remaining?: number; window?: number; pathLength?: number; eta?: number;

    estimatedSpeed?: number; routeRisk?: number; knownThreats?: number; bonus?: number; scoreCap?: number; safetyMargin?: number }

export type OpponentContext = { target: string; state: string; sample: string; advantage?: number; scoreCap?: number;

    evidence: { kind: string; value: string; source: string; age?: number; observedAt?: number; confidence?: number; active: boolean }[] }

export type LoadoutContext = { state: string; weapon: string; weaponClass: string; profile: string; optic: string; ammo: string;

    idealRange?: number; loadedRounds?: number; compatibleMagazines?: number; looseRounds?: number; grenades?: number; medicalItems?: number;

    scoreCap?: number; resourcesKnown: boolean; canFirstAid: boolean; canSurgery: boolean; ready: boolean; refreshReason: string; resourceReason: string }

export type ThreatCandidate = { target: string; eligible: boolean; reason: string; source: string; age?: number; distance?: number; visible: boolean;

    immediate: boolean; score?: number; sight?: number; hit?: number; fire?: number; proximity?: number; facing?: number; steps?: number }

export type ThreatContext = { previous: string; selected: string; reason: string; trigger: string; at?: number; holdRemaining?: number;

    margin?: number; emergency: boolean; truncated: boolean; candidates: ThreatCandidate[] }

export type FearContext = { level?: number; target?: number; base?: number; sensitivity?: number; multiplier?: number;

    injury?: number; allyDeath?: number; outnumbered?: number; suppression?: number; scoreCap?: number;

    knownEnemies?: number; availableAllies?: number; countsTruncated: boolean; panic: boolean; transition: string; deathSource: string; at?: number; deathAt?: number; panicChangedAt?: number }

type Contact = { target?: string; source?: string; age?: number; distance?: number; x?: number; y?: number; z?: number }

type VisibleContext = { currentExposure?: number; coverRouteRisk?: number; pushRouteRisk?: number; knownThreats?: number; coverId: string; probeAge?: number }

type ContinuityContext = { previousAction: string; remaining?: number; lostFor?: number; frozenRoute: boolean }

type MixOption = { decision: string; score?: number; probability?: number; reason: string }

export type MistakeContext = { state: string; seed: string; best: string; before: string; selected: string; personality: string;

    opportunity?: number; drawIndex?: number; at?: number; nextAllowedAt?: number; roll?: number; chance?: number;

    bestScore?: number; selectedScore?: number; scoreLoss?: number; maxLoss?: number; options: MixOption[] }

export type MixingContext = { state: string; trigger: string; selected: string; seed: string; opportunity?: number; encounter?: number; drawIndex?: number; roll?: number; options: MixOption[]; mistake: MistakeContext | null }

export type CometMapEvent = {

    id: number; time: number; profileId: string; cometSession: string; sequence: number

    feature: string; decision: string; stage: string; reason: string; instance: string

    contact: Contact | null; candidates: Candidate[]; choiceReason: string

    visible: VisibleContext | null

    continuity: ContinuityContext | null

    mixing: MixingContext | null

    fear: FearContext | null

    loadout: LoadoutContext | null

    opponent: OpponentContext | null

    progress: ProgressContext | null

    progressIndex: number

    controlHandoff: ControlHandoffContext | null
    controlIndex: number
    handoff: HandoffContext | null

    handoffIndex: number

    hearing: HearingContext | null

    hearingIndex: number

    quiet: QuietContext | null

    quietIndex: number

    gunfire: GunfireContext | null

    gunfireIndex: number

    floorHearing: FloorHearingContext | null

    floorIndex: number

    closeDetection: CloseDetectionContext | null

    closeIndex: number
    impact: ImpactContext | null
    impactIndex: number
    searchAbandonment: SearchAbandonmentContext | null
    abandonmentIndex: number
    environmentContext: EnvironmentContext | null
    environmentIndex: number
    doorApproach: DoorContext | null
    doorJumpPeek: DoorJumpContext | null
    doorRunBy: DoorRunContext | null
    runIndex: number
    doorFakeMedical: DoorMedicalContext | null
    doorFakeGrenade: DoorFakeContext | null
    readyStance: ReadyStanceContext | null
    readyStanceIndex: number
    validity: ValidityContext | null
    validityIndex: number
    lifecycle: LifecycleContext | null
    lifecycleIndex: number
    faultIsolation: FaultIsolationContext | null
    faultIsolationIndex: number
    coverScan: CoverScanContext | null
    coverScanIndex: number
    movementRecovery: MovementRecoveryContext | null
    doorClosing: DoorClosingContext | null
    movementRecoveryIndex: number
    doorClosingIndex: number
    doorMotion: DoorMotionContext | null
    doorMotionIndex: number
    doorSpatial: DoorSpatialContext | null
    doorSpatialIndex: number
    doorRecovery: DoorRecoveryContext | null
    doorRecoveryIndex: number
    doorTransit: DoorTransitContext | null
    doorTransitIndex: number
    outcome: OutcomeContext | null
    outcomeIndex: number
    encounter: EncounterContext | null
    encounterIndex: number
    restLights: RestLightsContext | null
    restLightsIndex: number
    tacticalDevices: TacticalDevicesContext | null
    tacticalDevicesIndex: number
    lightDiscipline: LightDisciplineContext | null
    lightDisciplineIndex: number
    squadVoice: SquadVoiceContext | null
    squadVoiceIndex: number
    squadFire: SquadFireContext | null
    squadFireIndex: number
    fireLane: FireLaneContext | null
    fireLaneIndex: number
    crossfire: CrossfireContext | null
    crossfireIndex: number
    postCombat: PostCombatContext | null
    medicalPosture: MedicalPostureContext | null
    postCombatIndex: number
    medicalPostureIndex: number
    surgeryInterruption: SurgeryInterruptionContext | null
    surgeryInterruptionIndex: number
    medicalChoice: MedicalChoiceContext | null
    medicalChoiceIndex: number
    explosionAwareness: ExplosionAwarenessContext | null
    explosionAwarenessIndex: number
    flashContinuity: FlashContinuityContext | null
    gasExposure: GasExposureContext | null
    grenadeFilter: GrenadeFilterContext | null
    flashContinuityIndex: number
    gasExposureIndex: number
    grenadeFilterIndex: number
    grenadeDispersion: GrenadeDispersionContext | null
    grenadeDispersionIndex: number
    grenadeReaction: GrenadeReactionContext | null
    ownGrenadeSafety: OwnGrenadeSafetyContext | null
    grenadeReactionIndex: number
    ownGrenadeSafetyIndex: number
    grenadeChoice: GrenadeChoiceContext | null
    grenadeChoiceIndex: number
    grenadeTrajectory: GrenadeTrajectoryContext | null
    grenadeTrajectoryIndex: number
    grenadeJudgment: GrenadeJudgmentContext | null
    grenadeJudgmentIndex: number
    handsRecovery: HandsRecoveryContext | null
    handsRecoveryIndex: number
    recoilRecovery: RecoilRecoveryContext | null
    recoilRecoveryIndex: number
    shotGeometry: ShotGeometryContext | null
    shotGeometryIndex: number
    suppressionDiscipline: SuppressionDisciplineContext | null
    suppressionDisciplineIndex: number
    weaponSync: WeaponSyncContext | null
    weaponSyncIndex: number
    weaponRange: WeaponRangeContext | null
    weaponRangeIndex: number
    magazineRecovery: MagazineRecoveryContext | null
    magazineRecoveryIndex: number
    quickReload: QuickReloadContext | null
    quickReloadIndex: number
    controlJournal: JournalContext | null
    controlJournalIndex: number
    motionIndex: number
    journal: JournalContext | null
    journalIndex: number
    weaponReturn: WeaponReturnContext | null
    weaponReturnIndex: number
    pistolSwap: PistolSwapContext | null
    pistolIndex: number
    reloadTiming: ReloadTimingContext | null
    reloadIndex: number
    coverFeint: CoverFeintContext | null
    feintIndex: number
    outdoorRelocation: OutdoorRelocationContext | null
    relocationIndex: number
    tacticalJump: TacticalJumpContext | null
    tacticalJumpIndex: number
    weaveIndex: number
    retreatWeave: RetreatWeaveContext | null
    adsIndex: number
    adsTravel: AdsTravelContext | null
    travelIndex: number
    coverTravel: CoverTravelContext | null
    holdAngleIndex: number
    holdAngle: HoldAngleContext | null
    angleIndex: number
    angleWatch: AngleWatchContext | null
    prefireIndex: number
    cornerPrefire: CornerPrefireContext | null
    chaseIndex: number
    cornerChase: CornerChaseContext | null
    leanIndex: number
    combatLean: CombatLeanContext | null
    cornerIndex: number
    cornerPeek: CornerPeekContext | null
    pauseIndex: number
    firePause: FirePauseContext | null
    combatIndex: number
    combatStep: CombatStepContext | null
    entryIndex: number
    doorEntry: DoorEntryContext | null
    reservationIndex: number
    doorReservation: DoorReservationContext | null
    emergencyIndex: number
    doorEmergency: DoorEmergencyContext | null
    interruptionIndex: number
    doorInterruption: DoorInterruptionContext | null
    supportIndex: number
    doorSupport: DoorSupportContext | null
    holdIndex: number
    doorHold: DoorHoldContext | null
    ambushIndex: number
    doorAmbush: DoorAmbushContext | null
    clearIndex: number
    doorRoomClear: DoorClearContext | null
    fakeIndex: number
    doorStepPeek: DoorStepContext | null
    stepIndex: number
    jumpIndex: number
    doorIndex: number
    silentSearch: SilentSearchContext | null
    silentIndex: number

    coverResponse: CoverResponseContext | null

    opportunity: OpportunityContext | null

    threat: ThreatContext | null

    actionIndex: number

    attentionIndex: number

}

export type CometMapRecord = { status: 'loading' | 'ready' | 'unavailable' | 'error'; events: CometMapEvent[] }

const text = (value: unknown) => typeof value === 'string' ? value : ''

const number = (value: unknown): number | undefined => typeof value === 'number' && Number.isFinite(value) ? value : undefined

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

const reasons: Record<string, string> = {

    'movement-queued': 'Movement signal queued for native SAIN hearing',

    'movement-personally-heard': 'PMC personally heard movement',

    'movement-native-not-heard': 'SAIN did not register a personal movement contact',

    'handoff-native-observed': 'Next native SAIN decision observed',

    'handoff-native-priority': 'An active treatment, weapon operation or immediate danger prevents a tactical change',
    'plan-kept-pending-exposure': 'Keeping the verified plan while the next exposure check is pending',
    'comet-service-pause': 'Tactical plan paused for COMET treatment or reload',
    'comet-service-FirstAid': 'COMET chose first aid; the tactical plan is paused',
    'comet-service-Surgery': 'COMET chose surgery; the tactical plan is paused',
    'comet-service-Stims': 'COMET chose a stimulant; the tactical plan is paused',
    'comet-service-Reload': 'COMET chose to reload; the tactical plan is paused',
    'comet-service-ended-revalidate-plan': 'Treatment or reload ended; recheck the plan before resuming',

    'handoff-safe-path-grace': 'Brief interruption while an already verified move still progresses',

    'no-feasible-option': 'No COMET tactic is currently usable',

    'progress-stalled': 'No useful movement: reconsider the failed destination',

    'progress-hold-fatigue': 'Waiting without progress is becoming less attractive',

    'progress-hold-limit': 'Idle hold budget exhausted',

    'progress-fresh-approach': 'A fresh approaching contact briefly justifies waiting',

    'progress-attempt-cooldown': 'This failed destination is temporarily excluded',

    'progress-moving': 'Useful movement confirmed',

    'progress-arrived': 'Native arrival confirmed at the destination',

    'progress-arrived-idle': 'Reached the destination but remained idle too long',

    'progress-review-moving': 'Movement reviewed: continue while making progress',

    'progress-native-priority': 'Paused for a native urgent or squad action',

    'progress-door-pause': 'Paused for a door interaction',

    'progress-hands-pause': 'Paused for reloading or busy hands',

    'progress-search-pause': 'Paused for a deliberate native search wait',

    'progress-shooting': 'Firing: stationary movement is intentional',

    'progress-native-move-refused': 'Native mover refused this destination',

    'cover-response-quick-protection': 'A short move offers quick protection',

    'cover-response-exposed-crossing': 'Returning fire is preferred over a long exposed crossing',

    'cover-response-balanced': 'No strong travel preference', 'cover-response-neutral': 'No cover response adjustment',

    'cover-response-disabled': 'Cover response is disabled', 'cover-response-ineligible': 'Observer is outside the PMC combat scope',

    'cover-response-probe-pending': 'Waiting for the exposure probe budget', 'cover-response-no-route': 'No verified complete cover route',

    'cover-response-door-busy': 'Door interaction makes travel time uncertain', 'cover-response-weapon-busy': 'Weapon or hands are busy',

    'cover-response-invalid-route': 'Route geometry or mobility could not be estimated', 'cover-response-already-protected': 'Already at cover',

    'cover-response-cover-unavailable': 'Cover failed a feasibility check; no bonus can override it',

    'cover-response-threat-uncertainty': 'Additional threats or an incomplete scan prevent a simple firing-versus-cover preference',

    'cover-response-defence-priority': 'Cannot safely trade shots; defensive choices keep priority',



    'opportunity-arrival-before-estimated-end': 'A safe arrival seems possible before the opening closes',

    'opportunity-expired': 'Estimated opening has ended', 'opportunity-reaction-delay': 'Reaction delay has not elapsed',

    'opportunity-too-late': 'Travel plus safety margin exceeds the time left', 'opportunity-route-exposed': 'Approach route is too exposed',

    'opportunity-other-known-threats': 'Other known threats or incomplete threat scan', 'opportunity-own-safety': 'Own safety takes priority',

    'opportunity-no-complete-path': 'No verified complete path', 'opportunity-probe-pending': 'Waiting for the route assessment budget',

    'opportunity-contact-moved': 'Latest known position moved away from the heard action', 'opportunity-path-too-long': 'Path exceeds the opportunity limit',

    'opportunity-door-busy': 'Door interaction makes arrival time uncertain', 'opportunity-mobility-unknown': 'Travel speed could not be estimated',

    'opportunity-push-unavailable': 'Push is unavailable; the opening cannot override that refusal',

    'new-heard-opportunity': 'A new personally heard opening prompts a fresh choice', 'opportunity-closed': 'Opening ended; normal choices resume',

    'heard-shot': 'A personally heard shot invalidated the opening', 'heard-sprint': 'Personally heard sprinting invalidated the opening',

    'heard-grenade': 'Personally heard grenade preparation invalidated the opening', 'opportunity-neutral': 'No opening bonus',

    'opponent-neutral': 'No opponent adjustment', 'opponent-native-refusal-kept': 'Opponent estimate cannot override an unavailable action',

    'seen-impact': 'Own impact observed on a visible body part', 'heard-heal': 'Treatment personally heard', 'heard-surgery': 'Surgery personally heard',

    'none-visible': 'No protection identified on the observed part', 'visible-protection': 'Visible external protection',

    'seen-hands': 'Hands personally observed', 'seen-torso': 'Torso personally observed', 'seen-head': 'Head personally observed',

    'possibly-injured': 'Possibly injured (unconfirmed)',

    'loadout-close-weapon-fit': 'Close combat suitability of the current weapon',

    'loadout-shooting-range': 'Suitability for shooting at this distance', 'loadout-hold-suitable-range': 'Holding a suitable range for this weapon',

    'loadout-long-weapon-caution': 'Caution with a long-range weapon', 'loadout-protected-distance': 'Seeking protection at an unsuitable weapon range',

    'loadout-protected-distance+treatable-injury': 'Weapon range and an injury that can be treated',

    'loadout-usable-grenade-stock': 'Usable grenade stock (bonus capped)', 'loadout-neutral': 'No equipment adjustment',

    'loadout-native-refusal-kept': 'Equipment cannot override an unavailable action',

    'weapon-info-pending': 'Waiting for matching weapon information', 'unknown-weapon': 'Unknown weapon: neutral influence',

    'refresh-pending': 'Equipment refresh pending: neutral influence', 'read-error': 'Equipment read failed: neutral influence',



    'threat-first-target': 'First usable target', 'threat-current-invalid': 'Previous target is no longer usable',

    'threat-immediate-visible': 'Immediate visible danger', 'threat-recent-attacker': 'Located attacker just hit the bot',

    'threat-incoming-fire': 'Located incoming fire', 'threat-nearby-footsteps': 'Recent nearby footsteps',

    'threat-visible-contact': 'Visible opponent', 'threat-known-contact': 'Dated known contact',

    'threat-kept-best': 'Current target is still the highest priority', 'threat-kept-commitment': 'Keeping the target briefly to avoid switching back and forth',

    'threat-kept-margin': 'The alternative is not sufficiently more dangerous', 'threat-better-target': 'A higher priority target justifies switching',

    'threat-incomplete-scan': 'Incomplete contact scan: keeping the current target unless urgent', 'threat-lower-priority': 'Another contact has higher priority',

    'threat-no-perceived-position': 'No usable perceived position', 'threat-stale-contact': 'Contact information expired',

    'threat-invalid-contact': 'Contact is no longer eligible', 'threat-yield-to-sain': 'SAIN retains target selection',

    'threat-no-usable-contact': 'No usable contact for COMET', 'threat-native-refused': 'SAIN did not accept the target',

    'threat-target-changed': 'Target changed: previous tactical plan released',

    'panic-best-feasible': 'Panic: best feasible response without randomness', 'panic-reassessment': 'Panic interrupts the previous sight-loss plan',

    'mistake-selected': 'Plausible tactical mistake selected', 'kept-best': 'Mistake roll kept the best action',

    'a04-already-varied': 'A04 already chose an alternative: no added mistake', 'cooldown': 'Minimum interval between mistakes',

    'no-plausible-alternative': 'No usable alternative within the mistake score limits', 'urgent': 'Urgent situation: no mistake',

    'native-retry': 'SAIN refused an action: no mistake on retry', 'disabled': 'Disabled in settings',

    'inside-a04-band': 'Inside the normal A04 variety range', 'score-loss-too-large': 'Too far below the best action',

    'plausible-alternative': 'Usable mistake alternative', 'best': 'Best available action',

    'best-feasible-score': 'Best available choice', 'new-contact': 'Reacting to a new contact',

    commitment: 'Keeping the current plan briefly', hysteresis: 'Current plan is still competitive',

    'plan-limit': 'Previous plan reached its time limit', 'no-grenade': 'No grenade available',

    'no-current-complete-path': 'No usable path', 'no-reachable-cover': 'No reachable cover',

    'no-native-shift-cover-target': 'No suitable cover to move to', 'retry-cooldown': 'Waiting before retrying',

    'low-ammo': 'Low ammunition', 'unsafe-push': 'Too risky to push', 'disabled-by-config': 'Disabled in settings',

    'enemy-visible': 'Enemy became visible', 'contact-ended-or-visible': 'Contact ended or became visible',

    'sain-decision-accepted': 'Choice reason was not recorded', 'grenade-contact-stale': 'Contact too old for a grenade',

    'push-too-far': 'Contact too far away to push', 'disabled-or-stale-contact': 'Grenades disabled or contact too old',

    'clear-shot': 'Clear shot from the current position', 'shoot-from-cover': 'Can shoot from cover',

    'reachable-protected-cover': 'Reachable cover with a protected destination', 'hurt-seek-cover': 'Injured: taking cover',

    'low-ammo-seek-cover': 'Low ammunition: taking cover', 'hit-seek-cover': 'Recently hit: taking cover',

    'reachable-close-contact': 'Close contact with a usable approach', 'additional-known-threat': 'Other known threats make pushing unsafe',

    'cover-route-exposed': 'Route to cover is too exposed', 'push-route-exposed': 'Push route is too exposed',

    'cover-destination-exposed': 'Cover does not sufficiently protect from known threats', 'recent-cover-intent': 'Keeping the recent cover plan',

    'no-clear-shot-or-out-of-range': 'No clear shot or outside effective range', 'push-path-too-long': 'Push route is too long',

    'exposure-probe-pending': 'Waiting for a route risk check', 'selected-cover-refused-by-native-mover': 'SAIN could not move to the chosen cover',

    'sight-hold-last-seen': 'Brief sight loss: watching the last seen spot', 'sight-continue-known-route': 'Brief sight loss: continuing the known route',

    'sight-window-expired': 'Sight memory expired', 'sight-reacquired': 'Enemy seen again', 'sight-target-changed': 'Target changed',

    'sight-other-threat': 'Another visible threat or incoming fire', 'sight-situation-changed': 'Hit, resources or combat situation changed',

    'sight-urgent-action': 'Urgent SAIN action takes priority', 'sight-weapon-unavailable': 'Weapon unavailable',

    'sight-push-no-longer-safe': 'The existing push route is no longer safe or usable', 'sight-ineligible': 'Bot no longer eligible',

    'sight-action-changed': 'SAIN changed the action', 'sight-wait-for-window': 'Waiting briefly before searching',

    'sight-observation-gap': 'Observation interrupted; stale sight memory discarded', 'sight-continuity-disabled': 'Sight continuity disabled',

    'weighted-roll': 'One weighted choice among close scores', 'single-option': 'Only one effective choice', 'new-plan': 'Starting a new plan',

    'urgent-best': 'Urgent situation: best available response', 'native-retry-best': 'Native action refused: best remaining choice',

    'disabled-best': 'Variety disabled: highest score', 'kept-commitment': 'Plan kept during its commitment',

    'kept-hysteresis': 'Plan still competitive: no new roll', 'kept-sight-continuity': 'Plan kept through brief sight loss: no new roll',

    'outside-score-gap': 'Score too far below the best', 'outside-top-options': 'Outside the top choices',

    'danger-changed': 'Own condition or danger changed', 'previous-unavailable': 'Previous choice became unavailable',

    'situation-changed': 'Known threats, cover or own condition changed', 'score-improved': 'A better choice justified a new decision',

}

export const cometReason = (value: string) => reasons[value] || value.replace(/[-_:]/g, ' ') || 'Not recorded'

const probability = (v: unknown) => { const n = number(v); return n != null && n >= 0 && n <= 1 ? n : undefined }

const parseOptions = (options: any): MixOption[] => Array.isArray(options) ? options.slice(0, 32).filter((v: any) => v && typeof v.decision === 'string').map((v: any) => ({

    decision: v.decision, score: number(v.score), probability: probability(v.probability), reason: text(v.reason),

})) : []

export function parseCometMistake(raw: any): MistakeContext | null {

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

    return { state: text(raw.state), seed: text(raw.seed), best: text(raw.best), before: text(raw.before), selected: text(raw.selected), personality: text(raw.personality),

        opportunity: number(raw.opportunity), drawIndex: number(raw.drawIndex), at: number(raw.at), nextAllowedAt: number(raw.nextAllowedAt),

        roll: probability(raw.roll), chance: probability(raw.chance), bestScore: number(raw.bestScore), selectedScore: number(raw.selectedScore),

        scoreLoss: probability(raw.scoreLoss), maxLoss: probability(raw.maxLoss), options: parseOptions(raw.options) }

}

export function parseCometMixing(raw: any): MixingContext | null {

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

    return { state: text(raw.state), trigger: text(raw.trigger), selected: text(raw.selected), seed: text(raw.seed),

        opportunity: number(raw.opportunity), encounter: number(raw.encounter), drawIndex: number(raw.drawIndex), roll: probability(raw.roll),

        options: parseOptions(raw.options), mistake: parseCometMistake(raw.mistake) }

}

export const cometProbability = (p: number | undefined) => p == null ? '?' : (p * 100).toFixed(1) + '%'

export function parseCometOpponent(raw: any): OpponentContext | null {

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

    return { target: text(raw.target), state: text(raw.state), sample: text(raw.sample), advantage: number(raw.advantage), scoreCap: number(raw.scoreCap),

        evidence: Array.isArray(raw.evidence) ? raw.evidence.slice(0, 4).filter((e: any) => e && typeof e === 'object' && !Array.isArray(e)).map((e: any) => ({

            kind: text(e.kind), value: text(e.value), source: text(e.source), age: number(e.age), observedAt: number(e.observedAt), confidence: probability(e.confidence), active: e.active === true })) : [] }

}

export function cometOpponentSummary(p: OpponentContext): string[] {

    return [`Assessment: ${p.state === 'estimated' ? 'uncertain estimate' : 'unknown / neutral'} · Score cap ±${p.scoreCap ?? '?'}`,

        ...p.evidence.map(e => `${cometReason(e.kind)}: ${cometReason(e.value)} · ${cometReason(e.source)} · ${e.age != null && e.age >= 0 ? e.age.toFixed(1) : '?'} s old · confidence ${cometProbability(e.confidence)}${e.active ? '' : ' (not used)'}`),

        'Evidence and confidence at this decision, not live enemy health or equipment. No other contact spotted does not prove the target is alone.']

}

export function cometOpponentEffect(c: { decision: string; scoreBeforeOpponent?: number; opponentDelta?: number; opponentReason?: string }): string {

    if (number(c.scoreBeforeOpponent) == null || number(c.opponentDelta) == null) return ''

    return `${c.decision}: ${c.scoreBeforeOpponent} → ${(c.scoreBeforeOpponent! + c.opponentDelta!).toFixed(2)} (${c.opponentDelta! >= 0 ? '+' : ''}${c.opponentDelta!.toFixed(2)}) · ${cometReason(c.opponentReason || '')}`

}

export function parseCometHandoff(raw: any): HandoffContext | null {

    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !['native-pending', 'native-observed', 'grace', 'kept', 'service-paused', 'service-revalidate'].includes(raw.state)) return null

    const positive = (v: unknown) => { const n = number(v); return n != null && n >= 0 ? n : undefined }

    return { state: raw.state, reason: text(raw.reason), kind: text(raw.kind), fromFeature: text(raw.fromFeature), fromAction: text(raw.fromAction),

        nativeCombat: text(raw.nativeCombat), nativeSelf: text(raw.nativeSelf), nativeSquad: text(raw.nativeSquad), nativeObserved: raw.state === 'native-observed' && raw.nativeObserved === true,

        at: positive(raw.at), retryRemaining: positive(raw.retryRemaining), graceRemaining: positive(raw.graceRemaining) }

}

export function cometHandoffSummary(h: HandoffContext): string[] {
    if (['kept', 'service-paused', 'service-revalidate'].includes(h.state)) return [
        `${h.fromAction ? formatDecisionLabel('COMET:' + h.fromAction) : 'Tactical plan'}: ${cometReason(h.reason)}`,
        h.state === 'kept' ? 'A brief missing check does not restart the plan. Confirmed danger still cancels it.'
            : h.state === 'service-paused' ? 'COMET chose the self action. SAIN/EFT execute it; this is not a tactical takeover.'
            : 'The saved plan is a candidate only. Current danger, target and route must still pass validation.'
    ]

    return [`${h.fromFeature || 'COMET'} ${h.fromAction || 'selection'}: ${cometReason(h.reason)}`,

        h.state === 'grace' ? `Verified movement continues briefly: ${h.graceRemaining?.toFixed(2) ?? '?'} s remaining at this event.`

            : h.nativeObserved ? `Next SAIN decision observed: combat ${h.nativeCombat || 'None'}, self ${h.nativeSelf || 'None'}, squad ${h.nativeSquad || 'None'}.`

            : 'COMET yielded. The next SAIN decision has not been observed yet.',

        h.state === 'grace' ? 'Confirmed failures and urgent actions get no grace.' : `COMET retry in ${h.retryRemaining?.toFixed(2) ?? '?'} s at this event. SAIN keeps acting.`,

        'Decision snapshot, not proof of execution or success. Failed-attempt memory is preserved.']

}

export function parseCometProgress(raw: any): ProgressContext | null {

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

    const n = (v: unknown) => { const x = number(v); return x != null && x >= 0 ? x : undefined }

    return { state: text(raw.state), reason: text(raw.reason), action: text(raw.action), attempt: text(raw.attempt), intent: text(raw.intent), lastOutcome: text(raw.lastOutcome), reconsider: raw.reconsider === true,

        at: n(raw.at), encounter: n(raw.encounter), holdSeconds: n(raw.holdSeconds), stalledSeconds: n(raw.stalledSeconds), movementSeconds: n(raw.movementSeconds),

        remaining: n(raw.remaining), progressMeters: n(raw.progressMeters), retryRemaining: n(raw.retryRemaining), failures: n(raw.failures) }

}

export function cometProgressSummary(p: ProgressContext): string[] {

    const f = (v: number | undefined) => v == null ? '?' : v.toFixed(2)

    return [`${p.state}: ${cometReason(p.reason)}`, `Idle hold ${f(p.holdSeconds)} s · No progress ${f(p.stalledSeconds)} s · Movement ${f(p.movementSeconds)} s`,

        `Useful progress ${f(p.progressMeters)} m · Path remaining ${f(p.remaining)} m`,

        `Retry in ${f(p.retryRemaining)} s · Failures ${p.failures ?? '?'} · Encounter ${p.encounter ?? '?'}`,

        ...(p.attempt ? [`Destination: ${p.attempt}`] : []), ...(p.intent && p.intent !== p.attempt ? [`Requested goal: ${p.intent}`] : []),

        ...(p.lastOutcome ? [`Last outcome: ${cometReason(p.lastOutcome)}`] : []),

        'Snapshot of executed work; pauses do not consume the timers.']

}

export function cometProgressEffect(c: { decision: string; scoreBeforeProgress?: number; progressDelta?: number; progressReason?: string }): string {

    if (!c.progressReason || c.progressReason === 'progress-neutral') return ''

    const delta = number(c.progressDelta)

    return `${c.decision}: ${cometReason(c.progressReason)}${delta != null && delta !== 0 ? ` (${delta >= 0 ? '+' : ''}${delta.toFixed(2)} points)` : ''}`

}

export function parseCometCoverResponse(raw: any): CoverResponseContext | null {

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

    const n = (v: unknown) => { const x = number(v); return x != null && x >= 0 ? x : undefined }

    return { state: text(raw.state), reason: text(raw.reason), target: text(raw.target), coverId: text(raw.coverId), travelMode: text(raw.travelMode),

        pathLength: n(raw.pathLength), eta: n(raw.eta), fastEta: n(raw.fastEta), exposedSeconds: n(raw.exposedSeconds),

        fastExposedSeconds: n(raw.fastExposedSeconds), knownThreats: n(raw.knownThreats), scoreCap: n(raw.scoreCap) }

}

export function cometCoverResponseSummary(p: CoverResponseContext): string[] {

    const f = (v?: number) => v == null ? '?' : v.toFixed(2)

    return [cometReason(p.reason), `Cover ${p.coverId || '?'} · Path ${f(p.pathLength)} m · Known threats ${p.knownThreats ?? '?'}`,

        `Estimated travel ${f(p.fastEta)}–${f(p.eta)} s · Estimated exposed travel ${f(p.fastExposedSeconds)}–${f(p.exposedSeconds)} s`,

        `Mobility: ${p.travelMode} · Score cap ±${f(p.scoreCap)}`,

        'Sampled route estimate at this decision, not a guarantee of safety or a prediction of death. Possible sprint is not guaranteed.']

}

export function cometCoverResponseEffect(c: { decision: string; scoreBeforeCoverResponse?: number; coverResponseDelta?: number; coverResponseReason?: string }): string {

    if (number(c.scoreBeforeCoverResponse) == null || number(c.coverResponseDelta) == null || !['Shoot', 'Cover'].includes(c.decision)) return ''

    return `${c.decision}: ${c.scoreBeforeCoverResponse} → ${(c.scoreBeforeCoverResponse! + c.coverResponseDelta!).toFixed(2)} (${c.coverResponseDelta! >= 0 ? '+' : ''}${c.coverResponseDelta!.toFixed(2)}) · ${cometReason(c.coverResponseReason || '')}`

}

export function parseCometOpportunity(raw: any): OpportunityContext | null {

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

    const n = (v: unknown) => { const x = number(v); return x != null && x >= 0 ? x : undefined }

    return { target: text(raw.target), cue: text(raw.cue), state: text(raw.state), reason: text(raw.reason), travelMode: text(raw.travelMode),

        episode: n(raw.episode), heardAt: n(raw.heardAt), age: n(raw.age), remaining: n(raw.remaining), window: n(raw.window),

        pathLength: n(raw.pathLength), eta: n(raw.eta), estimatedSpeed: n(raw.estimatedSpeed), routeRisk: n(raw.routeRisk),

        knownThreats: n(raw.knownThreats), bonus: n(raw.bonus), scoreCap: n(raw.scoreCap), safetyMargin: n(raw.safetyMargin) }

}

export function cometOpportunitySummary(p: OpportunityContext): string[] {

    const f = (v?: number) => v == null ? '?' : v.toFixed(2)

    return [`Personally heard ${p.cue || 'unknown cue'} · ${p.state} · ${cometReason(p.reason)}`,

        `Episode ${p.episode ?? '?'} · Original cue ${f(p.age)} s old · Estimated time left ${f(p.remaining)} s of ${f(p.window)} s`,

        `Path ${f(p.pathLength)} m · Estimated travel ${f(p.eta)} s + ${f(p.safetyMargin)} s margin · ${p.travelMode}`,

        `Route risk ${f(p.routeRisk)} · Known threats ${p.knownThreats ?? '?'} · Push bonus +${f(p.bonus)} (cap ${f(p.scoreCap)})`,

        'Snapshot at this decision. This does not confirm the enemy was still busy. Repeated sounds never extend the original window.']

}

export function cometOpportunityEffect(c: { decision: string; scoreBeforeOpportunity?: number; opportunityDelta?: number; opportunityReason?: string }): string {

    if (number(c.scoreBeforeOpportunity) == null || number(c.opportunityDelta) == null || c.decision !== 'Push') return ''

    return `${c.decision}: ${c.scoreBeforeOpportunity} → ${(c.scoreBeforeOpportunity! + c.opportunityDelta!).toFixed(2)} (+${c.opportunityDelta!.toFixed(2)}) · ${cometReason(c.opportunityReason || '')}`

}

export function parseCometLoadout(raw: any): LoadoutContext | null {

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

    const count = (v: unknown) => { const n = number(v); return n != null && n >= 0 ? n : undefined }

    return { state: text(raw.state), weapon: text(raw.weapon), weaponClass: text(raw.weaponClass), profile: text(raw.profile), optic: text(raw.optic), ammo: text(raw.ammo),

        idealRange: count(raw.idealRange), loadedRounds: count(raw.loadedRounds), compatibleMagazines: count(raw.compatibleMagazines), looseRounds: count(raw.looseRounds),

        grenades: count(raw.grenades), medicalItems: count(raw.medicalItems), scoreCap: count(raw.scoreCap), resourcesKnown: raw.resourcesKnown === true,

        canFirstAid: raw.canFirstAid === true, canSurgery: raw.canSurgery === true, ready: raw.ready === true,

        refreshReason: text(raw.refreshReason), resourceReason: text(raw.resourceReason) }

}

export function cometLoadoutSummary(p: LoadoutContext): string[] {

    if (p.state !== 'ready') return [`Equipment: ${cometReason(p.state)} · No equipment adjustment`,

        'Current range and supplies are not used while equipment is unavailable.',

        `Snapshot at decision. Refresh: ${cometReason(p.refreshReason)}`]

    return [`${p.weapon || 'Weapon not recorded'} · ${p.weaponClass || 'Unknown class'} · ${p.optic || 'Unknown sight'}${p.ammo ? ' · ' + p.ammo : ''}`,

        `Equipment: ${cometReason(p.state)} · Preferred distance ${p.idealRange?.toFixed(0) ?? '?'} m · Score cap ±${p.scoreCap ?? '?'}`,

        `Loaded rounds: ${p.loadedRounds ?? '?'} · Weapon ready: ${p.ready ? 'yes' : 'no'}`,

        p.resourcesKnown ? `Compatible loaded magazines: ${p.compatibleMagazines ?? '?'} · Compatible loose rounds: ${p.looseRounds ?? '?'} · Grenades: ${p.grenades ?? '?'}` : 'Supplies unknown: no resource bonus',

        `Can treat current injury: first aid ${p.canFirstAid ? 'yes' : 'no'}, surgery ${p.canSurgery ? 'yes' : 'no'}`,

        `Snapshot at decision. Refresh: ${cometReason(p.refreshReason)}${p.resourceReason ? ' · ' + cometReason(p.resourceReason) : ''}`]

}

export function cometLoadoutEffect(c: { decision: string; scoreBeforeLoadout?: number; loadoutDelta?: number; loadoutReason?: string; scoreBeforeOpponent?: number; opponentDelta?: number; opponentReason?: string }): string {

    if (number(c.scoreBeforeLoadout) == null || number(c.loadoutDelta) == null) return ''

    return `${c.decision}: ${c.scoreBeforeLoadout} → ${(c.scoreBeforeLoadout! + c.loadoutDelta!).toFixed(2)} (${c.loadoutDelta! >= 0 ? '+' : ''}${c.loadoutDelta!.toFixed(2)}) · ${cometReason(c.loadoutReason || '')}`

}

export function parseCometThreat(raw: any): ThreatContext | null {

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

    return { previous: text(raw.previous), selected: text(raw.selected), reason: text(raw.reason), trigger: text(raw.trigger), at: number(raw.at),

        holdRemaining: number(raw.holdRemaining), margin: probability(raw.margin), emergency: raw.emergency === true, truncated: raw.truncated === true,

        candidates: Array.isArray(raw.candidates) ? raw.candidates.slice(0, 32).filter((c: any) => c && typeof c.target === 'string').map((c: any) => ({

            target: c.target, eligible: c.eligible === true, reason: text(c.reason), source: text(c.source), age: number(c.age), distance: number(c.distance),

            visible: c.visible === true, immediate: c.immediate === true, score: number(c.score), sight: number(c.sight), hit: number(c.hit),

            fire: number(c.fire), proximity: number(c.proximity), facing: number(c.facing), steps: number(c.steps),

        })) : [] }

}

export function cometThreatSummary(t: ThreatContext, names: Record<string, string> = {}): string[] {

    const name = (id: string) => names[id] || id || 'None'

    return [`${name(t.previous)} → ${name(t.selected)}${t.emergency ? ' · Urgent switch' : ''}`, cometReason(t.reason),

        `Target hold remaining at decision: ${t.holdRemaining?.toFixed(2) ?? '?'} s · Required advantage ${cometProbability(t.margin)}`,

        `Trigger: ${cometReason(t.trigger)}${t.truncated ? ' · Contact scan incomplete' : ''}`]

}

export function cometThreatCandidate(c: ThreatCandidate, names: Record<string, string> = {}): string {

    return `${names[c.target] || c.target}: ${c.eligible ? 'score ' + (c.score?.toFixed(1) ?? '?') : 'unavailable'} · ${cometReason(c.reason)} · ${c.source || 'unknown source'}${c.age != null ? ' · ' + c.age.toFixed(1) + ' s old' : ''}${c.distance != null ? ' · ' + c.distance.toFixed(1) + ' m at decision' : ''}`

}

export function cometThreatComponents(c: ThreatCandidate): string {

    return `Sight ${c.sight?.toFixed(1) ?? '?'} · Hit ${c.hit?.toFixed(1) ?? '?'} · Incoming fire ${c.fire?.toFixed(1) ?? '?'} · Proximity ${c.proximity?.toFixed(1) ?? '?'} · Facing ${c.facing?.toFixed(1) ?? '?'} · Footsteps ${c.steps?.toFixed(1) ?? '?'}`

}

export function parseCometFear(raw: any): FearContext | null {

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

    return { level: probability(raw.level), target: probability(raw.target), base: probability(raw.base), sensitivity: number(raw.sensitivity), multiplier: number(raw.multiplier),

        injury: probability(raw.injury), allyDeath: probability(raw.allyDeath), outnumbered: probability(raw.outnumbered), suppression: probability(raw.suppression),

        scoreCap: number(raw.scoreCap), knownEnemies: number(raw.knownEnemies), availableAllies: number(raw.availableAllies), countsTruncated: raw.countsTruncated === true,

        panic: raw.panic === true, transition: text(raw.transition), deathSource: text(raw.deathSource), at: number(raw.at), deathAt: number(raw.deathAt), panicChangedAt: number(raw.panicChangedAt) }

}

export function cometFearSummary(f: FearContext): string[] {

    return [`Fear ${cometProbability(f.level)} → target ${cometProbability(f.target)} · ${f.panic ? 'PANIC' : 'Not panicking'}${f.panicChangedAt != null && f.at != null ? ' · ' + f.transition + ' ' + Math.max(0, f.at-f.panicChangedAt).toFixed(1) + ' s ago' : ''}`,

        `Base ${cometProbability(f.base)} · Sensitivity ${f.sensitivity ?? '?'} · Multiplier ${f.multiplier ?? '?'}`,

        `Before sensitivity: injury ${cometProbability(f.injury)} · witnessed death ${cometProbability(f.allyDeath)} · numbers ${cometProbability(f.outnumbered)} · suppression ${cometProbability(f.suppression)}`,

        `Known enemies ${f.knownEnemies ?? '?'} · supporting allies ${f.availableAllies ?? '?'}${f.countsTruncated ? ' · incomplete counts: no numbers penalty' : ''}`,

        `Extra score influence capped at ${f.scoreCap ?? '?'} points${f.deathAt != null && f.at != null ? ' · Death witnessed ' + Math.max(0, f.at - f.deathAt).toFixed(1) + ' s ago' : ''}`]

}

export function cometMistakeSummary(m: MistakeContext): string[] {

    const label = (s: string) => s ? formatDecisionLabel('COMET:' + s) : 'Not recorded'

    return [cometReason(m.state), `Best: ${label(m.best)} (${m.bestScore ?? '?'}) → Selected: ${label(m.selected)} (${m.selectedScore ?? '?'})`,

        `Score loss ${cometProbability(m.scoreLoss)} · Limit ${cometProbability(m.maxLoss)}`,

        `Configured chance ${cometProbability(m.chance)} · ${m.roll != null ? 'Roll ' + m.roll.toFixed(6) : 'No mistake draw'}`,

        `At original selection${m.at != null ? ' (' + m.at.toFixed(2) + ' s)' : ''}${m.at != null && m.nextAllowedAt != null ? ': ' + Math.max(0, m.nextAllowedAt - m.at).toFixed(1) + ' s until another mistake is allowed' : ''}`]

}



export function prepareCometMapEvents(rows: unknown[], profileId: string): CometMapEvent[] {

    const events: CometMapEvent[] = []

    for (const raw of rows as any[]) {

        if (!raw || raw.profileId !== profileId || number(raw.time) === undefined || raw.time < 0

            || number(raw.id) === undefined || (!['selected', 'accepted', 'rejected', 'released', 'evaluated'].includes(raw.stage) && !isMagazineRecoveryEvent(raw))) continue

        let detail = raw.detail

        if (typeof detail === 'string') { try { detail = JSON.parse(detail) } catch { detail = null } }

        const progress = parseCometProgress(detail?.progress)

        const controlHandoff = raw.feature === 'I02' ? parseCometControlHandoff(detail?.controlHandoff) : null
        if(raw.feature === 'I02' && (raw.stage !== 'evaluated' || raw.decision !== 'ControlHandoff' || !controlHandoff)) continue
        const handoff = parseCometHandoff(detail?.handoff)

        const hearing = parseCometHearing(detail?.hearing)

        const quiet = parseCometQuiet(detail?.quiet)

        const gunfire = parseCometGunfire(detail?.gunfire)

        const floorHearing = parseCometFloorHearing(detail?.floorHearing)

        const closeDetection = parseCometCloseDetection(detail?.closeDetection)
        const readyStance = parseCometReadyStance(detail?.readyStance)
        if(raw.feature === 'H05' && (raw.decision !== 'ReadyStance' || raw.stage !== 'evaluated' || !readyStance)) continue
        const validity = parseCometValidity(detail?.validity)
        if(raw.feature === 'C10' && (raw.decision !== 'Validity' || raw.stage !== 'evaluated' || !validity)) continue
        if(validity && raw.feature !== 'C10') continue
        const lifecycle = parseCometLifecycle(detail?.lifecycle)
        if(raw.feature === 'C09' && (raw.decision !== 'Lifecycle' || raw.stage !== 'evaluated' || !lifecycle)) continue
        if(lifecycle && raw.feature !== 'C09') continue
        const faultIsolation = parseCometFaultIsolation(detail?.faultIsolation)
        if(raw.feature === 'C08' && (raw.decision !== 'FaultIsolation' || raw.stage !== 'evaluated' || !faultIsolation)) continue
        if(faultIsolation && raw.feature !== 'C08') continue
        const coverScan = parseCometCoverScan(detail?.coverScan)
        if(raw.feature === 'C07' && (raw.decision !== 'CoverScan' || raw.stage !== 'evaluated' || !coverScan)) continue
        if(coverScan && raw.feature !== 'C07') continue
        const movementRecovery = parseCometMovementRecovery(detail?.movementRecovery)
        const doorClosing = parseCometDoorClosing(detail?.doorClosing)
        if(raw.feature === 'C06' && (raw.decision !== 'MovementRecovery' || raw.stage !== 'evaluated' || !movementRecovery)) continue
        if(raw.feature === 'C05' && (raw.decision !== 'DoorClosing' || raw.stage !== 'evaluated' || !doorClosing)) continue
        if(movementRecovery && raw.feature !== 'C06') continue
        if(doorClosing && raw.feature !== 'C05') continue
        const doorMotion = parseCometDoorMotion(detail?.doorMotion)
        if(raw.feature === 'C04' && (raw.decision !== 'DoorMotion' || raw.stage !== 'evaluated' || !doorMotion)) continue
        if(doorMotion && raw.feature !== 'C04') continue
        const doorSpatial = parseCometDoorSpatial(detail?.doorSpatial)
        if(raw.feature === 'C03' && (raw.decision !== 'DoorGeometry' || raw.stage !== 'evaluated' || !doorSpatial)) continue
        if(doorSpatial && raw.feature !== 'C03') continue
        const doorRecovery = parseCometDoorRecovery(detail?.doorRecovery)
        if(raw.feature === 'C02' && (raw.decision !== 'DoorRecovery' || raw.stage !== 'evaluated' || !doorRecovery)) continue
        if(doorRecovery && raw.feature !== 'C02') continue
        const doorTransit = parseCometDoorTransit(detail?.doorTransit)
        if(raw.feature === 'C01' && (raw.decision !== 'DoorTransit' || raw.stage !== 'evaluated' || !doorTransit)) continue
        if(doorTransit && raw.feature !== 'C01') continue
        const outcome = parseCometOutcome(detail?.outcome)
        if(raw.feature === 'E04' && (raw.decision !== 'TacticalOutcome' || raw.stage !== 'evaluated' || !outcome)) continue
        if(outcome && !['E04','A01','A02'].includes(raw.feature)) continue
        const encounter = parseCometEncounter(detail?.encounter)
        if (raw.feature === 'E03' && (raw.decision !== 'EncounterAdaptation' || raw.stage !== 'evaluated' || !encounter)) continue
        if (encounter && raw.feature !== 'E03' && raw.feature !== 'A01') continue
        const restLights = parseCometRestLights(detail?.restLights)
        if (raw.feature === 'L03' && (raw.decision !== 'RestLights' || raw.stage !== 'evaluated' || !restLights)) continue
        if (restLights && raw.feature !== 'L03') continue
        const tacticalDevices = parseCometTacticalDevices(detail?.tacticalDevices)
        if (raw.feature === 'L02' && (raw.decision !== 'TacticalDevices' || raw.stage !== 'evaluated' || !tacticalDevices)) continue
        if (tacticalDevices && raw.feature !== 'L02') continue
        const lightDiscipline = parseCometLightDiscipline(detail?.lightDiscipline)
        if (raw.feature === 'L01' && (raw.decision !== 'LightDiscipline' || raw.stage !== 'evaluated' || !lightDiscipline)) continue
        if (lightDiscipline && raw.feature !== 'L01') continue
        const squadVoice = parseCometSquadVoice(detail?.squadVoice)
        if (raw.feature === 'S09' && (raw.decision !== 'SquadVoice' || raw.stage !== 'evaluated' || !squadVoice)) continue
        if (squadVoice && raw.feature !== 'S09') continue
        const squadFire = parseCometSquadFire(detail?.squadFire)
        if (raw.feature === 'S08' && (raw.decision !== 'SquadFire' || raw.stage !== 'evaluated' || !squadFire)) continue
        if (squadFire && raw.feature !== 'S08') continue
        const fireLane = parseCometFireLane(detail?.fireLane)
        if (raw.feature === 'S07' && (raw.decision !== 'FireLane' || raw.stage !== 'evaluated' || !fireLane)) continue
        if (fireLane && raw.feature !== 'S07') continue
        const crossfire = parseCometCrossfire(detail?.crossfire)
        if(['S01','S02','S03','S04','S05','S06'].includes(raw.feature) && (raw.decision !== 'Crossfire' || raw.stage !== 'evaluated' || !crossfire || (raw.feature === 'S06') !== !!crossfire.storm || (raw.feature === 'S05') !== !!crossfire.trade || (raw.feature === 'S04') !== !!crossfire.coverMate || (raw.feature === 'S03') !== !!crossfire.maneuver || (raw.feature === 'S02') !== !!crossfire.entrance)) continue
        const postCombat = parseCometPostCombat(detail?.postCombat)
        const medicalPosture = parseCometMedicalPosture(detail?.medicalPosture)
        if(raw.feature === 'H04' && (raw.decision !== 'PostCombat' || raw.stage !== 'evaluated' || !postCombat)) continue
        if(raw.feature === 'H03' && (raw.decision !== 'MedicalPosture' || raw.stage !== 'evaluated' || !medicalPosture)) continue
        const surgeryInterruption = parseCometSurgeryInterruption(detail?.surgeryInterruption)
        if(raw.feature === 'H02' && (raw.decision !== 'SurgeryInterruption' || raw.stage !== 'evaluated' || !surgeryInterruption)) continue
        const medicalChoice = parseCometMedicalChoice(detail?.medicalChoice)
        if(raw.feature === 'H01' && (raw.decision !== 'MedicalChoice' || raw.stage !== 'evaluated' || !medicalChoice)) continue
        const explosionAwareness = parseCometExplosionAwareness(detail?.explosionAwareness)
        if (raw.feature === 'G10' && (raw.decision !== 'ExplosionAwareness' || raw.stage !== 'evaluated' || !explosionAwareness)) continue
        const flashContinuity = parseCometFlashContinuity(detail?.flashContinuity)
        const gasExposure = parseCometGasExposure(detail?.gasExposure)
        const grenadeFilter = parseCometGrenadeFilter(detail?.grenadeFilter)
        const grenadeDispersion = parseCometGrenadeDispersion(detail?.grenadeDispersion)
        const grenadeReaction = parseCometGrenadeReaction(detail?.grenadeReaction)
        const ownGrenadeSafety = parseCometOwnGrenadeSafety(detail?.ownGrenadeSafety)
        const grenadeChoice = parseCometGrenadeChoice(detail?.grenadeChoice)
        const grenadeTrajectory = parseCometGrenadeTrajectory(detail?.grenadeTrajectory)
        const grenadeJudgment = parseCometGrenadeJudgment(detail?.grenadeJudgment)
        const handsRecovery = parseCometHandsRecovery(detail?.handsRecovery)
        const recoilRecovery = parseCometRecoilRecovery(detail?.recoilRecovery)
        const shotGeometry = parseCometShotGeometry(detail?.shotGeometry)
        const suppressionDiscipline = parseCometSuppressionDiscipline(detail?.suppressionDiscipline)
        const weaponSync = parseCometWeaponSync(detail?.weaponSync)
        const weaponRange = parseCometWeaponRange(detail?.weaponRange)
        const magazineRecovery = isMagazineRecoveryEvent(raw) ? parseMagazineRecovery(detail?.magazineRecovery, raw.stage) : null
        const quickReload = parseCometQuickReload(detail?.quickReload)
        const controlJournal = raw.feature==='T04'?parseCometJournal(detail,raw.feature):null
        if(raw.feature==='T04'&&(!controlJournal||raw.stage!=='evaluated'))continue
        const journal = raw.feature==='T04'?null:parseCometJournal(detail,raw.feature)
        if (['T01','T03'].includes(raw.feature) && (!journal || raw.stage !== 'evaluated')) continue
        const weaponReturn = parseCometWeaponReturn(detail?.weaponReturn)
        const pistolSwap = parseCometPistolSwap(detail?.pistolSwap)
        const reloadTiming = parseCometReloadTiming(detail?.reloadTiming)
        const coverFeint = parseCometCoverFeint(detail?.coverFeint)
        const outdoorRelocation = parseCometOutdoorRelocation(detail?.outdoorRelocation)
        const tacticalJump = parseCometTacticalJump(detail?.tacticalJump)
        const retreatWeave = parseCometRetreatWeave(detail?.retreatWeave)
        const adsTravel = parseCometAdsTravel(detail?.adsTravel)
        const coverTravel = parseCometCoverTravel(detail?.coverTravel)
        const holdAngle = parseCometHoldAngle(detail?.holdAngle)
        const angleWatch = parseCometAngleWatch(detail?.angleWatch)
        const cornerPrefire = parseCometCornerPrefire(detail?.cornerPrefire)
        const cornerChase = parseCometCornerChase(detail?.cornerChase)
        const combatLean = parseCometCombatLean(detail?.combatLean)
        const cornerPeek = parseCometCornerPeek(detail?.cornerPeek)
        const firePause = parseCometFirePause(detail?.firePause)
        const combatStep = parseCometCombatStep(detail?.combatStep)
        const doorEntry = parseCometDoorEntry(detail?.doorEntry)
        const doorReservation = parseCometDoorReservation(detail?.doorReservation)
        const doorEmergency = parseCometDoorEmergency(detail?.doorEmergency)
        const doorInterruption = parseCometDoorInterruption(detail?.doorInterruption)
        const doorSupport = parseCometDoorSupport(detail?.doorSupport)
        const doorHold = parseCometDoorHold(detail?.doorHold)
        const doorAmbush = parseCometDoorAmbush(detail?.doorAmbush)
        const doorRoomClear = parseCometDoorClear(detail?.doorRoomClear)
        const doorFakeMedical = parseCometDoorMedical(detail?.doorFakeMedical)
        const doorFakeGrenade = parseCometDoorFake(detail?.doorFakeGrenade)
        const doorStepPeek = parseCometDoorStep(detail?.doorStepPeek)
        const doorRunBy = parseCometDoorRun(detail?.doorRunBy)
        const doorJumpPeek = parseCometDoorJump(detail?.doorJumpPeek)
        const doorApproach = parseCometDoor(detail?.doorApproach)
        const environmentContext = parseCometEnvironment(detail?.environmentContext)
        const searchAbandonment = parseCometSearchAbandonment(detail?.searchAbandonment)
        const silentSearch = parseCometSilentSearch(detail?.silentSearch)
        const impact = parseCometImpact(detail?.impact)

        if (raw.feature === 'G09' && (raw.decision !== 'FlashContinuity' || raw.stage !== 'evaluated' || !flashContinuity)) continue
        if (raw.feature === 'G08' && (raw.decision !== 'GasExposure' || raw.stage !== 'evaluated' || !gasExposure)) continue
        if (raw.feature === 'G07' && (raw.decision !== 'GrenadeFilter' || raw.stage !== 'evaluated' || !grenadeFilter)) continue
        if (raw.feature === 'G06' && (raw.decision !== 'GrenadeDispersion' || raw.stage !== 'evaluated' || !grenadeDispersion)) continue
        if (raw.feature === 'G05' && (raw.decision !== 'GrenadeReaction' || raw.stage !== 'evaluated' || !grenadeReaction)) continue
        if (raw.feature === 'G04' && (raw.decision !== 'OwnGrenadeSafety' || raw.stage !== 'evaluated' || !ownGrenadeSafety)) continue
        if (raw.feature === 'G03' && (raw.decision !== 'GrenadeChoice' || raw.stage !== 'evaluated' || !grenadeChoice)) continue
        if (raw.feature === 'G02' && (raw.decision !== 'GrenadeTrajectory' || raw.stage !== 'evaluated' || !grenadeTrajectory)) continue
        if (raw.feature === 'G01' && (raw.decision !== 'GrenadeJudgment' || raw.stage !== 'evaluated' || !grenadeJudgment)) continue
        if (raw.feature === 'W10' && (raw.decision !== 'HandsRecovery' || raw.stage !== 'evaluated' || !handsRecovery)) continue
        if (raw.feature === 'W09' && (raw.decision !== 'RecoilRecovery' || raw.stage !== 'evaluated' || !recoilRecovery)) continue
        if (raw.feature === 'W08' && (raw.decision !== 'ShotGeometry' || raw.stage !== 'evaluated' || !shotGeometry)) continue
        if (raw.feature === 'W07' && (raw.decision !== 'SuppressionDiscipline' || raw.stage !== 'evaluated' || !suppressionDiscipline)) continue
        if (raw.feature === 'W06' && (raw.decision !== 'WeaponSync' || raw.stage !== 'evaluated' || !weaponSync)) continue
        if (raw.feature === 'W05' && (raw.decision !== 'WeaponRange' || raw.stage !== 'evaluated' || !weaponRange)) continue
        if (raw.feature === 'W04' && !magazineRecovery && (raw.decision !== 'QuickReload' || raw.stage !== 'evaluated' || !quickReload)) continue
        if (raw.feature === 'W03' && (raw.decision !== 'WeaponReturn' || raw.stage !== 'evaluated' || !weaponReturn)) continue
        if (raw.feature === 'W02' && (raw.decision !== 'PistolSwap' || raw.stage !== 'evaluated' || !pistolSwap)) continue
        if (raw.feature === 'W01' && (raw.decision !== 'ReloadTiming' || raw.stage !== 'evaluated' || !reloadTiming)) continue
        if (raw.feature === 'M14' && (raw.decision !== 'CoverFeint' || raw.stage !== 'evaluated' || !coverFeint)) continue
        if (raw.feature === 'M13' && (raw.decision !== 'OutdoorRelocation' || raw.stage !== 'evaluated' || !outdoorRelocation)) continue
        if (raw.feature === 'M12' && (raw.decision !== 'TacticalJump' || raw.stage !== 'evaluated' || !tacticalJump)) continue
        if (raw.feature === 'M11' && (raw.decision !== 'RetreatWeave' || raw.stage !== 'evaluated' || !retreatWeave)) continue
        if (raw.feature === 'M10' && (raw.decision !== 'AdsTravel' || raw.stage !== 'evaluated' || !adsTravel)) continue
        if (raw.feature === 'M09' && (raw.decision !== 'CoverTravel' || raw.stage !== 'evaluated' || !coverTravel)) continue
        if (raw.feature === 'M08' && (raw.decision !== 'HoldAngle' || raw.stage !== 'evaluated' || !holdAngle)) continue
        if (raw.feature === 'M07' && (raw.decision !== 'AngleWatch' || raw.stage !== 'evaluated' || !angleWatch)) continue
        if (raw.feature === 'M06' && (raw.decision !== 'CornerPrefire' || raw.stage !== 'evaluated' || !cornerPrefire)) continue
        if (raw.feature === 'M05' && (raw.decision !== 'CornerChase' || raw.stage !== 'evaluated' || !cornerChase)) continue
        if (raw.feature === 'M04' && (raw.decision !== 'CombatLean' || raw.stage !== 'evaluated' || !combatLean)) continue
        if (raw.feature === 'M03' && (raw.decision !== 'CornerPeek' || raw.stage !== 'evaluated' || !cornerPeek)) continue
        if (raw.feature === 'M02' && (raw.decision !== 'FirePause' || raw.stage !== 'evaluated' || !firePause)) continue
        if (raw.feature === 'M01' && (raw.decision !== 'CombatStep' || raw.stage !== 'evaluated' || !combatStep)) continue
        if (raw.feature === 'D15' && (raw.decision !== 'DoorEntry' || raw.stage !== 'evaluated' || !doorEntry)) continue
        if (raw.feature === 'D14' && (raw.decision !== 'DoorReservation' || raw.stage !== 'evaluated' || !doorReservation)) continue
        if (raw.feature === 'D13' && raw.decision === 'DoorEmergency' && raw.stage !== 'evaluated') continue
        if (raw.feature === 'D12' && raw.decision === 'DoorInterruption' && raw.stage !== 'evaluated') continue
        if (raw.feature === 'D11' && raw.decision === 'DoorSupport' && raw.stage !== 'evaluated') continue
        if (['P01', 'P02', 'P03', 'P04', 'P05', 'P07', 'P08', 'P09', 'P10', 'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10'].includes(raw.feature) && raw.stage !== 'evaluated') continue

        if (raw.feature === 'A13' && raw.stage === 'accepted') continue // A13 never owns a combat action.

        if (raw.stage === 'evaluated' && !journal && !controlJournal && !controlHandoff && !validity && !lifecycle && !faultIsolation && !coverScan && !movementRecovery && !doorClosing && !doorMotion && !doorSpatial && !doorRecovery && !doorTransit && !outcome && !encounter && !progress && !handoff && !hearing && !quiet && !gunfire && !floorHearing && !closeDetection && !impact && !silentSearch && !searchAbandonment && !environmentContext && !doorApproach && !doorJumpPeek && !doorRunBy && !doorStepPeek && !doorFakeGrenade && !doorFakeMedical && !doorRoomClear && !doorAmbush && !doorHold && !doorSupport && !doorInterruption && !doorEmergency && !doorReservation && !doorEntry && !combatStep && !firePause && !cornerPeek && !combatLean && !cornerChase && !cornerPrefire && !angleWatch && !holdAngle && !coverTravel && !adsTravel && !retreatWeave && !restLights && !tacticalDevices && !lightDiscipline && !squadVoice && !squadFire && !fireLane && !tacticalJump && !outdoorRelocation && !coverFeint && !reloadTiming && !pistolSwap && !weaponReturn && !quickReload && !weaponRange && !weaponSync && !suppressionDiscipline && !shotGeometry && !recoilRecovery && !readyStance && !crossfire && !postCombat && !medicalPosture && !surgeryInterruption && !medicalChoice && !explosionAwareness && !flashContinuity && !gasExposure && !grenadeFilter && !grenadeDispersion && !grenadeReaction && !ownGrenadeSafety && !grenadeChoice && !grenadeTrajectory && !grenadeJudgment && !handsRecovery) continue

        const c = detail?.contact

        const v = detail?.visible

        const h = detail?.continuity

        events.push({ id: raw.id, time: raw.time, profileId, cometSession: text(raw.cometSession), sequence: number(raw.sequence) ?? 0,

            feature: text(raw.feature), decision: text(raw.decision), stage: raw.stage, reason: text(raw.reason), instance: text(detail?.botInstance),

            choiceReason: text(raw.reason), contact: c && typeof c === 'object' ? {

                target: text(c.target), source: text(c.source), age: number(c.age), distance: number(c.distance),

                x: number(c.x), y: number(c.y), z: number(c.z),

            } : null,

            visible: v && typeof v === 'object' ? { currentExposure: number(v.currentExposure), coverRouteRisk: number(v.coverRouteRisk),

                pushRouteRisk: number(v.pushRouteRisk), knownThreats: number(v.knownThreats), coverId: text(v.coverId), probeAge: number(v.probeAge) } : null,

            continuity: h && typeof h === 'object' ? { previousAction: text(h.previousAction), remaining: number(h.remaining),

                lostFor: number(h.lostFor), frozenRoute: h.frozenRoute === true } : null,

            mixing: parseCometMixing(detail?.mixing),

            fear: parseCometFear(detail?.fear),

            loadout: parseCometLoadout(detail?.loadout),

            opponent: parseCometOpponent(detail?.opponent),

            controlHandoff, controlIndex: -1, progress, progressIndex: -1, handoff, handoffIndex: -1,

            hearing, hearingIndex: -1, quiet, quietIndex: -1, gunfire, gunfireIndex: -1, floorHearing, floorIndex: -1, closeDetection, closeIndex: -1, impact, impactIndex: -1, silentSearch, silentIndex: -1, searchAbandonment, abandonmentIndex: -1, environmentContext, environmentIndex: -1, doorApproach, doorIndex: -1, doorJumpPeek, jumpIndex: -1, doorRunBy, runIndex: -1, doorStepPeek, stepIndex: -1, doorFakeMedical, doorFakeGrenade, fakeIndex: -1, doorRoomClear, clearIndex: -1, doorAmbush, ambushIndex: -1, doorHold, holdIndex: -1, doorSupport, supportIndex: -1, doorInterruption, interruptionIndex: -1, doorEmergency, emergencyIndex: -1, doorReservation, reservationIndex: -1, doorEntry, entryIndex: -1, combatStep, combatIndex: -1, firePause, pauseIndex: -1, cornerPeek, cornerIndex: -1, combatLean, leanIndex: -1, cornerChase, chaseIndex: -1, cornerPrefire, prefireIndex: -1, angleWatch, angleIndex: -1, holdAngle, holdAngleIndex: -1, coverTravel, travelIndex: -1, adsTravel, adsIndex: -1, retreatWeave, weaveIndex: -1, tacticalJump, tacticalJumpIndex: -1, outdoorRelocation, relocationIndex: -1, coverFeint, feintIndex: -1, reloadTiming, reloadIndex: -1, pistolSwap, pistolIndex: -1, controlJournal, controlJournalIndex: -1, motionIndex: -1, journal, journalIndex: -1, weaponReturn, weaponReturnIndex: -1, magazineRecovery, magazineRecoveryIndex: -1, quickReload, quickReloadIndex: -1, weaponRange, weaponRangeIndex: -1, weaponSync, weaponSyncIndex: -1, suppressionDiscipline, suppressionDisciplineIndex: -1, readyStance, readyStanceIndex: -1, validity, validityIndex: -1, lifecycle, lifecycleIndex: -1, faultIsolation, faultIsolationIndex: -1, coverScan, coverScanIndex: -1, movementRecovery, movementRecoveryIndex: -1, doorClosing, doorClosingIndex: -1, doorMotion, doorMotionIndex: -1, doorSpatial, doorSpatialIndex: -1, doorRecovery, doorRecoveryIndex: -1, doorTransit, doorTransitIndex: -1, outcome, outcomeIndex: -1, encounter, encounterIndex: -1, restLights, restLightsIndex: -1, tacticalDevices, tacticalDevicesIndex: -1, lightDiscipline, lightDisciplineIndex: -1, squadVoice, squadVoiceIndex: -1, squadFire, squadFireIndex: -1, fireLane, fireLaneIndex: -1, crossfire, crossfireIndex: -1, postCombat, postCombatIndex: -1, medicalPosture, medicalPostureIndex: -1, surgeryInterruption, surgeryInterruptionIndex: -1, medicalChoice, medicalChoiceIndex: -1, explosionAwareness, explosionAwarenessIndex: -1, flashContinuity, flashContinuityIndex: -1, gasExposure, gasExposureIndex: -1, grenadeFilter, grenadeFilterIndex: -1, grenadeDispersion, grenadeDispersionIndex: -1, grenadeReaction, grenadeReactionIndex: -1, ownGrenadeSafety, ownGrenadeSafetyIndex: -1, grenadeChoice, grenadeChoiceIndex: -1, grenadeTrajectory, grenadeTrajectoryIndex: -1, grenadeJudgment, grenadeJudgmentIndex: -1, handsRecovery, handsRecoveryIndex: -1, recoilRecovery, recoilRecoveryIndex: -1, shotGeometry, shotGeometryIndex: -1,

            coverResponse: parseCometCoverResponse(detail?.coverResponse),

            opportunity: parseCometOpportunity(detail?.opportunity),

            threat: parseCometThreat(detail?.threat), actionIndex: -1, attentionIndex: -1,

            candidates: Array.isArray(detail?.candidates) ? detail.candidates.slice(0, 32).filter((v: any) => v && typeof v.decision === 'string').map((v: any) => ({

                decision: v.decision, eligible: v.eligible === true, score: number(v.score) ?? null, reason: text(v.reason),

                scoreBeforeFear: number(v.scoreBeforeFear), fearDelta: number(v.fearDelta),

                scoreBeforeOpponent: number(v.scoreBeforeOpponent), opponentDelta: number(v.opponentDelta), opponentReason: text(v.opponentReason),

                scoreBeforeProgress: number(v.scoreBeforeProgress), progressDelta: number(v.progressDelta), progressReason: text(v.progressReason),

                scoreBeforeCoverResponse: number(v.scoreBeforeCoverResponse), coverResponseDelta: number(v.coverResponseDelta), coverResponseReason: text(v.coverResponseReason),

                scoreBeforeOpportunity: number(v.scoreBeforeOpportunity), opportunityDelta: number(v.opportunityDelta), opportunityReason: text(v.opportunityReason),

                scoreBeforeLoadout: number(v.scoreBeforeLoadout), loadoutDelta: number(v.loadoutDelta), loadoutReason: text(v.loadoutReason),

            })) : [],

        })

    }

    events.sort((a, b) => a.time - b.time || (a.cometSession === b.cometSession ? a.sequence - b.sequence : 0) || a.id - b.id)

    let selected: CometMapEvent | undefined

    let motionIndex = -1; let controlJournalIndex = -1; let journalIndex = -1; let controlIndex = -1;
    let validityIndex = -1, lifecycleIndex = -1, faultIsolationIndex = -1, coverScanIndex = -1, movementRecoveryIndex = -1, doorClosingIndex = -1, doorMotionIndex = -1, doorSpatialIndex = -1, doorRecoveryIndex = -1, doorTransitIndex = -1, outcomeIndex = -1, encounterIndex = -1, restLightsIndex = -1, tacticalDevicesIndex = -1, lightDisciplineIndex = -1, squadVoiceIndex = -1, squadFireIndex = -1, fireLaneIndex = -1, actionIndex = -1, attentionIndex = -1, progressIndex = -1, handoffIndex = -1, hearingIndex = -1, quietIndex = -1, gunfireIndex = -1, floorIndex = -1, closeIndex = -1, impactIndex = -1, silentIndex = -1, abandonmentIndex = -1, environmentIndex = -1, doorIndex = -1, jumpIndex = -1, runIndex = -1, stepIndex = -1, fakeIndex = -1, clearIndex = -1, ambushIndex = -1, holdIndex = -1, supportIndex = -1, interruptionIndex = -1, emergencyIndex = -1, reservationIndex = -1, entryIndex = -1, combatIndex = -1, pauseIndex = -1, cornerIndex = -1, leanIndex = -1, chaseIndex = -1, prefireIndex = -1, angleIndex = -1, holdAngleIndex = -1, travelIndex = -1, adsIndex = -1, weaveIndex = -1, tacticalJumpIndex = -1, relocationIndex = -1, feintIndex = -1, reloadIndex = -1, weaponReturnIndex = -1, magazineRecoveryIndex = -1, quickReloadIndex = -1, weaponRangeIndex = -1, weaponSyncIndex = -1, readyStanceIndex = -1, crossfireIndex = -1, postCombatIndex = -1, medicalPostureIndex = -1, surgeryInterruptionIndex = -1, medicalChoiceIndex = -1, explosionAwarenessIndex = -1, flashContinuityIndex = -1, gasExposureIndex = -1, grenadeFilterIndex = -1, grenadeDispersionIndex = -1, grenadeReactionIndex = -1, ownGrenadeSafetyIndex = -1, grenadeChoiceIndex = -1, grenadeTrajectoryIndex = -1, grenadeJudgmentIndex = -1, handsRecoveryIndex = -1, recoilRecoveryIndex = -1, shotGeometryIndex = -1, suppressionDisciplineIndex = -1, pistolIndex = -1, previous: CometMapEvent | undefined

    for (let i = 0; i < events.length; i++) {

        const event = events[i]

        if (event.lifecycle || previous && (event.cometSession !== previous.cometSession || event.instance !== previous.instance)) { selected = undefined; motionIndex = -1; controlJournalIndex = -1; journalIndex = -1; controlIndex = -1; validityIndex = -1; lifecycleIndex = -1; faultIsolationIndex = -1; coverScanIndex = -1, movementRecoveryIndex = -1; doorClosingIndex = -1; doorMotionIndex = -1; doorSpatialIndex = -1; doorRecoveryIndex = -1; doorTransitIndex = -1; outcomeIndex = -1; encounterIndex = -1; restLightsIndex = -1; tacticalDevicesIndex = -1; lightDisciplineIndex = -1; squadVoiceIndex = squadFireIndex = -1; fireLaneIndex = -1; actionIndex = attentionIndex = progressIndex = handoffIndex = hearingIndex = quietIndex = gunfireIndex = floorIndex = closeIndex = impactIndex = silentIndex = abandonmentIndex = environmentIndex = doorIndex = jumpIndex = runIndex = stepIndex = fakeIndex = clearIndex = ambushIndex = holdIndex = supportIndex = interruptionIndex = emergencyIndex = reservationIndex = entryIndex = combatIndex = pauseIndex = cornerIndex = leanIndex = chaseIndex = prefireIndex = angleIndex = holdAngleIndex = travelIndex = adsIndex = weaveIndex = tacticalJumpIndex = relocationIndex = feintIndex = reloadIndex = weaponReturnIndex = magazineRecoveryIndex = -1, quickReloadIndex = -1, weaponRangeIndex = -1, weaponSyncIndex = -1, crossfireIndex = readyStanceIndex = postCombatIndex = medicalPostureIndex = -1, surgeryInterruptionIndex = -1, medicalChoiceIndex = -1, explosionAwarenessIndex = -1, flashContinuityIndex = -1, gasExposureIndex = -1, grenadeFilterIndex = -1, grenadeDispersionIndex = -1, grenadeReactionIndex = -1, ownGrenadeSafetyIndex = -1, grenadeChoiceIndex = -1, grenadeTrajectoryIndex = -1, grenadeJudgmentIndex = -1, handsRecoveryIndex = -1, recoilRecoveryIndex = -1, shotGeometryIndex = -1, suppressionDisciplineIndex = -1, pistolIndex = -1 }

        if(event.controlHandoff) controlIndex = i
        event.controlIndex = controlIndex
        previous = event

        if (event.quiet) quietIndex = i

        event.quietIndex = quietIndex

        if (event.gunfire && (event.gunfire.state === "look" || event.gunfire.state === "ended" || event.gunfire.passToSain)) gunfireIndex = i

        event.gunfireIndex = gunfireIndex

        if (event.feature === 'P04' && event.floorHearing) floorIndex = i

        event.floorIndex = floorIndex

        if (event.feature === 'P05' && event.closeDetection) closeIndex = i

        event.closeIndex = closeIndex
        if (event.feature === 'P07' && event.impact) impactIndex = i
        event.impactIndex = impactIndex
        if (event.searchAbandonment) abandonmentIndex = i
        event.abandonmentIndex = abandonmentIndex
        if (event.environmentContext) environmentIndex = i
        event.environmentIndex = environmentIndex
        if (event.doorApproach) doorIndex = i
        event.doorIndex = doorIndex
        if (event.doorJumpPeek) jumpIndex = i
        event.jumpIndex = jumpIndex
        if (event.doorRunBy) runIndex = i
        event.runIndex = runIndex
        if (event.doorFakeGrenade || event.doorFakeMedical) fakeIndex = i
        event.fakeIndex = fakeIndex
        if (event.doorRoomClear) clearIndex = i
        event.clearIndex = clearIndex
        if (event.doorInterruption) interruptionIndex = i
        event.interruptionIndex = interruptionIndex
        if (event.cornerPrefire) prefireIndex = i
        event.prefireIndex = prefireIndex
        if (event.angleWatch) angleIndex = i
        event.angleIndex = angleIndex
        if (event.holdAngle) holdAngleIndex = i
        event.holdAngleIndex = holdAngleIndex
        if (event.coverTravel) travelIndex = i
        event.travelIndex = travelIndex
        if(event.medicalChoice && (event.medicalChoice.applied || event.medicalChoice.state === 'ended')) medicalChoiceIndex=i
        event.medicalChoiceIndex=medicalChoiceIndex
        if(event.readyStance) readyStanceIndex=i
        event.readyStanceIndex=readyStanceIndex
        if(outcomeIndex >= 0 && (event.contact?.target || event.outcome?.target) && (event.contact?.target || event.outcome?.target) !== events[outcomeIndex].outcome?.target) outcomeIndex=-1
        if(event.validity) validityIndex=i
        event.validityIndex=validityIndex
        if(event.lifecycle) lifecycleIndex=i
        event.lifecycleIndex=lifecycleIndex
        if(event.faultIsolation) faultIsolationIndex=i
        event.faultIsolationIndex=faultIsolationIndex
        if(event.coverScan) coverScanIndex=i
        event.coverScanIndex=coverScanIndex
        if(event.movementRecovery) movementRecoveryIndex=i
        if(event.doorClosing) doorClosingIndex=i
        event.movementRecoveryIndex=movementRecoveryIndex
        event.doorClosingIndex=doorClosingIndex
        if(event.doorMotion) doorMotionIndex=i
        event.doorMotionIndex=doorMotionIndex
        if(event.doorSpatial) doorSpatialIndex=i
        event.doorSpatialIndex=doorSpatialIndex
        if(event.doorRecovery) doorRecoveryIndex=i
        event.doorRecoveryIndex=doorRecoveryIndex
        if(event.doorTransit) doorTransitIndex=i
        event.doorTransitIndex=doorTransitIndex
        if(event.outcome) outcomeIndex=i
        event.outcomeIndex=outcomeIndex
        if (encounterIndex >= 0 && event.contact?.target && event.contact.target !== events[encounterIndex].encounter?.target) encounterIndex = -1
        if(event.encounter) encounterIndex=i
        event.encounterIndex=encounterIndex
        if(event.restLights) restLightsIndex=i
        event.restLightsIndex=restLightsIndex
        if(event.tacticalDevices) tacticalDevicesIndex=i
        event.tacticalDevicesIndex=tacticalDevicesIndex
        if(event.lightDiscipline) lightDisciplineIndex=i
        event.lightDisciplineIndex=lightDisciplineIndex
        if(event.squadVoice) squadVoiceIndex=i
        event.squadVoiceIndex=squadVoiceIndex
        if(event.squadFire) squadFireIndex=i
        event.squadFireIndex=squadFireIndex
        if(event.fireLane) fireLaneIndex=i
        event.fireLaneIndex=fireLaneIndex
        if(event.crossfire) crossfireIndex=i
        event.crossfireIndex=crossfireIndex
        if(event.postCombat) postCombatIndex=i
        if(event.medicalPosture) medicalPostureIndex=i
        event.postCombatIndex=postCombatIndex
        event.medicalPostureIndex=medicalPostureIndex
        if(event.surgeryInterruption) surgeryInterruptionIndex=i
        event.surgeryInterruptionIndex=surgeryInterruptionIndex
        if (event.explosionAwareness && (event.explosionAwareness.applied || event.explosionAwareness.state === 'ended')) explosionAwarenessIndex = i
        event.explosionAwarenessIndex = explosionAwarenessIndex
        if (event.flashContinuity) flashContinuityIndex = i
        if (event.gasExposure) gasExposureIndex = i
        if (event.grenadeFilter) grenadeFilterIndex = i
        event.flashContinuityIndex = flashContinuityIndex
        event.gasExposureIndex = gasExposureIndex
        event.grenadeFilterIndex = grenadeFilterIndex
        if (event.grenadeDispersion) grenadeDispersionIndex = i
        event.grenadeDispersionIndex = grenadeDispersionIndex
        if (event.grenadeReaction) grenadeReactionIndex = i
        if (event.ownGrenadeSafety) ownGrenadeSafetyIndex = i
        event.grenadeReactionIndex = grenadeReactionIndex
        event.ownGrenadeSafetyIndex = ownGrenadeSafetyIndex
        if (event.grenadeChoice) grenadeChoiceIndex = i
        event.grenadeChoiceIndex = grenadeChoiceIndex
        if (event.grenadeTrajectory) grenadeTrajectoryIndex = i
        event.grenadeTrajectoryIndex = grenadeTrajectoryIndex
        if (event.grenadeJudgment) grenadeJudgmentIndex = i
        event.grenadeJudgmentIndex = grenadeJudgmentIndex
        if (event.handsRecovery) handsRecoveryIndex = i
        event.handsRecoveryIndex = handsRecoveryIndex
        if (event.recoilRecovery) recoilRecoveryIndex = i
        event.recoilRecoveryIndex = recoilRecoveryIndex
        if (event.shotGeometry) shotGeometryIndex = i
        event.shotGeometryIndex = shotGeometryIndex
        if (event.suppressionDiscipline) suppressionDisciplineIndex = i
        event.suppressionDisciplineIndex = suppressionDisciplineIndex
        if (event.weaponSync) weaponSyncIndex = i
        event.weaponSyncIndex = weaponSyncIndex
        if (event.weaponRange) weaponRangeIndex = i
        event.weaponRangeIndex = weaponRangeIndex
        if (event.magazineRecovery && (event.stage !== 'queued' || magazineRecoveryIndex < 0 || !events[magazineRecoveryIndex].magazineRecovery?.active)) magazineRecoveryIndex = i
        event.magazineRecoveryIndex = magazineRecoveryIndex
        if (event.quickReload) quickReloadIndex = i
        event.quickReloadIndex = quickReloadIndex
        if(event.controlJournal) controlJournalIndex = i
        event.controlJournalIndex = controlJournalIndex
        if (event.controlJournal?.motion) motionIndex = i
        else if (event.controlJournal && event.controlJournal.owner !== 'combat') motionIndex = -1
        event.motionIndex = motionIndex
        if(event.journal) journalIndex = i
        event.journalIndex = journalIndex
        if (event.weaponReturn) weaponReturnIndex = i
        event.weaponReturnIndex = weaponReturnIndex
        if (event.pistolSwap) pistolIndex = i
        event.pistolIndex = pistolIndex
        if (event.reloadTiming) reloadIndex = i
        event.reloadIndex = reloadIndex
        if (event.coverFeint) feintIndex = i
        event.feintIndex = feintIndex
        if (event.outdoorRelocation) relocationIndex = i
        event.relocationIndex = relocationIndex
        if (event.tacticalJump) tacticalJumpIndex = i
        event.tacticalJumpIndex = tacticalJumpIndex
        if (event.retreatWeave) weaveIndex = i
        event.weaveIndex = weaveIndex
        if (event.adsTravel) adsIndex = i
        event.adsIndex = adsIndex
        if (event.cornerChase) chaseIndex = i
        event.chaseIndex = chaseIndex
        if (event.combatLean) leanIndex = i
        event.leanIndex = leanIndex
        if (event.cornerPeek) cornerIndex = i
        event.cornerIndex = cornerIndex
        if (event.firePause) pauseIndex = i
        event.pauseIndex = pauseIndex
        if (event.combatStep) combatIndex = i
        event.combatIndex = combatIndex
        if (event.doorEntry) entryIndex = i
        event.entryIndex = entryIndex
        if (event.doorReservation) reservationIndex = i
        event.reservationIndex = reservationIndex
        if (event.doorEmergency) emergencyIndex = i
        event.emergencyIndex = emergencyIndex
        if (event.doorSupport) supportIndex = i
        event.supportIndex = supportIndex
        if (event.doorHold) holdIndex = i
        event.holdIndex = holdIndex
        if (event.doorAmbush) ambushIndex = i
        event.ambushIndex = ambushIndex
        if (event.doorStepPeek) stepIndex = i
        event.stepIndex = stepIndex
        if (event.silentSearch) silentIndex = i
        event.silentIndex = silentIndex

        if (event.feature === 'P01' && event.hearing?.outcome === 'heard') hearingIndex = i

        event.hearingIndex = hearingIndex

        if (event.feature !== 'A07' && event.stage !== 'evaluated') handoffIndex = -1

        if (event.handoff) handoffIndex = i

        event.handoffIndex = handoffIndex

        if (event.progress) progressIndex = i

        event.progressIndex = progressIndex

        if (event.stage === 'evaluated') { event.actionIndex = actionIndex; event.attentionIndex = attentionIndex; continue }

        if (event.feature === 'A07') attentionIndex = i

        else actionIndex = i

        event.actionIndex = actionIndex; event.attentionIndex = attentionIndex

        if (event.feature === 'A07') continue // Attention events cannot accept or release an action plan.

        if (event.stage === 'selected') selected = event

        else if (event.stage === 'accepted' && selected?.decision === event.decision && selected.cometSession === event.cometSession

            && selected.instance === event.instance && selected.feature === event.feature) event.choiceReason = selected.reason

        else if (event.stage === 'released' || event.stage === 'rejected') selected = undefined

    }

    return events

}



function latestControl(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if(!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0,hi=record.events.length
    while(lo<hi){const mid=(lo+hi)>>>1;if(record.events[mid].time<=at)lo=mid+1;else hi=mid}
    const last=record.events[lo-1]
    return last ? record.events[last.controlIndex] : undefined
}
function latestValidity(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.validityIndex] : undefined
}
function latestLifecycle(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.lifecycleIndex] : undefined
}
function latestFaultIsolation(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.faultIsolationIndex] : undefined
}
function latestCoverScan(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.coverScanIndex] : undefined
}
function latestMovementRecovery(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.movementRecoveryIndex] : undefined
}
function latestDoorClosing(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.doorClosingIndex] : undefined
}
function latestDoorMotion(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.doorMotionIndex] : undefined
}
function latestDoorSpatial(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.doorSpatialIndex] : undefined
}
function latestDoorRecovery(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.doorRecoveryIndex] : undefined
}
function latestDoorTransit(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.doorTransitIndex] : undefined
}
function latestOutcome(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.outcomeIndex] : undefined
}
function latestEncounter(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.encounterIndex] : undefined
}
function latestRestLights(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.restLightsIndex] : undefined
}
function latestTacticalDevices(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.tacticalDevicesIndex] : undefined
}
function latestLightDiscipline(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.lightDisciplineIndex] : undefined
}
function latestSquadVoice(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.squadVoiceIndex] : undefined
}
function latestSquadFire(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.squadFireIndex] : undefined
}
function latestFireLane(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.fireLaneIndex] : undefined
}
function latestCrossfire(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.crossfireIndex] : undefined
}
function latestPostCombat(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.postCombatIndex] : undefined
}
function latestReadyStance(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.readyStanceIndex] : undefined
}
function latestMedicalPosture(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.medicalPostureIndex] : undefined
}
function latestSurgeryInterruption(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.surgeryInterruptionIndex] : undefined
}
function latestMedicalChoice(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.medicalChoiceIndex] : undefined
}
function latestExplosionAwareness(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.explosionAwarenessIndex] : undefined
}
function latestFlashContinuity(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.flashContinuityIndex] : undefined
}
function latestGasExposure(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.gasExposureIndex] : undefined
}
function latestGrenadeFilter(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.grenadeFilterIndex] : undefined
}
function latestGrenadeDispersion(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.grenadeDispersionIndex] : undefined
}
function latestGrenadeReaction(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.grenadeReactionIndex] : undefined
}
function latestOwnGrenadeSafety(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.ownGrenadeSafetyIndex] : undefined
}
function latestGrenadeChoice(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.grenadeChoiceIndex] : undefined
}
function latestGrenadeTrajectory(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.grenadeTrajectoryIndex] : undefined
}
function latestGrenadeJudgment(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.grenadeJudgmentIndex] : undefined
}
function latestHandsRecovery(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.handsRecoveryIndex] : undefined
}
function latestRecoilRecovery(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.recoilRecoveryIndex] : undefined
}
function latestShotGeometry(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.shotGeometryIndex] : undefined
}
function latestSuppressionDiscipline(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.suppressionDisciplineIndex] : undefined
}
function latestWeaponSync(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.weaponSyncIndex] : undefined
}
function latestWeaponRange(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.weaponRangeIndex] : undefined
}
function latestMagazineRecovery(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.magazineRecoveryIndex] : undefined
}
function latestQuickReload(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.quickReloadIndex] : undefined
}
function latestJournal(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.journalIndex] : undefined
}
function latestControlJournal(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.controlJournalIndex] : undefined
}
function latestWeaponReturn(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.weaponReturnIndex] : undefined
}
function latestPistolSwap(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.pistolIndex] : undefined
}
function latestReloadTiming(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.reloadIndex] : undefined
}
function latestCoverFeint(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.feintIndex] : undefined
}

function latestOutdoorRelocation(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.relocationIndex] : undefined
}
function latestTacticalJump(record: CometMapRecord | undefined, at: number): CometMapEvent | undefined {
    if (!record || !['ready', 'loading'].includes(record.status)) return undefined
    let lo=0, hi=record.events.length
    while(lo<hi) { const mid=(lo+hi)>>>1; if(record.events[mid].time<=at) lo=mid+1; else hi=mid }
    const last=record.events[lo-1]
    return last ? record.events[last.tacticalJumpIndex] : undefined
}
// Binary lookup works in both playback directions and never reads a future decision.

function latestCometEvent(record: CometMapRecord | undefined, at: number, attention: boolean, progressOnly = false, handoffOnly = false, hearingOnly = false, quietOnly = false, gunfireOnly = false, floorOnly = false, closeOnly = false, impactOnly = false, silentOnly = false, abandonmentOnly = false, environmentOnly = false, doorOnly = false, jumpOnly = false, runOnly = false, stepOnly = false, fakeOnly = false, clearOnly = false, ambushOnly = false, holdOnly = false, supportOnly = false, interruptionOnly = false, emergencyOnly = false, reservationOnly = false, entryOnly = false, combatOnly = false, pauseOnly = false, cornerOnly = false, leanOnly = false, chaseOnly = false, prefireOnly = false, angleOnly = false, holdAngleOnly = false, travelOnly = false, adsOnly = false, weaveOnly = false): CometMapEvent | undefined {

    if ((record?.status === 'ready' || record?.status === 'loading')) {

        let lo = 0, hi = record.events.length

        while (lo < hi) { const mid = (lo + hi) >>> 1; if (record.events[mid].time <= at) lo = mid + 1; else hi = mid }

        const last = record.events[lo - 1]

        return last ? record.events[weaveOnly ? last.weaveIndex : adsOnly ? last.adsIndex : travelOnly ? last.travelIndex : holdAngleOnly ? last.holdAngleIndex : angleOnly ? last.angleIndex : prefireOnly ? last.prefireIndex : chaseOnly ? last.chaseIndex : leanOnly ? last.leanIndex : cornerOnly ? last.cornerIndex : pauseOnly ? last.pauseIndex : combatOnly ? last.combatIndex : entryOnly ? last.entryIndex : reservationOnly ? last.reservationIndex : emergencyOnly ? last.emergencyIndex : interruptionOnly ? last.interruptionIndex : supportOnly ? last.supportIndex : holdOnly ? last.holdIndex : ambushOnly ? last.ambushIndex : clearOnly ? last.clearIndex : fakeOnly ? last.fakeIndex : stepOnly ? last.stepIndex : runOnly ? last.runIndex : jumpOnly ? last.jumpIndex : doorOnly ? last.doorIndex : environmentOnly ? last.environmentIndex : abandonmentOnly ? last.abandonmentIndex : silentOnly ? last.silentIndex : impactOnly ? last.impactIndex : closeOnly ? last.closeIndex : floorOnly ? last.floorIndex : gunfireOnly ? last.gunfireIndex : quietOnly ? last.quietIndex : hearingOnly ? last.hearingIndex : handoffOnly ? last.handoffIndex : progressOnly ? last.progressIndex : attention ? last.attentionIndex : last.actionIndex] : undefined

    }

    return undefined

}

function cometActionState(record: CometMapRecord | undefined, at: number, sampledDecision: string | undefined, sampledAt: number, ghost: boolean) {

    const sampled = sampledDecision || ''

    if (ghost) return { active: false, decision: sampled.startsWith('COMET:') ? '' : sampled, event: undefined }

    const event = latestCometEvent(record, at, false)

    const life = latestLifecycle(record, at)
    if (life && (!event || event.time <= life.time) && (life.lifecycle?.state !== 'resumed' || sampledAt <= life.time))
        return { active: false, decision: sampled.startsWith('COMET:') ? '' : sampled, event: undefined }

    if (event?.stage === 'accepted' && event.feature === 'A03' && event.continuity?.remaining != null

        && at >= event.time + Math.max(0, event.continuity.remaining) * 1000)

        return { active: false, decision: sampled.startsWith('COMET:') ? '' : sampled, event: undefined }

    if (event?.stage === 'accepted' && (event.time >= sampledAt || sampled === 'COMET:' + event.decision))

        return { active: true, decision: 'COMET:' + event.decision, event }

    // A newer release/selection/refusal ends attribution even before the next position sample.

    if (event && event.stage !== 'accepted' && event.time >= sampledAt)

        return { active: false, decision: sampled.startsWith('COMET:') ? '' : sampled, event: undefined }

    return { active: sampled.startsWith('COMET:'), decision: sampled, event: undefined }

}

export function cometMapState(record: CometMapRecord | undefined, at: number, sampledDecision: string | undefined, sampledAt: number, ghost: boolean) {

    let action = cometActionState(record, at, sampledDecision, sampledAt, ghost)

    const latest = ghost ? undefined : latestCometEvent(record, at, true)

    const attention = latest?.stage === 'accepted' && latest.threat?.selected ? latest : undefined

    const progressEvent = ghost ? undefined : latestCometEvent(record, at, false, true)

    const progress = action.event && progressEvent && progressEvent.time >= action.event.time && progressEvent.decision === action.event.decision

        && progressEvent.instance === action.event.instance && progressEvent.cometSession === action.event.cometSession ? progressEvent.progress : action.event?.progress

    const handoffEvent = ghost ? undefined : latestCometEvent(record, at, false, false, true)

    const handoff = handoffEvent?.handoff

    if (handoff && ['native-pending','native-observed'].includes(handoff.state) && action.decision.startsWith('COMET:')) {

        action.active = false; action.decision = ''; action.event = undefined

    }

    // A13 records a native result, never an accepted COMET action or a COMET marker badge.

    if (handoff?.nativeObserved && handoffEvent && (handoffEvent.time >= sampledAt || sampledDecision?.startsWith('COMET:')) && !action.active) {

        const native = [handoff.nativeSelf, handoff.nativeSquad, handoff.nativeCombat].find(v => v && v !== 'None')

        action.decision = native ? 'SAIN:' + native : ''

    }

    const heardEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, true)

    // Five-second map highlight, not a replacement for SAIN's contact lifetime. Queued/refused sounds never light up a marker.

    const hearing = heardEvent && at - heardEvent.time < 5000 ? heardEvent.hearing : undefined

    const quietEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, true)

    const q = quietEvent?.quiet

    // A short execution lease prevents stale caps appearing indefinitely after missing telemetry.

    // A newer urgent action cancels attribution even before a release event arrives.

    const compatible = ['Search', 'MoveToEngage'].includes(action.decision.replace(/^(SAIN|COMET):/, ''))

    const quiet = q?.active && q.applied && q.state !== 'normal' && quietEvent && compatible

        && at - quietEvent.time < Math.min(1.5, Math.max(0, q.validFor ?? 0)) * 1000 ? q : undefined

    const gunEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, true)

    const g = gunEvent?.gunfire

    const gunAge = gunEvent ? Math.max(0, at - gunEvent.time) / 1000 : Infinity

    const safeLookAction = !action.active && (!action.decision.startsWith('SAIN:') || /^(SAIN:)?(Patrol|None|Idle)$/.test(action.decision))

    const gunfire = g?.state === 'look' && g.applied && safeLookAction && gunAge < Math.min(1.5, Math.max(0, g.validFor ?? 0), Math.max(0, g.remaining ?? 0))

        ? { ...g, remaining: Math.max(0, g.remaining! - gunAge) } : undefined

    const floorEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, true)

    // A recent diagnostic snapshot, never an active action or an acquired contact.

    const floorHearing = floorEvent && at - floorEvent.time < 3000 ? floorEvent.floorHearing : undefined

    const closeEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, true)

    const closeDetection = closeEvent && at - closeEvent.time < 3000 ? closeEvent.closeDetection : undefined

    const prefireEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const pf = prefireEvent?.cornerPrefire
    const prefireAge = prefireEvent ? (at-prefireEvent.time)/1000 : Infinity
    const cornerPrefire = pf && prefireAge>=0 && prefireAge<pf.validFor
        && ['RushEnemy','COMET:Push','COMET:ContinuePush'].includes((sampledDecision || '').replace(/^SAIN:/,''))
        ? {...pf,remaining:Math.max(0,pf.remaining-prefireAge),contactAge:pf.contactAge+prefireAge} : undefined
    const chaseEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const ch = chaseEvent?.cornerChase
    const chaseAge = chaseEvent ? (at-chaseEvent.time)/1000 : Infinity
    const cornerChase = ch && chaseAge>=0 && chaseAge<ch.validFor
        && ['RushEnemy','COMET:Push','COMET:ContinuePush'].includes((sampledDecision || '').replace(/^SAIN:/,''))
        ? {...ch,remaining:Math.max(0,ch.remaining-chaseAge),contactAge:ch.contactAge+chaseAge} : undefined
    const leanEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const lean = leanEvent?.combatLean
    const leanAge = leanEvent ? (at-leanEvent.time)/1000 : Infinity
    const combatLean = lean && leanAge>=0 && leanAge<lean.validFor
        && ['StandAndShoot','DogFight','COMET:Shoot','COMET:KeepAngle'].includes((sampledDecision || '').replace(/^SAIN:/,''))
        ? {...lean,remaining:Math.max(0,lean.remaining-leanAge),phaseRemaining:Math.max(0,lean.phaseRemaining-leanAge),contactAge:lean.contactAge+leanAge} : undefined
    const cornerEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const peek = cornerEvent?.cornerPeek
    const peekAge = cornerEvent ? (at-cornerEvent.time)/1000 : Infinity
    const cornerPeek = peek && peekAge>=0 && peekAge<peek.validFor
        && ['StandAndShoot','DogFight','COMET:Shoot','COMET:KeepAngle'].includes((sampledDecision || '').replace(/^SAIN:/,''))
        ? {...peek,remaining:Math.max(0,peek.remaining-peekAge),phaseRemaining:Math.max(0,peek.phaseRemaining-peekAge),contactAge:peek.contactAge+peekAge} : undefined
    const pauseEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const firingPause = pauseEvent?.firePause
    const pauseAge = pauseEvent ? (at-pauseEvent.time)/1000 : Infinity
    const firePause = firingPause && pauseAge>=0 && pauseAge<firingPause.validFor
        && ['StandAndShoot','DogFight','COMET:Shoot','COMET:KeepAngle'].includes((sampledDecision || '').replace(/^SAIN:/,''))
        ? {...firingPause,remaining:Math.max(0,firingPause.remaining-pauseAge),sequenceRemaining:Math.max(0,firingPause.sequenceRemaining-pauseAge),contactAge:firingPause.contactAge+pauseAge} : undefined
    const combatEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const movement = combatEvent?.combatStep
    const movementAge = combatEvent ? (at-combatEvent.time)/1000 : Infinity
    const nativeMovementAction = (sampledDecision || '').replace(/^SAIN:/,'')
    const combatStep = movement && movementAge>=0 && movementAge<movement.validFor
        && ['StandAndShoot','DogFight','COMET:Shoot','COMET:KeepAngle'].includes(nativeMovementAction)
        ? {...movement,remaining:Math.max(0,movement.remaining-movementAge),stepRemaining:Math.max(0,movement.stepRemaining-movementAge),contactAge:movement.contactAge+movementAge} : undefined
    const entryEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const entry = entryEvent?.doorEntry
    const entryAge = entryEvent ? (at-entryEvent.time)/1000 : Infinity
    const doorEntry = entry && entryAge>=0 && entryAge<Math.min(1.5,entry.validFor)
        ? {...entry,remaining:Math.max(0,entry.remaining-entryAge),contactAge:entry.contactAge+entryAge} : undefined
    const reservationEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const reservation = reservationEvent?.doorReservation
    const reservationAge = reservationEvent ? (at-reservationEvent.time)/1000 : Infinity
    const doorReservation = reservation && reservationAge>=0 && reservationAge<Math.min(1.5,reservation.validFor)
        ? {...reservation,remaining:Math.max(0,reservation.remaining-reservationAge),budgetRemaining:Math.max(0,reservation.budgetRemaining-reservationAge),retryRemaining:Math.max(0,reservation.retryRemaining-reservationAge)} : undefined
    const emergencyEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const emergency = emergencyEvent?.doorEmergency
    const emergencyAge = emergencyEvent ? (at-emergencyEvent.time)/1000 : Infinity
    const doorEmergency = emergency && emergencyAge>=0 && emergencyAge<Math.min(1.5,emergency.validFor)
        ? {...emergency,remaining:Math.max(0,emergency.remaining-emergencyAge),evidenceAge:emergency.evidenceAge+emergencyAge} : undefined
    const interruptionEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const interruption = interruptionEvent?.doorInterruption
    const interruptionAge = interruptionEvent ? (at-interruptionEvent.time)/1000 : Infinity
    const doorInterruption = interruption && interruptionAge>=0 && interruptionAge<Math.min(1.5,interruption.validFor)
        ? {...interruption,remaining:Math.max(0,interruption.remaining-interruptionAge),quietRemaining:Math.max(0,interruption.quietRemaining-interruptionAge)} : undefined
    const supportEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const support = supportEvent?.doorSupport
    const supportAge = supportEvent ? (at-supportEvent.time)/1000 : Infinity
    const doorSupport = support && supportAge >= 0 && supportAge < Math.min(1.5,support.validFor) ? {...support,remaining:Math.max(0,support.remaining-supportAge),offerRemaining:Math.max(0,support.offerRemaining-supportAge)} : undefined
    const holdEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const hold = holdEvent?.doorHold
    const holdAge = holdEvent ? (at-holdEvent.time)/1000 : Infinity
    const doorHold = hold && holdAge >= 0 && holdAge < Math.min(1.5,hold.validFor) ? hold : undefined
    const ambushEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const ambush = ambushEvent?.doorAmbush
    const ambushAge = ambushEvent ? (at - ambushEvent.time) / 1000 : Infinity
    const doorAmbush = ambush && ambushAge >= 0 && ambushAge < Math.min(1.5, ambush.validFor ?? 0) ? { ...ambush, remaining: Math.max(0,(ambush.remaining ?? 0)-ambushAge), sharedRemaining: Math.max(0,(ambush.sharedRemaining ?? 0)-ambushAge) } : undefined
    const clearEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const clear = clearEvent?.doorRoomClear
    const clearAge = clearEvent ? (at - clearEvent.time) / 1000 : Infinity
    const doorRoomClear = clear && clearAge >= 0 && clearAge < Math.min(1.5, clear.validFor ?? 0) ? clear : undefined
    const fakeEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const medical = fakeEvent?.doorFakeMedical
    const fake = fakeEvent?.doorFakeGrenade
    const fakeAge = fakeEvent ? (at - fakeEvent.time) / 1000 : Infinity
    const doorFakeGrenade = fake && fakeAge >= 0 && fakeAge < Math.min(1.5, fake.validFor ?? 0) ? fake : undefined
    const doorFakeMedical = medical && fakeAge >= 0 && fakeAge < Math.min(1.5, medical.validFor ?? 0) ? medical : undefined
    const stepEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const step = stepEvent?.doorStepPeek
    const stepAge = stepEvent ? (at - stepEvent.time) / 1000 : Infinity
    const doorStepPeek = step && stepAge >= 0 && stepAge < Math.min(1.5, step.validFor ?? 0) ? step : undefined
    const runEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const run = runEvent?.doorRunBy
    const runAge = runEvent ? (at - runEvent.time) / 1000 : Infinity
    const doorRunBy = run && runAge >= 0 && runAge < Math.min(1.5, run.validFor ?? 0) ? run : undefined
    const jumpEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const jump = jumpEvent?.doorJumpPeek
    const jumpAge = jumpEvent ? (at - jumpEvent.time) / 1000 : Infinity
    const doorJumpPeek = jump && jumpAge >= 0 && jumpAge < Math.min(1.5, jump.validFor ?? 0) ? jump : undefined
    const doorEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const door = doorEvent?.doorApproach
    const doorAge = doorEvent ? (at - doorEvent.time) / 1000 : Infinity
    const doorApproach = door && doorAge >= 0 && doorAge < Math.min(1.5, door.validFor ?? 0) ? door : undefined
    const environmentEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, true)
    const env = environmentEvent?.environmentContext
    const environmentAge = environmentEvent ? (at - environmentEvent.time) / 1000 : Infinity
    const environmentContext = env && environmentAge >= 0 && environmentAge < Math.min(2, env.validFor ?? 0) ? env : undefined
    const abandonmentEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, true)
    const sa = abandonmentEvent?.searchAbandonment
    const abandonmentAge = abandonmentEvent ? (at - abandonmentEvent.time) / 1000 : Infinity
    const searchAbandonment = sa && abandonmentAge >= 0 && abandonmentAge < (sa.state === 'ended' || sa.state === 'abandoned' ? 3 : Math.min(1.5, Math.max(0, sa.validFor ?? 0))) ? sa : undefined
    const silentEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, true)
    const ss = silentEvent?.silentSearch
    const silentAge = silentEvent ? (at - silentEvent.time) / 1000 : Infinity
    const silentSearch = ss && silentAge >= 0 && silentAge < (ss.state === 'ended' ? 3 : Math.min(1.5, Math.max(0, ss.validFor ?? 0), Math.max(0, ss.remaining ?? 0)))
        ? {...ss, silence: (ss.silence ?? 0) + silentAge, remaining: Math.max(0,(ss.remaining ?? 0)-silentAge)} : undefined
    const impactEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, true)
    const im = impactEvent?.impact
    const impactAge = impactEvent ? (at - impactEvent.time) / 1000 : Infinity
    const impact = im && impactAge >= 0 && impactAge < (im.active ? Math.min(1.5, Math.max(0, im.validFor ?? 0), Math.max(0, im.remaining ?? 0)) : 3)
        ? { ...im, remaining: Math.max(0, (im.remaining ?? 0) - impactAge) } : undefined
    // An observed action can bridge position samples. A request or native acceptance cannot.
    if (impact?.active && impact.state === 'observed' && impact.actionObserved && impactEvent!.time >= sampledAt
        && (!action.event || impactEvent!.time >= action.event.time))
        action = { active: true, decision: 'COMET:DefendUnknown', event: undefined }
    else if (action.decision === 'COMET:DefendUnknown' && (record?.status === 'ready' || record?.status === 'loading')
        && (!impact?.active || !impact.actionObserved || impact.state !== 'observed'))
        action = { active: false, decision: '', event: undefined }
    // Equipment maintenance is independent of combat/ORBIT action ownership. It must also be visible while looting.
    const postRecoveryEvent=ghost?undefined:latestPostCombat(record,at)
    const postRecovery=postRecoveryEvent?.postCombat
    const postRecoveryAge=postRecoveryEvent?(at-postRecoveryEvent.time)/1000:Infinity
    const postCombat=postRecovery?.applied && postRecoveryAge>=0 && postRecoveryAge<postRecovery.validFor ? postRecovery : undefined
    if(postCombat && (postRecoveryEvent!.time >= sampledAt || sampledDecision?.startsWith('COMET:PostCombat')))
        action={active:true,decision:'COMET:PostCombat'+postCombat.state[0].toUpperCase()+postCombat.state.slice(1),event:undefined}
    else if(sampledDecision?.startsWith('COMET:PostCombat') && (record?.status === 'ready' || record?.status === 'loading'))
        action={active:false,decision:'',event:undefined}
    const crossfireEvent=ghost?undefined:latestCrossfire(record,at)
    const crossfireDetail=crossfireEvent?.crossfire
    const crossfireAge=crossfireEvent?(at-crossfireEvent.time)/1000:-1
    const crossfire=crossfireDetail?.applied && crossfireAge>=0 && crossfireAge<crossfireDetail.validFor
        && (crossfireEvent!.time>=sampledAt || sampledDecision?.startsWith('COMET:Crossfire'))
        ? {...crossfireDetail,storm:crossfireDetail.storm?{...crossfireDetail.storm,remaining:Math.max(0,crossfireDetail.storm.remaining-crossfireAge),evidenceAge:crossfireDetail.storm.evidenceAge+crossfireAge}:undefined,trade:crossfireDetail.trade?{...crossfireDetail.trade,remaining:Math.max(0,crossfireDetail.trade.remaining-crossfireAge),deathAge:crossfireDetail.trade.deathAge+crossfireAge}:undefined,coverMate:crossfireDetail.coverMate?{...crossfireDetail.coverMate,remaining:Math.max(0,crossfireDetail.coverMate.remaining-crossfireAge),operationAge:crossfireDetail.coverMate.operationAge+crossfireAge}:undefined,remaining:Math.max(0,crossfireDetail.remaining-crossfireAge),maneuver:crossfireDetail.maneuver?{...crossfireDetail.maneuver,remaining:Math.max(0,crossfireDetail.maneuver.remaining-crossfireAge),fireState:crossfireAge>=.3&&crossfireDetail.maneuver.fireState==='observed suppression fire'?'holding':crossfireDetail.maneuver.fireState}:undefined,contactAge:crossfireDetail.contactAge+crossfireAge,entrance:crossfireDetail.entrance?{...crossfireDetail.entrance,watchRemaining:Math.max(0,crossfireDetail.entrance.watchRemaining-crossfireAge)}:undefined} : undefined
    if(crossfire && (crossfireEvent!.time>=sampledAt || sampledDecision?.startsWith('COMET:Crossfire')))
        action={active:true,decision:cometCrossfireDecision(crossfire),event:undefined}
    else if(sampledDecision?.startsWith('COMET:Crossfire') && (record?.status === 'ready' || record?.status === 'loading'))
        action={active:false,decision:'',event:undefined}
    const readyEvent=ghost?undefined:latestReadyStance(record,at)
    const readyDetail=readyEvent?.readyStance
    const readyAge=readyEvent?(at-readyEvent.time)/1000:Infinity
    const readyStance=readyDetail?.applied && readyAge>=0 && readyAge<readyDetail.validFor
        ? {...readyDetail,remaining:Math.max(0,readyDetail.remaining-readyAge),cueAge:readyDetail.cueAge+readyAge,sinceFight:readyDetail.sinceFight+readyAge} : undefined
    const postureEvent=ghost?undefined:latestMedicalPosture(record,at)
    const posture=postureEvent?.medicalPosture
    const postureAge=postureEvent?(at-postureEvent.time)/1000:Infinity
    const medicalPosture=posture?.applied && postureAge>=0 && postureAge<posture.validFor ? posture : undefined
    const surgeryEvent=ghost?undefined:latestSurgeryInterruption(record,at)
    const surgery=surgeryEvent?.surgeryInterruption
    const surgeryAge=surgeryEvent?(at-surgeryEvent.time)/1000:Infinity
    const surgeryInterruption=surgery?.applied && surgeryAge>=0 && surgeryAge<surgery.validFor ? surgery : undefined
    const medEvent=ghost?undefined:latestMedicalChoice(record,at)
    const med=medEvent?.medicalChoice
    const medAge=medEvent?(at-medEvent.time)/1000:Infinity
    const medicalChoice=med?.applied && med.state==='started' && medAge>=0 && medAge<med.validFor ? med : undefined
    const blastEvent = ghost ? undefined : latestExplosionAwareness(record, at)
    const blast = blastEvent?.explosionAwareness
    const blastAge = blastEvent ? (at-blastEvent.time)/1000 : Infinity
    const explosionAwareness = blast?.applied && blast.state==='look' && blastAge>=0 && blastAge<Math.min(blast.validFor,blast.remaining) ? { ...blast, remaining: blast.remaining-blastAge, evidenceAge: blast.evidence==='seen-throw'?blast.evidenceAge+blastAge:blast.evidenceAge } : undefined
    const flashEvent = ghost ? undefined : latestFlashContinuity(record, at)
    const flash = flashEvent?.flashContinuity
    const flashAge = flashEvent ? (at-flashEvent.time)/1000 : Infinity
    const flashContinuity = flash && flashAge>=0 && flashAge<Math.min(flash.validFor,flash.remaining) && flash.state!=='ended' ? { ...flash, remaining: Math.max(0, flash.remaining-flashAge), strongRemaining: Math.max(0, flash.strongRemaining-flashAge), blindFireRemaining: Math.max(0, flash.blindFireRemaining-flashAge) } : undefined
    const gasEvent = ghost ? undefined : latestGasExposure(record, at)
    const gas = gasEvent?.gasExposure
    const gasAge = gasEvent ? (at-gasEvent.time)/1000 : Infinity
    const gasExposure = gas && gasAge>=0 && gasAge<gas.validFor && gas.state!=='ended' ? gas : undefined
    const filterEvent = ghost ? undefined : latestGrenadeFilter(record, at)
    const filter = filterEvent?.grenadeFilter
    const filterAge = filterEvent ? (at-filterEvent.time)/1000 : Infinity
    const grenadeFilter = filter && filterAge>=0 && filterAge<filter.validFor && filter.state!=='ended' ? filter : undefined
    const dispersionEvent = ghost ? undefined : latestGrenadeDispersion(record, at)
    const dispersion = dispersionEvent?.grenadeDispersion
    const dispersionAge = dispersionEvent ? (at-dispersionEvent.time)/1000 : Infinity
    const grenadeDispersion = dispersion && dispersionAge>=0 && dispersionAge<Math.min(dispersion.validFor,dispersion.leaseRemaining) && dispersion.state!=='ended' ? dispersion : undefined
    const reactionSafetyEvent = ghost ? undefined : latestGrenadeReaction(record, at)
    const ownSafetyEvent = ghost ? undefined : latestOwnGrenadeSafety(record, at)
    const reactionSafety = reactionSafetyEvent?.grenadeReaction
    const ownSafety = ownSafetyEvent?.ownGrenadeSafety
    const reactionSafetyAge = reactionSafetyEvent ? (at-reactionSafetyEvent.time)/1000 : Infinity
    const ownSafetyAge = ownSafetyEvent ? (at-ownSafetyEvent.time)/1000 : Infinity
    const grenadeReaction = reactionSafety && reactionSafetyAge>=0 && reactionSafetyAge<reactionSafety.validFor && reactionSafety.state!=='ended' ? reactionSafety : undefined
    const ownGrenadeSafety = ownSafety && ownSafetyAge>=0 && ownSafetyAge<ownSafety.validFor && ownSafety.state!=='ended' ? ownSafety : undefined
    const choiceEvent = ghost ? undefined : latestGrenadeChoice(record, at)
    const choice = choiceEvent?.grenadeChoice
    const choiceAge = choiceEvent ? (at-choiceEvent.time)/1000 : Infinity
    const grenadeChoice = choice && choiceAge>=0 && choiceAge<choice.validFor && choice.state!=='ended' ? choice : undefined
    const trajectoryEvent = ghost ? undefined : latestGrenadeTrajectory(record, at)
    const trajectory = trajectoryEvent?.grenadeTrajectory
    const trajectoryAge = trajectoryEvent ? (at-trajectoryEvent.time)/1000 : Infinity
    const grenadeTrajectory = trajectory && trajectoryAge>=0 && trajectoryAge<trajectory.validFor && trajectory.state!=='ended' ? trajectory : undefined
    const judgmentEvent = ghost ? undefined : latestGrenadeJudgment(record, at)
    const judgment = judgmentEvent?.grenadeJudgment
    const judgmentAge = judgmentEvent ? (at-judgmentEvent.time)/1000 : Infinity
    const grenadeJudgment = judgment && judgmentAge>=0 && judgmentAge<judgment.validFor && judgment.state!=='ended' ? judgment : undefined
    const handsEvent = ghost ? undefined : latestHandsRecovery(record, at)
    const hands = handsEvent?.handsRecovery
    const handsAge = handsEvent ? (at-handsEvent.time)/1000 : Infinity
    const handsRecovery = hands && handsAge>=0 && handsAge<hands.validFor && !['ended','recovered'].includes(hands.state)
        ? hands : undefined
    const recoveryEvent = ghost ? undefined : latestRecoilRecovery(record, at)
    const recovery = recoveryEvent?.recoilRecovery
    const recoveryAge = recoveryEvent ? (at-recoveryEvent.time)/1000 : Infinity
    const recoilRecovery = recovery && recoveryAge>=0 && recoveryAge<recovery.validFor && ['started','recovering'].includes(recovery.state)
        && cometActionMatches(sampledDecision, recovery.action) ? recovery : undefined
    const geometryEvent = ghost ? undefined : latestShotGeometry(record, at)
    const geometry = geometryEvent?.shotGeometry
    const geometryAge = geometryEvent ? (at-geometryEvent.time)/1000 : Infinity
    const shotGeometry = geometry && geometryAge>=0 && geometryAge<geometry.validFor && geometry.state!=='released'
        && cometActionMatches(sampledDecision, geometry.action)
        ? {...geometry,age:geometry.age+geometryAge} : undefined
    const suppressionEvent = ghost ? undefined : latestSuppressionDiscipline(record, at)
    const sup = suppressionEvent?.suppressionDiscipline
    const suppressionAge = suppressionEvent ? (at-suppressionEvent.time)/1000 : Infinity
    const suppressionDiscipline = sup && suppressionAge>=0 && suppressionAge<sup.validFor && !['ended','rejected'].includes(sup.state)
        && cometActionMatches(sampledDecision, sup.action)
        ? {...sup,elapsed:sup.elapsed+suppressionAge,contactAge:sup.contactAge+suppressionAge,
            pauseRemaining:Math.max(0,sup.pauseRemaining-suppressionAge),remaining:Math.max(0,sup.remaining-suppressionAge)} : undefined
    const weaponSyncEvent = ghost ? undefined : latestWeaponSync(record, at)
    const wsync = weaponSyncEvent?.weaponSync
    const weaponSyncAge = weaponSyncEvent ? (at-weaponSyncEvent.time)/1000 : Infinity
    const weaponSync = wsync && weaponSyncAge>=0 && weaponSyncAge<wsync.validFor && wsync.state!=='ended' ? wsync : undefined
    const weaponRangeEvent = ghost ? undefined : latestWeaponRange(record, at)
    const wrg = weaponRangeEvent?.weaponRange
    const weaponRangeAge = weaponRangeEvent ? (at-weaponRangeEvent.time)/1000 : Infinity
    const weaponRange = wrg && weaponRangeAge>=0 && weaponRangeAge<wrg.validFor && wrg.state!=='ended'
        && cometActionMatches(sampledDecision, wrg.action)
        ? {...wrg,elapsed:wrg.elapsed+weaponRangeAge,contactAge:wrg.contactAge+weaponRangeAge} : undefined
    const magazineEvent = ghost ? undefined : latestMagazineRecovery(record, at)
    const magazineContext = magazineEvent?.magazineRecovery
    const magazineRecovery = magazineContext && (magazineContext.active || at-magazineEvent!.time < 12000)
        && !(sampledAt > magazineEvent!.time && /^(ORBIT|PBT|LB|QuestingBots):/.test(sampledDecision || '')) ? magazineContext : undefined
    if (magazineContext && !magazineContext.active && magazineContext.state !== 'queued'
        && action.decision === 'COMET:RecoverMagazine' && magazineEvent!.time >= sampledAt)
        action = { active: false, decision: '', event: undefined }
    const quickReloadEvent = ghost ? undefined : latestQuickReload(record, at)
    const qrt = quickReloadEvent?.quickReload
    const quickReloadAge = quickReloadEvent ? (at-quickReloadEvent.time)/1000 : Infinity
    const quickReload = qrt && quickReloadAge>=0 && quickReloadAge<qrt.validFor && qrt.state!=='ended'
        && cometActionMatches(sampledDecision, qrt.action)
        ? {...qrt,elapsed:qrt.elapsed+quickReloadAge,contactAge:qrt.contactAge+quickReloadAge} : undefined
    const controlJournalEvent=ghost?undefined:latestControlJournal(record,at)
    const controlJournal=controlJournalEvent?.controlJournal && at>=controlJournalEvent.time && at-controlJournalEvent.time<7000?controlJournalEvent.controlJournal:undefined
    const journalEvent=ghost?undefined:latestJournal(record,at)
    const journal=journalEvent?.journal && at>=journalEvent.time && at-journalEvent.time<journalEvent.journal.validFor*1000?journalEvent.journal:undefined
    const weaponReturnEvent = ghost ? undefined : latestWeaponReturn(record, at)
    const wrt = weaponReturnEvent?.weaponReturn
    const weaponReturnAge = weaponReturnEvent ? (at-weaponReturnEvent.time)/1000 : Infinity
    const weaponReturn = wrt && weaponReturnAge>=0 && weaponReturnAge<wrt.validFor && wrt.state!=='ended'
        && cometActionMatches(sampledDecision, wrt.action)
        ? {...wrt,elapsed:wrt.elapsed+weaponReturnAge,contactAge:wrt.contactAge+weaponReturnAge,quietFor:wrt.quietFor+weaponReturnAge,holdRemaining:Math.max(0,wrt.holdRemaining-weaponReturnAge),returnRemaining:Math.max(0,wrt.returnRemaining-weaponReturnAge),retryRemaining:Math.max(0,wrt.retryRemaining-weaponReturnAge)} : undefined
    const pistolEvent = ghost ? undefined : latestPistolSwap(record, at)
    const pst = pistolEvent?.pistolSwap
    const pistolAge = pistolEvent ? (at-pistolEvent.time)/1000 : Infinity
    const pistolSwap = pst && pistolAge>=0 && pistolAge<pst.validFor && pst.state!=='ended'
        && cometActionMatches(sampledDecision, pst.action)
        ? {...pst,elapsed:pst.elapsed+pistolAge,contactAge:pst.contactAge+pistolAge} : undefined
    const reloadEvent = ghost ? undefined : latestReloadTiming(record, at)
    const rt = reloadEvent?.reloadTiming
    const reloadAge = reloadEvent ? (at-reloadEvent.time)/1000 : Infinity
    const reloadTiming = rt && reloadAge>=0 && reloadAge<rt.validFor && rt.state!=='ended'
        && cometActionMatches(sampledDecision, rt.action)
        ? {...rt,elapsed:rt.elapsed+reloadAge,contactAge:rt.contactAge+reloadAge} : undefined
    const feintEvent = ghost ? undefined : latestCoverFeint(record, at)
    const ft = feintEvent?.coverFeint
    const feintAge = feintEvent ? (at-feintEvent.time)/1000 : Infinity
    const coverFeint = ft && feintAge>=0 && feintAge<ft.validFor && ft.state!=='ended'
        && cometActionMatches(sampledDecision, 'Freeze')
        ? {...ft,elapsed:ft.elapsed+feintAge,contactAge:ft.contactAge+feintAge} : undefined
    const relocationEvent = ghost ? undefined : latestOutdoorRelocation(record, at)
    const reloc = relocationEvent?.outdoorRelocation
    const relocationAge = relocationEvent ? (at-relocationEvent.time)/1000 : Infinity
    const outdoorRelocation = reloc && relocationAge>=0 && relocationAge<reloc.validFor && ['planning','ready','throwing','moving'].includes(reloc.state)
        ? {...reloc, elapsed:reloc.elapsed+relocationAge} : undefined
    const tacticalJumpEvent = ghost ? undefined : latestTacticalJump(record, at)
    const tj = tacticalJumpEvent?.tacticalJump
    const tacticalJumpAge = tacticalJumpEvent ? (at-tacticalJumpEvent.time)/1000 : Infinity
    const tacticalJump = tj && tacticalJumpAge>=0 && tacticalJumpAge<tj.validFor && ['requested','pending','airborne'].includes(tj.state)
        ? {...tj, elapsed:tj.elapsed+tacticalJumpAge} : undefined
    const validityEvent = ghost ? undefined : latestValidity(record,at)
    const vc = validityEvent?.validity
    const validityAge = validityEvent ? (at-validityEvent.time)/1000 : Infinity
    const validity = vc && validityAge>=0 && validityAge<vc.validFor ? vc : undefined
    const lifecycleEvent = ghost ? undefined : latestLifecycle(record,at)
    const lc = lifecycleEvent?.lifecycle
    const lifeAge = lifecycleEvent ? (at-lifecycleEvent.time)/1000 : Infinity
    const lifecycle = lc && lifeAge>=0 && lifeAge<lc.validFor ? lc : undefined
    const faultIsolationEvent = ghost ? undefined : latestFaultIsolation(record,at)
    const fi = faultIsolationEvent?.faultIsolation
    const faultAge = faultIsolationEvent ? (at-faultIsolationEvent.time)/1000 : Infinity
    const faultIsolation = fi && faultAge>=0 && faultAge<fi.validFor ? {...fi, retryIn:Math.max(0,fi.retryIn-faultAge)} : undefined
    const coverScanEvent = ghost ? undefined : latestCoverScan(record,at)
    const cs = coverScanEvent?.coverScan
    const coverScanAge = coverScanEvent ? (at-coverScanEvent.time)/1000 : Infinity
    const coverScan = cs && coverScanAge>=0 && coverScanAge<cs.validFor && !['ended'].includes(cs.state)
        ? cs : undefined
    const movementRecoveryEvent = ghost ? undefined : latestMovementRecovery(record,at)
    const mr = movementRecoveryEvent?.movementRecovery
    const movementRecoveryAge = movementRecoveryEvent ? (at-movementRecoveryEvent.time)/1000 : Infinity
    const movementRecovery = mr && movementRecoveryAge>=0 && movementRecoveryAge<mr.validFor && !['ended','recovered','exhausted','paused'].includes(mr.state)
        ? mr : undefined
    const doorClosingEvent = ghost ? undefined : latestDoorClosing(record,at)
    const dc = doorClosingEvent?.doorClosing
    const doorClosingAge = doorClosingEvent ? (at-doorClosingEvent.time)/1000 : Infinity
    const doorClosing = dc && doorClosingAge>=0 && doorClosingAge<dc.validFor && !['ended','confirmed','rejected','failed'].includes(dc.state)
        ? dc : undefined
    const doorMotionEvent = ghost ? undefined : latestDoorMotion(record,at)
    const dm = doorMotionEvent?.doorMotion
    const doorMotionAge = doorMotionEvent ? (at-doorMotionEvent.time)/1000 : Infinity
    const doorMotion = dm && doorMotionAge>=0 && doorMotionAge<dm.validFor && !['ended','confirmed','rejected'].includes(dm.state)
        ? dm : undefined
    const doorSpatialEvent = ghost ? undefined : latestDoorSpatial(record,at)
    const ds = doorSpatialEvent?.doorSpatial
    const doorSpatialAge = doorSpatialEvent ? (at-doorSpatialEvent.time)/1000 : Infinity
    const doorSpatial = ds && doorSpatialAge>=0 && doorSpatialAge<ds.validFor && !['ended'].includes(ds.state)
        ? ds : undefined
    const doorRecoveryEvent = ghost ? undefined : latestDoorRecovery(record,at)
    const dr = doorRecoveryEvent?.doorRecovery
    const doorRecoveryAge = doorRecoveryEvent ? (at-doorRecoveryEvent.time)/1000 : Infinity
    const doorRecovery = dr && doorRecoveryAge>=0 && doorRecoveryAge<dr.validFor && !['ended','blocked','confirmed'].includes(dr.state)
        ? dr : undefined
    const transitEvent = ghost ? undefined : latestDoorTransit(record,at)
    const dt = transitEvent?.doorTransit
    const transitAge = transitEvent ? (at-transitEvent.time)/1000 : Infinity
    const doorTransit = dt && transitAge>=0 && transitAge<dt.validFor && !['ended','blocked'].includes(dt.state)
        ? dt : undefined
    const outcomeEvent = ghost ? undefined : latestOutcome(record,at)
    const ot = outcomeEvent?.outcome
    const outcomeAge = outcomeEvent ? (at-outcomeEvent.time)/1000 : Infinity
    const outcome = ot && outcomeAge>=0 && outcomeAge<Math.min(.35,ot.validFor,ot.remaining) && ot.state!=='ended'
        ? {...ot,age:ot.age+outcomeAge,remaining:Math.max(0,ot.remaining-outcomeAge)} : undefined
    const encounterEvent = ghost ? undefined : latestEncounter(record, at)
    const en = encounterEvent?.encounter
    const encounterAge = encounterEvent ? (at - encounterEvent.time) / 1000 : Infinity
    const encounter = en && encounterAge >= 0 && encounterAge < Math.min(.35,en.validFor,en.remaining) && en.state !== 'ended'
        ? {...en, age: en.age + encounterAge, remaining: Math.max(0,en.remaining - encounterAge)} : undefined
    const restEvent = ghost ? undefined : latestRestLights(record, at)
    const rl = restEvent?.restLights
    const restAge = restEvent ? (at-restEvent.time)/1000 : Infinity
    const restLights = rl && cometActionMatches(sampledDecision, rl.behavior) && restAge>=0 && restAge<rl.validFor && !['released','no-device'].includes(rl.state)
        ? {...rl, waitRemaining:Math.max(0,rl.waitRemaining-restAge), cooldownRemaining:Math.max(0,rl.cooldownRemaining-restAge)} : undefined
    const devicesEvent = ghost ? undefined : latestTacticalDevices(record, at)
    const td = devicesEvent?.tacticalDevices
    const devicesAge = devicesEvent ? (at-devicesEvent.time)/1000 : Infinity
    const tacticalDevices = td && cometActionMatches(sampledDecision, td.action) && devicesAge>=0 && devicesAge<td.validFor && !['released','no-device'].includes(td.state)
        ? {...td, accessories:td.accessories.map(a=>({...a,retryIn:Math.max(0,a.retryIn-devicesAge)}))} : undefined
    const lightEvent = ghost ? undefined : latestLightDiscipline(record, at)
    const ld = lightEvent?.lightDiscipline
    const lightAge = lightEvent ? (at-lightEvent.time)/1000 : Infinity
    const lightMatches = ld && (cometActionMatches(sampledDecision, ld.action))
    const lightDiscipline = ld && lightMatches && lightAge>=0 && lightAge<ld.validFor && ld.state==='dark' && ld.observedOff
        ? {...ld, contactAge:ld.contactAge!==null?ld.contactAge+lightAge:null} : undefined
    const squadVoiceEvent = ghost ? undefined : latestSquadVoice(record, at)
    const sv = squadVoiceEvent?.squadVoice
    const svAge = squadVoiceEvent ? (at-squadVoiceEvent.time)/1000 : Infinity
    const squadVoice = sv && cometActionMatches(sampledDecision, sv.action) && svAge>=0 && svAge<sv.validFor
        && (sv.played || sv.filtered) ? sv : undefined
    const squadFireEvent = ghost ? undefined : latestSquadFire(record, at)
    const sf = squadFireEvent?.squadFire
    const sfAge = squadFireEvent ? (at-squadFireEvent.time)/1000 : Infinity
    const squadFire = sf && cometActionMatches(sampledDecision, sf.action) && sfAge>=0 && sfAge<sf.validFor
        && sf.applied && (sf.stopped || sf.startPrevented) && ['blocked','clearing'].includes(sf.state)
        ? {...sf,blockedFor:sf.blockedFor+sfAge} : undefined
    const laneEvent = ghost ? undefined : latestFireLane(record, at)
    const lane = laneEvent?.fireLane
    const laneAge = laneEvent ? (at-laneEvent.time)/1000 : Infinity
    const laneCompatible = lane && (cometActionMatches(sampledDecision, lane.action)
        || lane.action==='Freeze' && !!crossfire && /^COMET:Crossfire.*Moving$/.test(sampledDecision||''))
    const fireLane = lane && laneCompatible && laneAge>=0 && laneAge<lane.validFor && lane.applied && lane.confirmed
        && ['holding','stepping'].includes(lane.state)
        ? {...lane,shotAge:lane.shotAge+laneAge,wait:lane.wait+(lane.state==='holding'?laneAge:0)} : undefined
    const weaveEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const rw = weaveEvent?.retreatWeave
    const weaveAge = weaveEvent ? (at-weaveEvent.time)/1000 : Infinity
    const retreatWeave = rw && weaveAge>=0 && weaveAge<rw.validFor && rw.state==='evading'
        && ['SeekCover','Retreat','RunAway','AvoidGrenade','COMET:Cover','COMET:FallBack'].includes((sampledDecision || '').replace(/^SAIN:/,''))
        && !cornerPrefire && !doorEntry && !cornerPeek && !cornerChase
        ? {...rw,contactAge:rw.contactAge+weaveAge} : undefined
    const adsEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const atx = adsEvent?.adsTravel
    const adsAge = adsEvent ? (at-adsEvent.time)/1000 : Infinity
    const adsTravel = atx && adsAge>=0 && adsAge<atx.validFor && atx.state==='suppressing' && atx.requestedOff
        && ['SeekCover','Retreat','RunAway','RushEnemy','COMET:Cover','COMET:FallBack','COMET:Push'].includes((sampledDecision || '').replace(/^SAIN:/,''))
        && !cornerPrefire && !doorEntry && !cornerPeek && !cornerChase
        ? {...atx,sinceShot:atx.sinceShot+adsAge,retryIn:Math.max(0,atx.retryIn-adsAge)} : undefined
    const travelEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const ct = travelEvent?.coverTravel
    const travelAge = travelEvent ? (at-travelEvent.time)/1000 : Infinity
    const coverTravel = ct && travelAge>=0 && travelAge<ct.validFor && ['face-walk','dash'].includes(ct.state)
        && ['SAIN:SeekCover','SeekCover','COMET:Cover','COMET:FallBack','SAIN:Retreat','Retreat'].includes(sampledDecision || '')
        && !doorEmergency && !doorEntry && !doorSupport && !cornerPeek && !cornerChase
        ? {...ct,remaining:Math.max(0,ct.remaining-travelAge),contactAge:ct.contactAge+travelAge} : undefined
    const holdAngleEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const ha = holdAngleEvent?.holdAngle
    const holdAngleAge = holdAngleEvent ? (at-holdAngleEvent.time)/1000 : Infinity
    const holdAngle = ha && holdAngleAge>=0 && holdAngleAge<ha.validFor && ha.state!=='ended'
        && ['COMET:Hold','SAIN:Freeze','Freeze'].includes(sampledDecision || '')
        && !doorAmbush && !doorSupport && !doorEmergency && !doorEntry && !cornerPeek && !cornerChase
        ? {...ha,remaining:Math.max(0,ha.remaining-holdAngleAge),contactAge:ha.contactAge+holdAngleAge} : undefined
    const angleEvent = ghost ? undefined : latestCometEvent(record, at, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true)
    const aw = angleEvent?.angleWatch
    const angleAge = angleEvent ? (at-angleEvent.time)/1000 : Infinity
    const angleWatch = aw && angleAge>=0 && angleAge<aw.validFor
        && ['Search','RushEnemy','HoldInCover','StandAndShoot','COMET:Search','COMET:Push','COMET:Hold','COMET:Shoot'].includes((sampledDecision || '').replace(/^SAIN:/,''))
        && !cornerChase && !cornerPrefire && !cornerPeek && !doorApproach && !doorEntry && !doorRoomClear && !doorAmbush
        ? {...aw,remaining:Math.max(0,aw.remaining-angleAge),contactAge:aw.contactAge+angleAge} : undefined
    const controlEvent=latestControl(record,at)
    const controlHandoff=controlEvent && at-controlEvent.time<30000 && (!ghost || controlEvent.controlHandoff?.owner==='sleep') ? controlEvent.controlHandoff : undefined
    // A transfer invalidates sampled COMET actions only until newer action evidence exists.
    if(controlEvent && (controlEvent.controlHandoff?.pending || ['orbit','questing','looting','extraction','sleep','other'].includes(controlEvent.controlHandoff?.owner||''))
       && controlEvent.time>=sampledAt && (!action.event || controlEvent.time>=action.event.time)) {
        action={...action,active:false,decision:action.decision.startsWith('COMET:')?'':action.decision,event:undefined}
    }
    return { ...action, controlJournal, journal, controlHandoff, validity, lifecycle, faultIsolation, coverScan, movementRecovery, doorClosing, doorMotion, doorSpatial, doorRecovery, doorTransit, outcome, encounter, restLights, tacticalDevices, lightDiscipline, squadVoice, squadFire, fireLane, progress, handoff, hearing, quiet, gunfire, floorHearing, closeDetection, impact, silentSearch, searchAbandonment, environmentContext, doorApproach, doorJumpPeek, doorRunBy, doorStepPeek, doorFakeMedical, doorFakeGrenade, doorRoomClear, doorAmbush, doorHold, doorSupport, doorInterruption, doorEmergency, doorReservation, doorEntry, combatStep, firePause, cornerPeek, combatLean, cornerChase, cornerPrefire, angleWatch, holdAngle, coverTravel, adsTravel, retreatWeave, tacticalJump, outdoorRelocation, coverFeint, reloadTiming, pistolSwap, weaponReturn, quickReload, magazineRecovery, weaponRange, weaponSync, suppressionDiscipline, readyStance, crossfire, postCombat, medicalPosture, surgeryInterruption, medicalChoice, explosionAwareness, flashContinuity, gasExposure, grenadeFilter, grenadeDispersion, grenadeReaction, ownGrenadeSafety, grenadeChoice, grenadeTrajectory, grenadeJudgment, handsRecovery, recoilRecovery, shotGeometry, active: action.active || !!journal || !!controlHandoff || !!validity || !!lifecycle || !!faultIsolation || !!coverScan || !!movementRecovery || !!doorClosing || !!doorMotion || !!doorSpatial || !!doorRecovery || !!doorTransit || !!outcome || !!encounter || !!restLights || !!tacticalDevices || !!lightDiscipline || !!squadVoice || !!squadFire || !!fireLane || !!attention || !!hearing || !!quiet || !!gunfire || !!floorHearing || !!closeDetection || !!impact || !!silentSearch || !!searchAbandonment || !!environmentContext || !!doorApproach || !!doorJumpPeek || !!doorRunBy || !!doorStepPeek || !!doorFakeGrenade || !!doorFakeMedical || !!doorRoomClear || !!doorAmbush || !!doorHold || !!doorSupport || !!doorInterruption || !!doorEmergency || !!doorReservation || !!doorEntry || !!combatStep || !!firePause || !!cornerPeek || !!combatLean || !!cornerChase || !!cornerPrefire || !!angleWatch || !!holdAngle || !!coverTravel || !!adsTravel || !!retreatWeave || !!tacticalJump || !!outdoorRelocation || !!coverFeint || !!reloadTiming || !!pistolSwap || !!weaponReturn || !!quickReload || !!magazineRecovery || !!weaponRange || !!weaponSync || !!suppressionDiscipline || !!shotGeometry || !!recoilRecovery || !!handsRecovery || !!grenadeJudgment || !!readyStance || !!crossfire || !!postCombat || !!medicalPosture || !!surgeryInterruption || !!medicalChoice || !!explosionAwareness || !!flashContinuity || !!gasExposure || !!grenadeFilter || !!grenadeDispersion || !!grenadeReaction || !!ownGrenadeSafety || !!grenadeChoice || !!grenadeTrajectory, actionActive: action.active, attention }

}



export const cometBadgeHtml = '<span class="rr-comet-badge">COMET</span>'

export const cometMarkerBadgeHtml = '<span class="rr-comet-marker-badge" aria-label="COMET decision">COMET</span>'



export function cometTooltipHtml(state: ReturnType<typeof cometMapState>, record: CometMapRecord | undefined, at: number, names: Record<string, string>): string {

    if (!state.active && !state.handoff) return ''

    const color = getBehaviorCategory(state.decision).color

    const heading = `${state.actionActive ? cometBadgeHtml : escape(getDecisionSource(state.decision))} <strong style="color:${color}">${escape(formatDecisionLabel(state.decision))}</strong>`

    const controlHandoff=state.controlHandoff ? `<div class="rr-comet-contact"><b>Control handoff · I02</b>${cometControlHandoffSummary(state.controlHandoff).map(line=>`<div>${escape(line)}</div>`).join('')}</div>` : ''
    const handoff = state.handoff ? `<div class="rr-comet-contact"><b>Plan continuity / SAIN handoff · A13</b>${cometHandoffSummary(state.handoff).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''

    const hearing = state.hearing ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Movement heard · P01</b>${cometHearingSummary(state.hearing, names).map(line => `<div>${escape(line)}</div>`).join('')}<div class="rr-comet-muted">Recent perception; native behavior colors are unchanged.</div></div>` : ''

    const quiet = state.quiet ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Quiet approach · P02</b>${cometQuietSummary(state.quiet, names).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''

    const gunfire = state.gunfire ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Gunfire reaction · P03</b>${cometGunfireSummary(state.gunfire, names).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''

    const controlJournal=state.controlJournal?`<div class="rr-comet-contact">${cometBadgeHtml} <b>Control transitions - T04</b>${state.controlJournal.lines.map(line=>`<div>${escape(line)}</div>`).join('')}</div>`:''
    const journal=state.journal?`<div class="rr-comet-contact">${cometBadgeHtml} <b>Combat / weapon journal</b>${state.journal.lines.map(line=>`<div>${escape(line)}</div>`).join('')}</div>`:''
    const weaponReturn = state.weaponReturn ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Weapon return - W03</b>${cometWeaponReturnSummary(state.weaponReturn).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const readyStance = state.readyStance ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Weapon ready after combat - H05</b>${cometReadyStanceSummary(state.readyStance).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const crossfire = state.crossfire ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>${cometCrossfireTitle(state.crossfire)}</b>${cometCrossfireSummary(state.crossfire).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const postCombat = state.postCombat ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Post-combat recovery - H04</b>${cometPostCombatSummary(state.postCombat).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const medicalPosture = state.medicalPosture ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Medical posture - H03</b>${cometMedicalPostureSummary(state.medicalPosture).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const surgeryInterruption = state.surgeryInterruption ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Surgery interruption - H02</b>${cometSurgeryInterruptionSummary(state.surgeryInterruption).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const medicalChoice = state.medicalChoice ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Medical choice - H01</b>${cometMedicalChoiceSummary(state.medicalChoice).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const explosionAwareness = state.explosionAwareness ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Explosion awareness - G10</b>${cometExplosionAwarenessSummary(state.explosionAwareness).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const flashContinuity = state.flashContinuity ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Flash continuity - G09</b>${cometFlashContinuitySummary(state.flashContinuity).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const gasExposure = state.gasExposure ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>CS gas exposure - G08</b>${cometGasExposureSummary(state.gasExposure).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const grenadeFilter = state.grenadeFilter ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Offensive grenade filter - G07</b>${cometGrenadeFilterSummary(state.grenadeFilter).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const grenadeDispersion = state.grenadeDispersion ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Squad grenade dispersion - G06</b>${cometGrenadeDispersionSummary(state.grenadeDispersion).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const grenadeReaction = state.grenadeReaction ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Grenade reactions - G05</b>${cometGrenadeReactionSummary(state.grenadeReaction).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const ownGrenadeSafety = state.ownGrenadeSafety ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Own grenade safety - G04</b>${cometOwnGrenadeSafetySummary(state.ownGrenadeSafety).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const grenadeChoice = state.grenadeChoice ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Grenade choice - G03</b>${cometGrenadeChoiceSummary(state.grenadeChoice).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const grenadeTrajectory = state.grenadeTrajectory ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Grenade trajectory - G02</b>${cometGrenadeTrajectorySummary(state.grenadeTrajectory).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const grenadeJudgment = state.grenadeJudgment ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Grenade judgment - G01</b>${cometGrenadeJudgmentSummary(state.grenadeJudgment).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const handsRecovery = state.handsRecovery ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Hands recovery - W10</b>${cometHandsRecoverySummary(state.handsRecovery).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const recoilRecovery = state.recoilRecovery ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Recoil recovery - W09</b>${cometRecoilRecoverySummary(state.recoilRecovery).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const shotGeometry = state.shotGeometry ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Shot geometry - W08</b>${cometShotGeometrySummary(state.shotGeometry).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const suppressionDiscipline = state.suppressionDiscipline ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Suppression discipline - W07</b>${cometSuppressionDisciplineSummary(state.suppressionDiscipline).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const weaponSync = state.weaponSync ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Equipment sync - W06</b>${cometWeaponSyncSummary(state.weaponSync).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const weaponRange = state.weaponRange ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Weapon by distance - W05</b>${cometWeaponRangeSummary(state.weaponRange).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const magazineRecovery = state.magazineRecovery ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>${escape(magazineRecoveryTitle(state.magazineRecovery))}</b><div>${escape(state.magazineRecovery.itemName)} · ${escape(state.magazineRecovery.magazine)}</div></div>` : ''
    const quickReload = state.quickReload ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Fast reload - W04</b>${cometQuickReloadSummary(state.quickReload).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const pistolSwap = state.pistolSwap ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Pistol swap - W02</b>${cometPistolSwapSummary(state.pistolSwap).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const reloadTiming = state.reloadTiming ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Reload timing - W01</b>${cometReloadTimingSummary(state.reloadTiming).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const coverFeint = state.coverFeint ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Cover feint - M14</b>${cometCoverFeintSummary(state.coverFeint).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const outdoorRelocation = state.outdoorRelocation ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Change cover outdoors - M13</b>${cometOutdoorRelocationSummary(state.outdoorRelocation).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const tacticalJump = state.tacticalJump ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Tactical jumps - M12</b>${cometTacticalJumpSummary(state.tacticalJump).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const validity = state.validity ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Invalid reference safety - C10</b>${cometValiditySummary(state.validity).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const lifecycle = state.lifecycle ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Death and revive safety - C09</b>${cometLifecycleSummary(state.lifecycle).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const faultIsolation = state.faultIsolation ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Error isolation - C08</b>${cometFaultIsolationSummary(state.faultIsolation).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const coverScan = state.coverScan ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Stable cover search - C07</b>${cometCoverScanSummary(state.coverScan).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const movementRecovery = state.movementRecovery ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Stuck movement recovery - C06</b>${cometMovementRecoverySummary(state.movementRecovery).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const doorClosing = state.doorClosing ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Automatic door closing - C05</b>${cometDoorClosingSummary(state.doorClosing).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const doorMotion = state.doorMotion ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Door motion - C04</b>${cometDoorMotionSummary(state.doorMotion).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const doorSpatial = state.doorSpatial ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Door geometry - C03</b>${cometDoorSpatialSummary(state.doorSpatial).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const doorRecovery = state.doorRecovery ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Door recovery - C02</b>${cometDoorRecoverySummary(state.doorRecovery).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const doorTransit = state.doorTransit ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Door traversal - C01</b>${cometDoorTransitSummary(state.doorTransit).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const outcome = state.outcome ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Tactical feedback - E04</b>${cometOutcomeSummary(state.outcome,names).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const encounter = state.encounter ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Repeated peeks - E03</b>${cometEncounterSummary(state.encounter,names).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const restLights = state.restLights ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Lights while resting - L03</b>${cometRestLightsSummary(state.restLights).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const tacticalDevices = state.tacticalDevices ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Weapon accessories - L02</b>${cometTacticalDevicesSummary(state.tacticalDevices).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const lightDiscipline = state.lightDiscipline ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Ambush lights - L01</b>${cometLightDisciplineSummary(state.lightDiscipline).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const squadVoice = state.squadVoice ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Squad voice - S09</b>${cometSquadVoiceSummary(state.squadVoice).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const squadFire = state.squadFire ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Protect squad while firing - S08</b>${cometSquadFireSummary(state.squadFire).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const fireLane = state.fireLane ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Allied firing lanes - S07</b>${cometFireLaneSummary(state.fireLane).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const retreatWeave = state.retreatWeave ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Evasive retreat - M11</b>${cometRetreatWeaveSummary(state.retreatWeave).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const adsTravel = state.adsTravel ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Release ADS for travel - M10</b>${cometAdsTravelSummary(state.adsTravel).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const coverTravel = state.coverTravel ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Face threat en route - M09</b>${cometCoverTravelSummary(state.coverTravel).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const holdAngle = state.holdAngle ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Open watched angle - M08</b>${cometHoldAngleSummary(state.holdAngle).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const angleWatch = state.angleWatch ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Watch useful angle - M07</b>${cometAngleWatchSummary(state.angleWatch).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const cornerPrefire = state.cornerPrefire ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Corner prefire - M06</b>${cometCornerPrefireSummary(state.cornerPrefire).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const cornerChase = state.cornerChase ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Corner chase - M05</b>${cometCornerChaseSummary(state.cornerChase).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const combatLean = state.combatLean ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Head movement - M04</b>${cometCombatLeanSummary(state.combatLean).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const cornerPeek = state.cornerPeek ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Corner peeks - M03</b>${cometCornerPeekSummary(state.cornerPeek).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const firePause = state.firePause ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Pause to fire - M02</b>${cometFirePauseSummary(state.firePause).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const combatStep = state.combatStep ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Move while shooting - M01</b>${cometCombatStepSummary(state.combatStep).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const doorEntry = state.doorEntry ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Native door entry - D15</b>${cometDoorEntrySummary(state.doorEntry).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const doorReservation = state.doorReservation ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Door reservation - D14</b>${cometDoorReservationSummary(state.doorReservation).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const doorEmergency = state.doorEmergency ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Door emergency - D13</b>${cometDoorEmergencySummary(state.doorEmergency).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const doorInterruption = state.doorInterruption ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Door interruption - D12</b>${cometDoorInterruptionSummary(state.doorInterruption).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const doorSupport = state.doorSupport ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Door support - D11</b>${cometDoorSupportSummary(state.doorSupport).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const doorHold = state.doorHold ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Hold positioning - D10</b>${cometDoorHoldSummary(state.doorHold).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const doorAmbush = state.doorAmbush ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Doorway ambush - D09</b>${cometDoorAmbushSummary(state.doorAmbush,names).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const doorRoomClear = state.doorRoomClear ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>${cometDoorClearTitle(state.doorRoomClear)}</b>${cometDoorClearSummary(state.doorRoomClear,names).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const doorFakeMedical = state.doorFakeMedical ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Medical feint - D06</b>${cometDoorMedicalSummary(state.doorFakeMedical,names).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const doorFakeGrenade = state.doorFakeGrenade ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Fake grenade - D05</b>${cometDoorFakeSummary(state.doorFakeGrenade,names).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const doorStepPeek = state.doorStepPeek ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Small doorway peeks - D04</b>${cometDoorStepSummary(state.doorStepPeek,names).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const doorRunBy = state.doorRunBy ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Doorway run-by - D03</b>${cometDoorRunSummary(state.doorRunBy,names).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const doorJumpPeek = state.doorJumpPeek ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Doorway jump peek - D02</b>${cometDoorJumpSummary(state.doorJumpPeek,names).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const doorApproach = state.doorApproach ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Doorway approach - D01</b>${cometDoorSummary(state.doorApproach,names).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const environmentContext = state.environmentContext ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Surroundings - P10</b>${cometEnvironmentSummary(state.environmentContext).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const searchAbandonment = state.searchAbandonment ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Finish an empty search - P09</b>${cometSearchAbandonmentSummary(state.searchAbandonment,names).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const silentSearch = state.silentSearch ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Search after silence - P08</b>${cometSilentSearchSummary(state.silentSearch,names).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const impact = state.impact ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>React to impact · P07</b>${cometImpactSummary(state.impact, names).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''
    const closeDetection = state.closeDetection ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Close detection · P05</b>${cometCloseDetectionSummary(state.closeDetection, names).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''

    const floorHearing = state.floorHearing ? `<div class="rr-comet-contact">${cometBadgeHtml} <b>Hearing between floors · P04</b>${cometFloorHearingSummary(state.floorHearing, names).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''

    const t = state.attention?.threat

    const threat = t ? `<div class="rr-comet-contact">${state.actionActive ? '' : cometBadgeHtml + ' '}<b>Target priority · A07</b>${cometThreatSummary(t, names).map(line => `<div>${escape(line)}</div>`).join('')}

        <ul>${t.candidates.filter(c => c.target === t.selected).concat(t.candidates.filter(c => c.target !== t.selected).sort((a,b) => Number(b.eligible)-Number(a.eligible) || (b.score ?? -1)-(a.score ?? -1)).slice(0,3))

            .map(c => `<li><div>${escape(cometThreatCandidate(c, names))}${c.target === t.selected ? ' (selected)' : ''}</div><div class="rr-comet-muted">${escape(cometThreatComponents(c))}</div></li>`).join('')}</ul>

        <div class="rr-comet-muted">Snapshot at the last target decision. Target priority does not own the combat action.</div></div>` : ''

    if (!state.actionActive || state.crossfire && state.decision.startsWith('COMET:Crossfire') || state.postCombat && state.decision.startsWith('COMET:PostCombat')) return `<div class="rr-comet-context">${heading}${controlHandoff}${readyStance}${crossfire}${postCombat}${medicalPosture}${surgeryInterruption}${medicalChoice}${explosionAwareness}${flashContinuity}${gasExposure}${grenadeFilter}${grenadeDispersion}${grenadeReaction}${ownGrenadeSafety}${grenadeChoice}${grenadeTrajectory}${grenadeJudgment}${handsRecovery}${recoilRecovery}${shotGeometry}${suppressionDiscipline}${weaponSync}${weaponRange}${quickReload}${magazineRecovery}${controlJournal}${journal}${weaponReturn}${pistolSwap}${reloadTiming}${coverFeint}${outdoorRelocation}${tacticalJump}${validity}${lifecycle}${faultIsolation}${coverScan}${movementRecovery}${doorClosing}${doorMotion}${doorSpatial}${doorRecovery}${doorTransit}${outcome}${encounter}${restLights}${tacticalDevices}${lightDiscipline}${squadVoice}${squadFire}${fireLane}${retreatWeave}${adsTravel}${coverTravel}${holdAngle}${angleWatch}${cornerPrefire}${cornerChase}${combatLean}${cornerPeek}${firePause}${combatStep}${doorEntry}${doorReservation}${doorEmergency}${doorInterruption}${doorSupport}${doorHold}${doorAmbush}${doorRoomClear}${doorFakeMedical}${doorFakeGrenade}${doorStepPeek}${doorRunBy}${doorJumpPeek}${doorApproach}${environmentContext}${searchAbandonment}${silentSearch}${impact}${closeDetection}${floorHearing}${gunfire}${quiet}${hearing}${handoff}${threat}</div>`

    if (state.decision === 'COMET:DefendUnknown' && state.impact)
        return `<div class="rr-comet-context">${heading}${controlHandoff}${readyStance}${crossfire}${postCombat}${medicalPosture}${surgeryInterruption}${medicalChoice}${explosionAwareness}${flashContinuity}${gasExposure}${grenadeFilter}${grenadeDispersion}${grenadeReaction}${ownGrenadeSafety}${grenadeChoice}${grenadeTrajectory}${grenadeJudgment}${handsRecovery}${recoilRecovery}${shotGeometry}${suppressionDiscipline}${weaponSync}${weaponRange}${quickReload}${magazineRecovery}${controlJournal}${journal}${weaponReturn}${pistolSwap}${reloadTiming}${coverFeint}${outdoorRelocation}${tacticalJump}${validity}${lifecycle}${faultIsolation}${coverScan}${movementRecovery}${doorClosing}${doorMotion}${doorSpatial}${doorRecovery}${doorTransit}${outcome}${encounter}${restLights}${tacticalDevices}${lightDiscipline}${squadVoice}${squadFire}${fireLane}${retreatWeave}${adsTravel}${coverTravel}${holdAngle}${angleWatch}${cornerPrefire}${cornerChase}${combatLean}${cornerPeek}${firePause}${combatStep}${doorEntry}${doorReservation}${doorEmergency}${doorInterruption}${doorSupport}${doorHold}${doorAmbush}${doorRoomClear}${doorFakeMedical}${doorFakeGrenade}${doorStepPeek}${doorRunBy}${doorJumpPeek}${doorApproach}${environmentContext}${searchAbandonment}${silentSearch}${impact}${closeDetection}${floorHearing}${gunfire}${quiet}${hearing}${threat}</div>`
    const event = state.event

    if (!event) {

        const message = !record || record.status === 'loading' ? 'Loading decision details...'

            : record.status === 'error' ? 'Details unavailable. Hover again to retry.' : 'No matching decision details recorded.'

        return `<div class="rr-comet-context">${heading}${controlHandoff}${readyStance}${crossfire}${postCombat}${medicalPosture}${surgeryInterruption}${medicalChoice}${explosionAwareness}${flashContinuity}${gasExposure}${grenadeFilter}${grenadeDispersion}${grenadeReaction}${ownGrenadeSafety}${grenadeChoice}${grenadeTrajectory}${grenadeJudgment}${handsRecovery}${recoilRecovery}${shotGeometry}${suppressionDiscipline}${weaponSync}${weaponRange}${quickReload}${magazineRecovery}${controlJournal}${journal}${weaponReturn}${pistolSwap}${reloadTiming}${coverFeint}${outdoorRelocation}${tacticalJump}${validity}${lifecycle}${faultIsolation}${coverScan}${movementRecovery}${doorClosing}${doorMotion}${doorSpatial}${doorRecovery}${doorTransit}${outcome}${encounter}${restLights}${tacticalDevices}${lightDiscipline}${squadVoice}${squadFire}${fireLane}${retreatWeave}${adsTravel}${coverTravel}${holdAngle}${angleWatch}${cornerPrefire}${cornerChase}${combatLean}${cornerPeek}${firePause}${combatStep}${doorEntry}${doorReservation}${doorEmergency}${doorInterruption}${doorSupport}${doorHold}${doorAmbush}${doorRoomClear}${doorFakeMedical}${doorFakeGrenade}${doorStepPeek}${doorRunBy}${doorJumpPeek}${doorApproach}${environmentContext}${searchAbandonment}${silentSearch}${impact}${closeDetection}${floorHearing}${gunfire}${quiet}${hearing}${threat}<div class="rr-comet-muted">${message}</div></div>`

    }

    const c = event.contact

    const sources: Record<string, string> = { seen: 'Last seen', heard: 'Last heard', 'shared-seen': 'Sight shared by squad', 'shared-heard': 'Sound shared by squad', 'sain-last-known': 'Last known contact' }

    const age = c?.age != null && c.age >= 0 ? `${(c.age + Math.max(0, at - event.time) / 1000).toFixed(1)} s ago` : 'age not recorded'

    const contact = c ? `${escape(sources[c.source || ''] || c.source || 'Known contact')} · ${age}${c.distance != null && c.distance >= 0 ? ` · ${c.distance.toFixed(1)} m at decision` : ''}` : 'Not recorded'

    const target = c?.target && names[c.target] ? `<div>${escape(names[c.target])}</div>` : ''

    const position = c?.x != null && c.y != null && c.z != null ? `<div class="rr-comet-muted">Last known position: ${c.x.toFixed(1)}, ${c.y.toFixed(1)}, ${c.z.toFixed(1)}</div>` : ''

    const alternatives = event.candidates.filter(c => 'COMET:' + c.decision !== state.decision)

        .sort((a, b) => Number(b.eligible) - Number(a.eligible) || (b.score ?? -1) - (a.score ?? -1)).slice(0, 3)

        .map(c => `<li><span>${escape(formatDecisionLabel('COMET:' + c.decision))}</span><span>${c.eligible ? `score ${c.score == null ? '?' : Math.round(c.score * 10) / 10}` : escape(cometReason(c.reason))}</span></li>`).join('')

    const v = event.visible

    const risk = (n: number | undefined) => n != null && n >= 0 && n <= 1 ? n.toFixed(2) + ' / 1' : 'not recorded'

    const visible = v ? `<div class="rr-comet-contact"><b>Route risk estimates</b>

        <div>Cover: ${risk(v.coverRouteRisk)} · Push: ${risk(v.pushRouteRisk)}</div>

        <div>Known threats: ${v.knownThreats != null ? Math.max(0, Math.trunc(v.knownThreats)) : '?'}</div>

        ${v.coverId ? `<div class="rr-comet-muted">Cover: ${escape(v.coverId)}</div>` : ''}</div>` : ''

    const h = event.continuity

    const elapsed = Math.max(0, at - event.time) / 1000

    const continuity = h ? `<div class="rr-comet-contact"><b>Brief sight loss</b>

        <div>Lost sight: ${h.lostFor != null && h.lostFor >= 0 ? (h.lostFor + elapsed).toFixed(2) + ' s' : 'not recorded'} · Remaining: ${h.remaining != null && h.remaining >= 0 ? Math.max(0, h.remaining - elapsed).toFixed(2) + ' s' : 'not recorded'}</div>

        <div>${h.frozenRoute ? 'Existing route only' : 'Fixed last seen angle'} · No blind fire authorized</div></div>` : ''

    const progress = state.progress ? `<div class="rr-comet-contact"><b>Plan progress · A12</b>${cometProgressSummary(state.progress).map(line => `<div>${escape(line)}</div>`).join('')}<ul>${event.candidates.map(cometProgressEffect).filter(Boolean).map(line => `<li>${escape(line)}</li>`).join('')}</ul></div>` : ''

    const coverResponse = event.coverResponse ? `<div class="rr-comet-contact"><b>Fight or take cover · A11</b>${cometCoverResponseSummary(event.coverResponse).map(line => `<div>${escape(line)}</div>`).join('')}<ul>${event.candidates.map(cometCoverResponseEffect).filter(Boolean).map(line => `<li>${escape(line)}</li>`).join('')}</ul></div>` : ''

    const opportunity = event.opportunity ? `<div class="rr-comet-contact"><b>Heard opportunities · A10</b>${cometOpportunitySummary(event.opportunity).map(line => `<div>${escape(line)}</div>`).join('')}<ul>${event.candidates.map(cometOpportunityEffect).filter(Boolean).map(line => `<li>${escape(line)}</li>`).join('')}</ul></div>` : ''

    const opponent = event.opponent ? `<div class="rr-comet-contact"><b>Opponent assessment · A09</b>${cometOpponentSummary(event.opponent).map(line => `<div>${escape(line)}</div>`).join('')}<ul>${event.candidates.map(cometOpponentEffect).filter(Boolean).map(line => `<li>${escape(line)}</li>`).join('')}</ul></div>` : ''

    const loadout = event.loadout ? `<div class="rr-comet-contact"><b>Equipment awareness · A08</b>${cometLoadoutSummary(event.loadout).map(line => `<div>${escape(line)}</div>`).join('')}<ul>${event.candidates.map(cometLoadoutEffect).filter(Boolean).map(line => `<li>${escape(line)}</li>`).join('')}</ul></div>` : ''

    const m = event.mixing

    const fear = event.fear ? `<div class="rr-comet-contact"><b>Fear &amp; panic · A06</b>${cometFearSummary(event.fear).map(line => `<div>${escape(line)}</div>`).join('')}<div class="rr-comet-muted">Snapshot at this decision, not a live estimate.</div><ul>${event.candidates.filter(c => c.scoreBeforeFear != null && c.fearDelta != null).map(c => `<li>${escape(c.decision)}: ${c.scoreBeforeFear} → ${c.score} (${c.fearDelta! >= 0 ? '+' : ''}${c.fearDelta!.toFixed(2)})</li>`).join('')}</ul></div>` : ''

    const mistake = m?.mistake ? `<div class="rr-comet-contact"><b>Occasional mistakes · A05</b>${cometMistakeSummary(m.mistake).map(line => `<div>${escape(line)}</div>`).join('')}</div>` : ''

    const mixing = m ? `<div class="rr-comet-contact"><b>Decision variety · A04</b>

        <div>${escape(cometReason(m.state))}</div>

        <div class="rr-comet-muted">${escape(cometReason(m.trigger))} · Choice #${m.opportunity ?? '?'}${m.roll != null ? ` · Roll ${m.roll.toFixed(4)}` : ' · No random draw'}</div>

        <ul>${m.options.filter(o => (o.probability ?? 0) > 0).sort((a,b) => (b.score ?? 0) - (a.score ?? 0)).map(o =>

            `<li>${escape(formatDecisionLabel('COMET:' + o.decision))}${o.decision === m.selected ? ' (chosen)' : ''}: ${cometProbability(o.probability)}</li>`).join('')}</ul>

        <div class="rr-comet-muted">Probabilities at selection, before keeping the plan.</div></div>` : ''

    return `<div class="rr-comet-context">${heading}<div><b>Why:</b> ${escape(cometReason(event.choiceReason))}</div>

        <div class="rr-comet-contact"><b>Known contact</b>${target}<div>${contact}</div>${position}</div>

        ${controlHandoff}${readyStance}${crossfire}${postCombat}${medicalPosture}${surgeryInterruption}${medicalChoice}${explosionAwareness}${flashContinuity}${gasExposure}${grenadeFilter}${grenadeDispersion}${grenadeReaction}${ownGrenadeSafety}${grenadeChoice}${grenadeTrajectory}${grenadeJudgment}${handsRecovery}${recoilRecovery}${shotGeometry}${suppressionDiscipline}${weaponSync}${weaponRange}${quickReload}${magazineRecovery}${controlJournal}${journal}${weaponReturn}${pistolSwap}${reloadTiming}${coverFeint}${outdoorRelocation}${tacticalJump}${validity}${lifecycle}${faultIsolation}${coverScan}${movementRecovery}${doorClosing}${doorMotion}${doorSpatial}${doorRecovery}${doorTransit}${outcome}${encounter}${restLights}${tacticalDevices}${lightDiscipline}${squadVoice}${squadFire}${fireLane}${retreatWeave}${adsTravel}${coverTravel}${holdAngle}${angleWatch}${cornerPrefire}${cornerChase}${combatLean}${cornerPeek}${firePause}${combatStep}${doorEntry}${doorReservation}${doorEmergency}${doorInterruption}${doorSupport}${doorHold}${doorAmbush}${doorRoomClear}${doorFakeMedical}${doorFakeGrenade}${doorStepPeek}${doorRunBy}${doorJumpPeek}${doorApproach}${environmentContext}${searchAbandonment}${silentSearch}${impact}${closeDetection}${floorHearing}${gunfire}${quiet}${hearing}${handoff}${progress}${threat}${loadout}${opponent}${opportunity}${coverResponse}${fear}${visible}${continuity}${mistake}${mixing}<div class="rr-comet-alternatives"><b>Main alternatives</b>${alternatives ? `<ul>${alternatives}</ul>` : '<div>Not recorded</div>'}</div>

        <div class="rr-comet-muted">${escape(event.feature)} · Accepted by SAIN; completion not confirmed</div></div>`

}
