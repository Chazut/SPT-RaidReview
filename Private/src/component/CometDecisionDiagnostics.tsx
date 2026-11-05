import CometReadableHistory from './CometReadableHistory'
import { CometModePicker } from './CometReplayPanel'
import { useCometDisplayMode } from './useCometDisplayMode'
import CometJournalSummary from './CometJournalSummary'
import {parseCometJournal} from '../helpers/cometJournal'
import CometCountersSummary from './CometCountersSummary'
import { parseCometControlHandoff, cometControlHandoffSummary } from '../helpers/cometControlHandoff'
import { parseCometSainPreset, cometSainPresetSummary } from '../helpers/cometSainPreset'
import { parseCometDifficultyPreset, cometDifficultyPresetSummary } from '../helpers/cometDifficultyPreset'
import { parseCometRaidCleanup, cometRaidCleanupSummary } from '../helpers/cometRaidCleanup'
import { parseCometValidity, cometValiditySummary } from '../helpers/cometValidity'
import { parseCometLifecycle, cometLifecycleSummary } from '../helpers/cometLifecycle'
import { parseCometFaultIsolation, cometFaultIsolationSummary } from '../helpers/cometFaultIsolation'
import { parseCometCoverScan, cometCoverScanSummary } from '../helpers/cometCoverScan'
import { parseCometMovementRecovery, cometMovementRecoverySummary } from '../helpers/cometMovementRecovery'
import { parseCometDoorClosing, cometDoorClosingSummary } from '../helpers/cometDoorClosing'
import { parseCometDoorMotion, cometDoorMotionSummary } from '../helpers/cometDoorMotion'
import { parseCometDoorSpatial, cometDoorSpatialSummary } from '../helpers/cometDoorSpatial'
import { parseCometDoorRecovery, cometDoorRecoverySummary } from '../helpers/cometDoorRecovery'
import { parseCometDoorTransit, cometDoorTransitSummary } from '../helpers/cometDoorTransit'
import { parseCometOutcome, cometOutcomeSummary } from '../helpers/cometOutcome'
import { parseCometEncounter, cometEncounterSummary } from '../helpers/cometEncounter'
import { parseCometRestLights, cometRestLightsSummary, cometRestLightsIdentifiers } from '../helpers/cometRestLights'
import { parseCometTacticalDevices, cometTacticalDevicesSummary, cometTacticalDeviceIdentifiers } from '../helpers/cometTacticalDevices'
import { parseCometLightDiscipline, cometLightDisciplineSummary } from '../helpers/cometLightDiscipline'
import { parseCometSquadVoice, cometSquadVoiceSummary } from '../helpers/cometSquadVoice'
import { parseCometSquadFire, cometSquadFireSummary } from '../helpers/cometSquadFire'
import { parseCometFireLane, cometFireLaneSummary } from '../helpers/cometFireLane'
import { parseCometReadyStance, cometReadyStanceSummary } from '../helpers/cometReadyStance'
import { parseCometCrossfire, cometCrossfireSummary, cometCrossfireTitle } from '../helpers/cometCrossfire'
import { parseCometPostCombat, cometPostCombatSummary } from '../helpers/cometPostCombat'
import { parseCometMedicalPosture, cometMedicalPostureSummary } from '../helpers/cometMedicalPosture'
import { parseCometSurgeryInterruption, cometSurgeryInterruptionSummary } from '../helpers/cometSurgeryInterruption'
import { parseCometMedicalChoice, cometMedicalChoiceSummary } from '../helpers/cometMedicalChoice'
import { parseCometExplosionAwareness, cometExplosionAwarenessSummary } from '../helpers/cometExplosionAwareness'
import { parseCometFlashContinuity, cometFlashContinuitySummary } from '../helpers/cometFlashContinuity'
import { parseCometGasExposure, cometGasExposureSummary } from '../helpers/cometGasExposure'
import { parseCometGrenadeFilter, cometGrenadeFilterSummary } from '../helpers/cometGrenadeFilter'
import { parseCometGrenadeDispersion, cometGrenadeDispersionSummary } from '../helpers/cometGrenadeDispersion'
import { parseCometGrenadeReaction, cometGrenadeReactionSummary } from '../helpers/cometGrenadeReaction'
import { parseCometOwnGrenadeSafety, cometOwnGrenadeSafetySummary } from '../helpers/cometOwnGrenadeSafety'
import { parseCometGrenadeChoice, cometGrenadeChoiceSummary } from '../helpers/cometGrenadeChoice'
import { parseCometGrenadeTrajectory, cometGrenadeTrajectorySummary } from '../helpers/cometGrenadeTrajectory'
import { parseCometGrenadeJudgment, cometGrenadeJudgmentSummary } from '../helpers/cometGrenadeJudgment'
import { parseCometHandsRecovery, cometHandsRecoverySummary } from '../helpers/cometHandsRecovery'
import { parseCometRecoilRecovery, cometRecoilRecoverySummary } from '../helpers/cometRecoilRecovery'
import { parseCometShotGeometry, cometShotGeometrySummary } from '../helpers/cometShotGeometry'
import { parseCometSuppressionDiscipline, cometSuppressionDisciplineSummary } from '../helpers/cometSuppressionDiscipline'
import { parseCometWeaponSync, cometWeaponSyncSummary } from '../helpers/cometWeaponSync'
import { parseCometWeaponRange, cometWeaponRangeSummary } from '../helpers/cometWeaponRange'
import { parseCometQuickReload, cometQuickReloadSummary } from '../helpers/cometQuickReload'
import { parseCometWeaponReturn, cometWeaponReturnSummary } from '../helpers/cometWeaponReturn'
import { parseCometPistolSwap, cometPistolSwapSummary } from '../helpers/cometPistolSwap'
import { parseCometReloadTiming, cometReloadTimingSummary } from '../helpers/cometReloadTiming'
import { parseCometCoverFeint, cometCoverFeintSummary } from '../helpers/cometCoverFeint'
import { parseCometOutdoorRelocation, cometOutdoorRelocationSummary } from '../helpers/cometOutdoorRelocation'
import { parseCometTacticalJump, cometTacticalJumpSummary } from '../helpers/cometTacticalJump'
import { parseCometRetreatWeave, cometRetreatWeaveSummary } from '../helpers/cometRetreatWeave'
import { parseCometAdsTravel, cometAdsTravelSummary } from '../helpers/cometAdsTravel'
import { parseCometCoverTravel, cometCoverTravelSummary } from '../helpers/cometCoverTravel'
import { parseCometHoldAngle, cometHoldAngleSummary } from '../helpers/cometHoldAngle'
import { parseCometAngleWatch, cometAngleWatchSummary } from '../helpers/cometAngleWatch'
import { parseCometCornerPrefire, cometCornerPrefireSummary } from '../helpers/cometCornerPrefire'
import { parseCometCornerChase, cometCornerChaseSummary } from '../helpers/cometCornerChase'
import { parseCometCombatLean, cometCombatLeanSummary } from '../helpers/cometCombatLean'
import { parseCometCornerPeek, cometCornerPeekSummary } from '../helpers/cometCornerPeek'
import { parseCometFirePause, cometFirePauseSummary } from '../helpers/cometFirePause'
import { parseCometCombatStep, cometCombatStepSummary } from '../helpers/cometCombatStep'
import { parseCometDoorEntry, cometDoorEntrySummary } from '../helpers/cometDoorEntry'
import { parseCometDoorReservation, cometDoorReservationSummary } from '../helpers/cometDoorReservation'
import { parseCometDoorEmergency, cometDoorEmergencySummary } from '../helpers/cometDoorEmergency'
import { parseCometDoorInterruption, cometDoorInterruptionSummary } from '../helpers/cometDoorInterruption'
import { parseCometDoorSupport, cometDoorSupportSummary } from '../helpers/cometDoorSupport'
import { parseCometDoorHold, cometDoorHoldSummary } from '../helpers/cometDoorHold'
import { parseCometDoorAmbush, cometDoorAmbushSummary } from '../helpers/cometDoorAmbush'
import { parseCometDoorClear, cometDoorClearSummary, cometDoorClearTitle } from '../helpers/cometDoorClear'
import { parseCometDoorMedical, cometDoorMedicalSummary } from '../helpers/cometDoorMedical'
import { parseCometDoorFake, cometDoorFakeSummary } from '../helpers/cometDoorFake'
import { parseCometDoorStep, cometDoorStepSummary } from '../helpers/cometDoorStep'
import { parseCometDoorRun, cometDoorRunSummary } from '../helpers/cometDoorRun'
import { parseCometDoorJump, cometDoorJumpSummary } from '../helpers/cometDoorJump'
import { parseCometDoor, cometDoorSummary } from '../helpers/cometDoor'
import { parseCometEnvironment, cometEnvironmentSummary } from '../helpers/cometEnvironment'
import { parseCometSearchAbandonment, cometSearchAbandonmentSummary } from '../helpers/cometSearchAbandonment'
import { parseCometSilentSearch, cometSilentSearchSummary } from '../helpers/cometSilentSearch'
import { parseCometImpact, cometImpactSummary } from '../helpers/cometImpact'
import { parseCometCloseDetection, cometCloseDetectionSummary } from '../helpers/cometCloseDetection'

