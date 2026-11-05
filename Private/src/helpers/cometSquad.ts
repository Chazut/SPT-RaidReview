import { CometMapEvent, CometMapRecord, cometReason } from './cometMap'
import { squadTacticTitle, squadRole } from './cometCrossfire'
import { cometEventAt, cometEpisodes, CometEpisode } from './cometPresentation'
import { getDecisionSource } from './botBehavior'

export type SquadMember = { profileId: string; name: string; kind: string; group?: number | string | null }
export type MemberSample = { decision?: string; time?: number; ghost?: boolean; dormant?: boolean; present: boolean }
export function cometSquadMembers(roster: SquadMember[], selected?: string | null): SquadMember[] {
    const bot = roster.find(p => p.profileId === selected)
    if (!bot) return []
    // Missing group is not squad zero. Humans are never merged into AI squad zero.
    if (bot.kind !== 'pmc' || bot.group == null || bot.group === '' || Number(bot.group) < 0) return [bot]
    return roster.filter(p => p.kind === 'pmc' && p.group != null && String(p.group) === String(bot.group))
}
export type SquadRoleView = { member: SquadMember; event: CometMapEvent; title: string; role: string; status: string; confirmed: boolean; plan: string; target: string; reason: string }
export function currentSquadRoles(members: SquadMember[], records: Record<string, CometMapRecord>, samples: Record<string, MemberSample>, at: number): SquadRoleView[] {
    const result: SquadRoleView[] = []
    for (const member of members) {
        const sample = samples[member.profileId], record = records[member.profileId]
        if (!sample?.present || sample.ghost || sample.dormant || record?.status !== 'ready') continue
        const last = cometEventAt(record, at)
        if (!last || last.crossfireIndex < 0) continue
        const event = record.events[last.crossfireIndex], c = event?.crossfire
        if (!c || c.state === 'ended' || c.maneuver?.state === 'ended' || c.storm?.state === 'ended') continue
        if (!(c.applied || c.reserved || c.maneuver?.plan || c.storm?.plan)) continue
        const age = at - event.time
        // No extrapolation from old plans, and no inferred execution from a role assignment.
        if (age < 0 || age >= (c.applied ? c.validFor * 1000 : 1500)) continue
        const handoff = last.controlIndex >= 0 ? record.events[last.controlIndex] : undefined
        const life = last.lifecycleIndex >= 0 ? record.events[last.lifecycleIndex] : undefined
        if (life?.lifecycle?.state && life.lifecycle.state !== 'resumed') continue
        if (handoff && handoff.time >= event.time && (handoff.controlHandoff?.pending || ['orbit','questing','looting','sleep','extraction','other'].includes(handoff.controlHandoff?.owner || ''))) continue
        if ((sample.time ?? 0) > event.time && !sample.decision?.startsWith('COMET:Crossfire')) continue
        if (['ORBIT','Phobos','QuestingBots','LB'].includes(getDecisionSource(sample.decision || '')) && (sample.time ?? 0) >= event.time) continue
        result.push({ member, event, title: squadTacticTitle(c), role: squadRole(c), confirmed: c.applied,
            status: c.applied ? 'Executing' : 'Preparing · not confirmed', target: c.contact,
            plan: `${event.cometSession}:${c.maneuver?.plan || c.storm?.plan || `${member.profileId}:${event.instance}:${c.episode}`}`,
            reason: cometReason(c.reason) })
    }
    return result
}

export type SquadHistoryEntry = CometEpisode & { profileId: string; name: string }
// Index once when event streams arrive, not on every replay frame.
export function buildSquadHistory(members: SquadMember[], records: Record<string, CometMapRecord>): SquadHistoryEntry[] {
    return members.flatMap(m => cometEpisodes(records[m.profileId]).map(e => ({ ...e, profileId: m.profileId, name: m.name })))
        .sort((a,b) => a.start - b.start || a.event.sequence - b.event.sequence || a.profileId.localeCompare(b.profileId))
}
export function recentSquadHistory(history: SquadHistoryEntry[], at: number, limit = 12): SquadHistoryEntry[] {
    let lo = 0, hi = history.length
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (history[mid].start <= at) lo = mid + 1; else hi = mid }
    return history.slice(Math.max(0, lo - limit), lo).reverse()
}