import { parseCometFloorHearing, cometFloorHearingSummary } from '../helpers/cometFloorHearing'

import { parseCometGunfire, cometGunfireSummary } from '../helpers/cometGunfire'

import { parseCometQuiet, cometQuietSummary } from '../helpers/cometQuiet'

import { useEffect, useState } from 'react'

import api from '../api/api'

import { msToHMS } from '../helpers'

import { displayPlayerName } from '../helpers/playerNames'

import { formatDecisionLabel } from '../helpers/botBehavior'

import { parseCometHearing, cometHearingSummary, parseCometHandoff, cometHandoffSummary, parseCometProgress, cometProgressSummary, cometProgressEffect, parseCometCoverResponse, cometCoverResponseSummary, cometCoverResponseEffect, parseCometOpportunity, cometOpportunitySummary, cometOpportunityEffect, parseCometOpponent, cometOpponentSummary, cometOpponentEffect, cometReason, parseCometMixing, cometProbability, cometMistakeSummary, parseCometFear, cometFearSummary, parseCometThreat, cometThreatSummary, cometThreatCandidate, cometThreatComponents, parseCometLoadout, cometLoadoutSummary, cometLoadoutEffect } from '../helpers/cometMap'



type Event = { id: number; time: number; name: string; profileId: string; feature: string; decision: string; stage: string; reason: string; detail: string }

const words = (text: string) => String(text || '').replace(/[-:]/g, ' ')

function Details({ event, names }: { event: Event; names: Record<string, string> }) {

    let data: any

    try { data = JSON.parse(event.detail) } catch { return <span>Details unavailable</span> }

    const candidates = Array.isArray(data?.candidates) ? data.candidates.filter((c: any) => c && typeof c === 'object' && typeof c.decision === 'string') : []

    const mix = parseCometMixing(data?.mixing)

    const fear = parseCometFear(data?.fear)

    const threat = parseCometThreat(data?.threat)

    const loadout = parseCometLoadout(data?.loadout)

    const quiet = parseCometQuiet(data?.quiet)

    const gunfire = parseCometGunfire(data?.gunfire)

    const floorHearing = parseCometFloorHearing(data?.floorHearing)

    const closeDetection = parseCometCloseDetection(data?.closeDetection)
    const journal = parseCometJournal(data,event.feature)
    const weaponReturn = parseCometWeaponReturn(data?.weaponReturn)
    const readyStance = parseCometReadyStance(data?.readyStance)
    const crossfire = parseCometCrossfire(data?.crossfire)
    const postCombat = parseCometPostCombat(data?.postCombat)
    const medicalPosture = parseCometMedicalPosture(data?.medicalPosture)
    const surgeryInterruption = parseCometSurgeryInterruption(data?.surgeryInterruption)
    const medicalChoice = parseCometMedicalChoice(data?.medicalChoice)
    const explosionAwareness = parseCometExplosionAwareness(data?.explosionAwareness)
    const flashContinuity = parseCometFlashContinuity(data?.flashContinuity)
    const gasExposure = parseCometGasExposure(data?.gasExposure)
    const grenadeFilter = parseCometGrenadeFilter(data?.grenadeFilter)
    const grenadeDispersion = parseCometGrenadeDispersion(data?.grenadeDispersion)
    const grenadeReaction = parseCometGrenadeReaction(data?.grenadeReaction)
    const ownGrenadeSafety = parseCometOwnGrenadeSafety(data?.ownGrenadeSafety)
    const grenadeChoice = parseCometGrenadeChoice(data?.grenadeChoice)
    const grenadeTrajectory = parseCometGrenadeTrajectory(data?.grenadeTrajectory)
    const grenadeJudgment = parseCometGrenadeJudgment(data?.grenadeJudgment)
    const handsRecovery = parseCometHandsRecovery(data?.handsRecovery)
    const recoilRecovery = parseCometRecoilRecovery(data?.recoilRecovery)
    const shotGeometry = parseCometShotGeometry(data?.shotGeometry)
    const suppressionDiscipline = parseCometSuppressionDiscipline(data?.suppressionDiscipline)
    const weaponSync = parseCometWeaponSync(data?.weaponSync)
    const weaponRange = parseCometWeaponRange(data?.weaponRange)
    const quickReload = parseCometQuickReload(data?.quickReload)
    const pistolSwap = parseCometPistolSwap(data?.pistolSwap)
    const reloadTiming = parseCometReloadTiming(data?.reloadTiming)
    const coverFeint = parseCometCoverFeint(data?.coverFeint)
    const outdoorRelocation = parseCometOutdoorRelocation(data?.outdoorRelocation)
    const tacticalJump = parseCometTacticalJump(data?.tacticalJump)
    const restLights = parseCometRestLights(data?.restLights)
    const tacticalDevices = parseCometTacticalDevices(data?.tacticalDevices)
    const lightDiscipline = parseCometLightDiscipline(data?.lightDiscipline)
    const squadVoice = parseCometSquadVoice(data?.squadVoice)
    const squadFire = parseCometSquadFire(data?.squadFire)
    const fireLane = parseCometFireLane(data?.fireLane)
    const retreatWeave = parseCometRetreatWeave(data?.retreatWeave)
    const adsTravel = parseCometAdsTravel(data?.adsTravel)
    const coverTravel = parseCometCoverTravel(data?.coverTravel)
    const holdAngle = parseCometHoldAngle(data?.holdAngle)
    const angleWatch = parseCometAngleWatch(data?.angleWatch)
    const cornerPrefire = parseCometCornerPrefire(data?.cornerPrefire)
    const cornerChase = parseCometCornerChase(data?.cornerChase)
    const combatLean = parseCometCombatLean(data?.combatLean)
    const cornerPeek = parseCometCornerPeek(data?.cornerPeek)
    const firePause = parseCometFirePause(data?.firePause)
    const combatStep = parseCometCombatStep(data?.combatStep)
    const doorEntry = parseCometDoorEntry(data?.doorEntry)
    const doorReservation = parseCometDoorReservation(data?.doorReservation)
    const doorEmergency = parseCometDoorEmergency(data?.doorEmergency)
    const doorInterruption = parseCometDoorInterruption(data?.doorInterruption)
    const doorSupport = parseCometDoorSupport(data?.doorSupport)
    const doorHold = parseCometDoorHold(data?.doorHold)
    const doorAmbush = parseCometDoorAmbush(data?.doorAmbush)
    const doorRoomClear = parseCometDoorClear(data?.doorRoomClear)
    const doorFakeMedical = parseCometDoorMedical(data?.doorFakeMedical)
    const doorFakeGrenade = parseCometDoorFake(data?.doorFakeGrenade)
    const doorStepPeek = parseCometDoorStep(data?.doorStepPeek)
    const doorRunBy = parseCometDoorRun(data?.doorRunBy)
    const doorJumpPeek = parseCometDoorJump(data?.doorJumpPeek)
    const doorApproach = parseCometDoor(data?.doorApproach)
    const environmentContext = parseCometEnvironment(data?.environmentContext)
    const searchAbandonment = parseCometSearchAbandonment(data?.searchAbandonment)
    const sainPreset = parseCometSainPreset(data?.sainPreset)
    const difficultyPreset = parseCometDifficultyPreset(data?.cometPreset)
    const raidCleanup = parseCometRaidCleanup(data?.raidCleanup)
    const validity = parseCometValidity(data?.validity)
    const lifecycle = parseCometLifecycle(data?.lifecycle)
    const faultIsolation = parseCometFaultIsolation(data?.faultIsolation)
    const coverScan = parseCometCoverScan(data?.coverScan)
    const movementRecovery = parseCometMovementRecovery(data?.movementRecovery)
    const doorClosing = parseCometDoorClosing(data?.doorClosing)
    const doorMotion = parseCometDoorMotion(data?.doorMotion)
    const doorSpatial = parseCometDoorSpatial(data?.doorSpatial)
    const doorRecovery = parseCometDoorRecovery(data?.doorRecovery)
    const doorTransit = parseCometDoorTransit(data?.doorTransit)
    const outcome = parseCometOutcome(data?.outcome)
    const encounter = parseCometEncounter(data?.encounter)
    const silentSearch = parseCometSilentSearch(data?.silentSearch)
    const impact = parseCometImpact(data?.impact)

    const hearing = parseCometHearing(data?.hearing)

    const controlHandoff = parseCometControlHandoff(data?.controlHandoff)
    const handoff = parseCometHandoff(data?.handoff)

    const progress = parseCometProgress(data?.progress)

    const coverResponse = parseCometCoverResponse(data?.coverResponse)

    const opportunity = parseCometOpportunity(data?.opportunity)

    const opponent = parseCometOpponent(data?.opponent)

    return <details><summary style={{ cursor: 'pointer' }}>{event.feature === 'P01' ? 'What was heard?' : 'Why this choice?'}</summary>

        <p>Config revision {String(data?.configRevision ?? '?')} · {String(data?.personality ?? '')}</p>

        {data?.contact && <p>Contact: {String(data.contact.source ?? 'Unknown source')} · {Number(data.contact.age).toFixed(1)} s old · {Number.isFinite(data.contact.distance) ? Number(data.contact.distance).toFixed(1) + ' m' : 'distance not recorded'}</p>}

        {data?.visible && <p>Estimated route risk (0 to 1): cover {String(data.visible.coverRouteRisk ?? '?')}, push {String(data.visible.pushRouteRisk ?? '?')}. Known threats: {String(data.visible.knownThreats ?? '?')}. Cover: {String(data.visible.coverId || 'none')}{data.visible.threatsTruncated ? ' (additional contacts exceed the probe budget)' : ''}.</p>}

        {data?.continuity && <p>Brief sight loss: {String(data.continuity.lostFor ?? '?')} s since last seen; {String(data.continuity.remaining ?? '?')} s remaining at this event. {data.continuity.frozenRoute ? 'Existing route only.' : 'Fixed last seen angle.'} No blind fire authorized.</p>}

        {journal && <div><b>Combat / weapon journal</b>{journal.lines.map((line,i)=><p key={i}>{line}</p>)}</div>}
        {weaponReturn && <div><b>Weapon return - W03</b>{cometWeaponReturnSummary(weaponReturn).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {readyStance && <div><b>Weapon ready after combat - H05</b>{cometReadyStanceSummary(readyStance).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {crossfire && <div><b>{cometCrossfireTitle(crossfire)}</b>{cometCrossfireSummary(crossfire).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {postCombat && <div><b>Post-combat recovery - H04</b>{cometPostCombatSummary(postCombat).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {medicalPosture && <div><b>Medical posture - H03</b>{cometMedicalPostureSummary(medicalPosture).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {surgeryInterruption && <div><b>Surgery interruption - H02</b>{cometSurgeryInterruptionSummary(surgeryInterruption).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {medicalChoice && <div><b>Medical choice - H01</b>{cometMedicalChoiceSummary(medicalChoice).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {explosionAwareness && <div><b>Explosion awareness - G10</b>{cometExplosionAwarenessSummary(explosionAwareness).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {flashContinuity && <div><b>Flash continuity - G09</b>{cometFlashContinuitySummary(flashContinuity).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {gasExposure && <div><b>CS gas exposure - G08</b>{cometGasExposureSummary(gasExposure).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {grenadeFilter && <div><b>Offensive grenade filter - G07</b>{cometGrenadeFilterSummary(grenadeFilter).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {grenadeDispersion && <div><b>Squad grenade dispersion - G06</b>{cometGrenadeDispersionSummary(grenadeDispersion).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {grenadeReaction && <div><b>Grenade reactions - G05</b>{cometGrenadeReactionSummary(grenadeReaction).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {ownGrenadeSafety && <div><b>Own grenade safety - G04</b>{cometOwnGrenadeSafetySummary(ownGrenadeSafety).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {grenadeChoice && <div><b>Grenade choice - G03</b>{cometGrenadeChoiceSummary(grenadeChoice).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {grenadeTrajectory && <div><b>Grenade trajectory - G02</b>{cometGrenadeTrajectorySummary(grenadeTrajectory).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {grenadeJudgment && <div><b>Grenade judgment - G01</b>{cometGrenadeJudgmentSummary(grenadeJudgment).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {handsRecovery && <div><b>Hands recovery - W10</b>{cometHandsRecoverySummary(handsRecovery).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {recoilRecovery && <div><b>Recoil recovery - W09</b>{cometRecoilRecoverySummary(recoilRecovery).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {shotGeometry && <div><b>Shot geometry - W08</b>{cometShotGeometrySummary(shotGeometry).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {suppressionDiscipline && <div><b>Suppression discipline - W07</b>{cometSuppressionDisciplineSummary(suppressionDiscipline).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {weaponSync && <div><b>Equipment sync - W06</b>{cometWeaponSyncSummary(weaponSync).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {weaponRange && <div><b>Weapon by distance - W05</b>{cometWeaponRangeSummary(weaponRange).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {quickReload && <div><b>Fast reload - W04</b>{cometQuickReloadSummary(quickReload).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {pistolSwap && <div><b>Pistol swap - W02</b>{cometPistolSwapSummary(pistolSwap).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {reloadTiming && <div><b>Reload timing - W01</b>{cometReloadTimingSummary(reloadTiming).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {coverFeint && <div><b>Cover feint - M14</b>{cometCoverFeintSummary(coverFeint).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {outdoorRelocation && <div><b>Change cover outdoors - M13</b>{cometOutdoorRelocationSummary(outdoorRelocation).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {tacticalJump && <div><b>Tactical jumps - M12</b>{cometTacticalJumpSummary(tacticalJump).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {restLights && <div><b>Lights while resting - L03</b>{cometRestLightsSummary(restLights).map((line,i) => <p key={i}>{line}</p>)}
            <details><summary>Technical identifiers</summary>{cometRestLightsIdentifiers(restLights).map((line,i)=><p key={i}>{line}</p>)}</details></div>}
        {tacticalDevices && <div><b>Weapon accessories - L02</b>{cometTacticalDevicesSummary(tacticalDevices).map((line,i) => <p key={i}>{line}</p>)}
            <details><summary>Technical identifiers</summary>{cometTacticalDeviceIdentifiers(tacticalDevices).map((line,i)=><p key={i}>{line}</p>)}</details></div>}
        {lightDiscipline && <div><b>Ambush lights - L01</b>{cometLightDisciplineSummary(lightDiscipline).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {squadVoice && <div><b>Squad voice - S09</b>{cometSquadVoiceSummary(squadVoice).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {squadFire && <div><b>Protect squad while firing - S08</b>{cometSquadFireSummary(squadFire).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {fireLane && <div><b>Allied firing lanes - S07</b>{cometFireLaneSummary(fireLane).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {retreatWeave && <div><b>Evasive retreat - M11</b>{cometRetreatWeaveSummary(retreatWeave).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {adsTravel && <div><b>Release ADS for travel - M10</b>{cometAdsTravelSummary(adsTravel).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {coverTravel && <div><b>Face threat en route - M09</b>{cometCoverTravelSummary(coverTravel).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {holdAngle && <div><b>Open watched angle - M08</b>{cometHoldAngleSummary(holdAngle).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {angleWatch && <div><b>Watch useful angle - M07</b>{cometAngleWatchSummary(angleWatch).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {cornerPrefire && <div><b>Corner prefire - M06</b>{cometCornerPrefireSummary(cornerPrefire).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {cornerChase && <div><b>Corner chase - M05</b>{cometCornerChaseSummary(cornerChase).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {combatLean && <div><b>Head movement - M04</b>{cometCombatLeanSummary(combatLean).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {cornerPeek && <div><b>Corner peeks - M03</b>{cometCornerPeekSummary(cornerPeek).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {firePause && <div><b>Pause to fire - M02</b>{cometFirePauseSummary(firePause).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {combatStep && <div><b>Move while shooting - M01</b>{cometCombatStepSummary(combatStep).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {doorEntry && <div><b>Native door entry - D15</b>{cometDoorEntrySummary(doorEntry).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {doorReservation && <div><b>Door reservation - D14</b>{cometDoorReservationSummary(doorReservation).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {doorEmergency && <div><b>Door emergency - D13</b>{cometDoorEmergencySummary(doorEmergency).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {doorInterruption && <div><b>Door interruption - D12</b>{cometDoorInterruptionSummary(doorInterruption).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {doorSupport && <div><b>Door support - D11</b>{cometDoorSupportSummary(doorSupport).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {doorHold && <div><b>Hold positioning - D10</b>{cometDoorHoldSummary(doorHold).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {doorAmbush && <div><b>Doorway ambush - D09</b>{cometDoorAmbushSummary(doorAmbush,names).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {doorRoomClear && <div><b>{cometDoorClearTitle(doorRoomClear)}</b>{cometDoorClearSummary(doorRoomClear,names).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {doorFakeMedical && <div><b>Medical feint - D06</b>{cometDoorMedicalSummary(doorFakeMedical,names).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {doorFakeGrenade && <div><b>Fake grenade - D05</b>{cometDoorFakeSummary(doorFakeGrenade,names).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {doorStepPeek && <div><b>Small doorway peeks - D04</b>{cometDoorStepSummary(doorStepPeek,names).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {doorRunBy && <div><b>Doorway run-by - D03</b>{cometDoorRunSummary(doorRunBy,names).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {doorJumpPeek && <div><b>Doorway jump peek - D02</b>{cometDoorJumpSummary(doorJumpPeek,names).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {doorApproach && <div><b>Doorway approach - D01</b>{cometDoorSummary(doorApproach,names).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {environmentContext && <div><b>Surroundings - P10</b>{cometEnvironmentSummary(environmentContext).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {searchAbandonment && <div><b>Finish an empty search - P09</b>{cometSearchAbandonmentSummary(searchAbandonment,names).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {sainPreset && <div><b>Selected SAIN preset - C14</b>{cometSainPresetSummary(sainPreset).map((line,i)=><p key={i}>{line}</p>)}</div>}
        {difficultyPreset && <div><b>COMET preset - U01 / U07</b>{cometDifficultyPresetSummary(difficultyPreset).map((line,i)=><p key={i}>{line}</p>)}</div>}
        {raidCleanup && <div><b>End-of-raid cleanup - C13</b>{cometRaidCleanupSummary(raidCleanup).map((line,i)=><p key={i}>{line}</p>)}</div>}
        {validity && <div><b>Invalid reference safety - C10</b>{cometValiditySummary(validity).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {lifecycle && <div><b>Death and revive safety - C09</b>{cometLifecycleSummary(lifecycle).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {faultIsolation && <div><b>Error isolation - C08</b>{cometFaultIsolationSummary(faultIsolation).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {coverScan && <div><b>Stable cover search - C07</b>{cometCoverScanSummary(coverScan).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {movementRecovery && <div><b>Stuck movement recovery - C06</b>{cometMovementRecoverySummary(movementRecovery).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {doorClosing && <div><b>Automatic door closing - C05</b>{cometDoorClosingSummary(doorClosing).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {doorMotion && <div><b>Door motion - C04</b>{cometDoorMotionSummary(doorMotion).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {doorSpatial && <div><b>Door geometry - C03</b>{cometDoorSpatialSummary(doorSpatial).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {doorRecovery && <div><b>Door recovery - C02</b>{cometDoorRecoverySummary(doorRecovery).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {doorTransit && <div><b>Door traversal - C01</b>{cometDoorTransitSummary(doorTransit).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {outcome && <div><b>Tactical feedback - E04</b>{cometOutcomeSummary(outcome,names).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {encounter && <div><b>Repeated peeks - E03</b>{cometEncounterSummary(encounter,names).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {silentSearch && <div><b>Search after silence - P08</b>{cometSilentSearchSummary(silentSearch,names).map((line,i) => <p key={i}>{line}</p>)}</div>}
        {impact && <div><b>React to impact · P07</b>{cometImpactSummary(impact, names).map((line, i) => <p key={i}>{line}</p>)}</div>}
        {closeDetection && <div><b>Close detection · P05</b>{cometCloseDetectionSummary(closeDetection, names).map((line, i) => <p key={i}>{line}</p>)}</div>}

        {floorHearing && <div><b>Hearing between floors · P04</b>{cometFloorHearingSummary(floorHearing, names).map((line, i) => <p key={i}>{line}</p>)}</div>}

        {gunfire && <div><b>Gunfire reaction · P03</b>{cometGunfireSummary(gunfire, names).map((line, i) => <p key={i}>{line}</p>)}</div>}

        {quiet && <div><b>Quiet approach · P02</b>{cometQuietSummary(quiet, names).map((line, i) => <p key={i}>{line}</p>)}</div>}

        {hearing && <div><b>Movement hearing · P01</b>{cometHearingSummary(hearing, names).map((line, i) => <p key={i}>{line}</p>)}</div>}

        {controlHandoff && <div><b>Control handoff · I02</b>{cometControlHandoffSummary(controlHandoff).map((line,i)=><p key={i}>{line}</p>)}</div>}
        {handoff && <div><b>SAIN handoff · A13</b>{cometHandoffSummary(handoff).map((line, i) => <p key={i}>{line}</p>)}</div>}

        {progress && <div><b>Plan progress · A12</b>{cometProgressSummary(progress).map((line, i) => <p key={i}>{line}</p>)}

            <ul>{candidates.map(cometProgressEffect).filter(Boolean).map((line: string, i: number) => <li key={i}>{line}</li>)}</ul></div>}

        {coverResponse && <div><b>Fight or take cover · A11</b>{cometCoverResponseSummary(coverResponse).map((line, i) => <p key={i}>{line}</p>)}

            <ul>{candidates.map(cometCoverResponseEffect).filter(Boolean).map((line: string, i: number) => <li key={i}>{line}</li>)}</ul></div>}

        {opportunity && <div><b>Heard opportunities · A10</b>{cometOpportunitySummary(opportunity).map((line, i) => <p key={i}>{line}</p>)}

            <ul>{candidates.map(cometOpportunityEffect).filter(Boolean).map((line: string, i: number) => <li key={i}>{line}</li>)}</ul></div>}

        {opponent && <div><b>Opponent assessment · A09</b>{cometOpponentSummary(opponent).map((line, i) => <p key={i}>{line}</p>)}

            <ul>{candidates.map(cometOpponentEffect).filter(Boolean).map((line: string, i: number) => <li key={i}>{line}</li>)}</ul></div>}

        {loadout && <div><b>Equipment awareness · A08</b>{cometLoadoutSummary(loadout).map((line, i) => <p key={i}>{line}</p>)}

            <ul>{candidates.map(cometLoadoutEffect).filter(Boolean).map((line: string, i: number) => <li key={i}>{line}</li>)}</ul></div>}

        {fear && <div><b>Fear &amp; panic · A06</b>{cometFearSummary(fear).map((line, i) => <p key={i}>{line}</p>)}<p>Snapshot at this decision, not a live estimate.</p></div>}

        {threat && <div><b>Target priority · A07</b>{cometThreatSummary(threat, names).map((line, i) => <p key={i}>{line}</p>)}

            <ul>{threat.candidates.map((c, i) => <li key={i}>{cometThreatCandidate(c, names)}{c.target === threat.selected ? ' (selected)' : ''}<div>{cometThreatComponents(c)}</div></li>)}</ul>

            <p>Target selection is separate from the current action. Scores and contact ages are snapshots at this decision.</p></div>}

        {mix?.mistake && <div><b>Occasional mistakes · A05</b>

            {cometMistakeSummary(mix.mistake).map((line, i) => <p key={i}>{line}</p>)}

            <ul>{mix.mistake.options.map((o, i) => <li key={i}>{formatDecisionLabel('COMET:' + o.decision)}{o.decision === mix.mistake!.selected ? ' (selected after A05)' : ''}: score {o.score ?? '?'} · {cometProbability(o.probability)} · {cometReason(o.reason)}</li>)}</ul>

            <p>A05 probabilities are conditional on the preceding A04 choice. Choice #{mix.mistake.opportunity ?? '?'} · Draw {mix.mistake.drawIndex ?? '?'} · Seed {mix.mistake.seed || '?'} · Personality {mix.mistake.personality || '?'}</p>

        </div>}

        {mix && <div><b>Decision variety · A04</b>

            <p>{cometReason(mix.state)}. Trigger: {cometReason(mix.trigger)}.</p>

            <ul>{mix.options.map((o, i) => <li key={i}>{formatDecisionLabel('COMET:' + o.decision)}{o.decision === mix.selected ? ' (chosen)' : ''}: {cometProbability(o.probability)} · score {o.score ?? '?'}{o.reason !== 'in-pool' ? ` · ${cometReason(o.reason)}` : ''}</li>)}</ul>

            <p>Probabilities at selection. {mix.roll != null ? `Roll ${mix.roll.toFixed(6)}` : 'No random draw'} · Choice #{mix.opportunity ?? '?'} · Encounter {mix.encounter ?? '?'} · Draw {mix.drawIndex ?? '?'} · Seed {mix.seed || '?'}</p>

        </div>}

        <ul>{candidates.map((c: any, index: number) => <li key={index}>

            {formatDecisionLabel('COMET:' + String(c.decision))}: {c.eligible ? `score ${Number(c.score)}` : `unavailable (${words(c.reason)})`}

            {Number.isFinite(c.scoreBeforeFear) && Number.isFinite(c.fearDelta) ? ` · Before fear ${c.scoreBeforeFear}, after ${c.score} (${c.fearDelta >= 0 ? '+' : ''}${Number(c.fearDelta).toFixed(2)})` : ''}

        </li>)}</ul>

        <p style={{ opacity: .65, fontSize: 11 }}>Instance: {String(data?.botInstance ?? '?')} · Event {String(data?.sequence ?? '?')}</p>

    </details>

}



export default function CometDecisionDiagnostics({ raidId, names = {} }: { raidId: string; names?: Record<string, string> }) {

    const [events, setEvents] = useState<Event[]>([])

    const [total, setTotal] = useState(0)

    const [filter, setFilter] = useState('')

    const [page, setPage] = useState(0)

    const [status, setStatus] = useState('')

    const [expanded, setExpanded] = useState(false)
    const [mode, setMode] = useCometDisplayMode()

    useEffect(() => { setPage(0); setFilter(''); setEvents([]); setTotal(0) }, [raidId])

    useEffect(() => {

        if (!expanded || mode !== 'debug') return

        const controller = new AbortController()

        setStatus('Loading COMET decisions...')

        const timer = setTimeout(() => {

            api.getCometDecisions(raidId, page, filter, controller.signal).then(data => {

                if (controller.signal.aborted) return

                if (data === null) { setEvents([]); setTotal(0); setStatus('This RR server does not support COMET decision events.'); return }

                if (!Array.isArray(data.events)) throw new Error('Invalid COMET event response')

                setEvents(data.events); setTotal(Number(data.total));

                setStatus(Number(data.total) === 0 ? 'No recorded COMET decisions match. Older raids do not include these events.' : '')

            }).catch(() => { if (!controller.signal.aborted) { setEvents([]); setStatus('Could not load COMET decisions. Close and reopen to retry.') } })

        }, 200)

        return () => { clearTimeout(timer); controller.abort() }

    }, [raidId, page, filter, expanded, mode])

    return <details className="mb-4 text-eft" onToggle={e => { if (e.target === e.currentTarget) setExpanded(e.currentTarget.open) }} style={{ border: '1px solid #514a3b', borderRadius: 5, padding: 12 }}>

        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>COMET decisions {mode === 'debug' && total > 0 ? `(${total})` : ''}</summary>

        <CometModePicker mode={mode} onChange={setMode} />
        {expanded && mode === 'simple' ? <CometReadableHistory raidId={raidId} names={names} /> : expanded && mode === 'debug' && <>
        <p style={{ fontSize: 12, opacity: .8, margin: '10px 0' }}>Full event history. Selection and acceptance do not prove execution. Observation and outcome fields distinguish what actually happened.</p>

        <CometJournalSummary raidId={raidId} />
        <CometCountersSummary raidId={raidId} />

        <label>Filter bot, feature, choice or reason <input aria-label="Filter COMET decisions" value={filter} onChange={e => { setFilter(e.target.value); setPage(0) }} style={{ color: '#ddd', background: '#171717', margin: 8, padding: 6 }} /></label>

        {status && <p role="status">{status}</p>}

        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', fontSize: 12, textAlign: 'left' }}>

            <thead><tr>{['Time', 'Bot', 'Feature', 'Choice', 'Stage', 'Reason', 'Alternatives'].map(c => <th style={{ padding: 6 }} key={c}>{c}</th>)}</tr></thead>

            <tbody>{events.map(event => <tr key={event.id} style={{ borderTop: '1px solid #302e29' }}>

                <td style={{ padding: 6, whiteSpace: 'nowrap' }}>{msToHMS(Number(event.time))}.{String(Math.max(0, Math.trunc(Number(event.time))) % 1000).padStart(3, '0')}</td>

                <td title={event.profileId}>{displayPlayerName(event.name, event.profileId)}</td>

                <td>{event.feature}{["A01","A02"].includes(event.feature) && parseCometOutcome((() => { try { return JSON.parse(event.detail)?.outcome } catch { return null } })()) ? " + E04" : ""}{event.feature === 'A01' && parseCometEncounter((() => { try { return JSON.parse(event.detail)?.encounter } catch { return null } })()) ? ' + E03' : ''}{event.feature !== "P08" && parseCometSilentSearch((() => { try { return JSON.parse(event.detail)?.silentSearch } catch { return null } })()) ? " + P08" : ""}{parseCometProgress((() => { try { return JSON.parse(event.detail)?.progress } catch { return null } })()) ? " + A12" : ""}{parseCometLoadout((() => { try { return JSON.parse(event.detail)?.loadout } catch { return null } })()) ? " + A08" : ""}{parseCometOpponent((() => { try { return JSON.parse(event.detail)?.opponent } catch { return null } })()) ? " + A09" : ""}{parseCometOpportunity((() => { try { return JSON.parse(event.detail)?.opportunity } catch { return null } })()) ? " + A10" : ""}{parseCometCoverResponse((() => { try { return JSON.parse(event.detail)?.coverResponse } catch { return null } })()) ? " + A11" : ""}</td><td>{event.feature === 'C13' ? 'Raid cleanup' : event.feature === 'C02' ? 'Door recovery' : event.feature === 'C01' ? 'Door traversal' : event.feature === 'E03' ? 'Repeated peeks' : event.feature === 'H03' ? 'Medical posture' : event.feature === 'H02' ? 'Surgery safety' : event.feature === 'H01' ? 'Medical choice' : event.feature === 'G10' ? 'Explosion awareness' : event.feature === 'D06' ? 'Medical feint' : event.feature === 'D05' ? 'Fake grenade' : event.feature === 'D04' ? 'Small doorway peeks' : event.feature === 'D03' ? 'Doorway run-by' : event.feature === 'D02' ? 'Doorway jump peek' : event.feature === 'D01' ? 'Doorway approach' : event.feature === 'P10' ? 'Surroundings' : event.feature === 'P09' ? 'Finish an empty search' : event.feature === 'P08' ? 'Search after silence' : event.feature === 'P07' ? 'React to impact' : event.feature === 'P05' ? 'Close detection' : event.feature === 'P04' ? 'Floor hearing' : event.feature === 'P03' ? 'Gunfire reaction' : event.feature === 'P02' ? 'Quiet approach' : event.feature === 'P01' ? 'Movement hearing' : event.feature === 'I02' ? 'Control handoff' : event.feature === 'A13' ? 'SAIN handoff' : event.feature === 'A07' ? 'Target priority' : formatDecisionLabel('COMET:' + event.decision)}</td>

                <td>{event.stage}</td><td>{event.reason === 'sain-decision-accepted' ? 'Accepted by SAIN' : cometReason(event.reason)}</td><td><Details event={event} names={names} /></td>

            </tr>)}</tbody>

        </table></div>

        {total > 0 && <div className="flex gap-3 mt-3"><button disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>

            <span>{page + 1} / {Math.max(1, Math.ceil(total / 50))}</span><button disabled={(page + 1) * 50 >= total} onClick={() => setPage(page + 1)}>Next</button></div>}

        </>}
    </details>

}
