export const RUSH_STYLES: Record<string, { color: string; glyph: string; label: string }> = {
    Spawn: { color: '#60A5FA', glyph: 'S', label: 'Spawn rush' },
    Boss: { color: '#EC4899', glyph: 'B', label: 'Boss rush' },
    Marked: { color: '#A3E635', glyph: 'R', label: 'Marked room rush' },
    Sniper: { color: '#22D3EE', glyph: 'N', label: 'Sniper overwatch' },
    Custom: { color: '#C4B5FD', glyph: 'C', label: 'Custom rush' },
}
const UNKNOWN_RUSH_STYLE = { color: '#60A5FA', glyph: 'R', label: 'Rush' }
export function rushStyle(main: any) {
    // Prefer the recorded kind; retain name-only compatibility for earlier recordings.
    const kind = main.operationId || main.operationName?.replace(/ rush$/i, '')
    return RUSH_STYLES[kind] || UNKNOWN_RUSH_STYLE
}

export function visibleRushPoints(main: any): any[] {
    if (!Array.isArray(main.rushPoints)) return []
    const kind = main.operationId || main.operationName?.replace(/ rush$/i, '')
    if (main.type !== 'Rush' || kind !== 'Spawn' || !main.completed) return main.rushPoints
    // Retain recorded selections and failed attempts, hide unused catalogue candidates after the rush.
    return main.rushPoints.filter((point: any) => point.sequence > 0 || point.state && point.state !== 'pending')
}

export function mainLabel(main: any): string {
    if (main.type === 'Rush') return main.operationName || 'Rush'
    if (main.type === 'MultiStep') return main.operationName || 'Multi-step'
    return main.type === 'ExtractCamp' ? 'Extract camp' : main.type === 'Kills' && main.killAmbush ? 'Kills (ambush)' : main.type
}
export function mainStarted(main: any): boolean {
    if (!main.completed && ['approach', 'searching cover', 'holding', 'paused'].includes(main.campState)) return true
    return !main.completed && (main.type === 'Airdrop' || (main.type === 'MultiStep' || main.type === 'Rush') && !!main.operationState && main.operationState !== 'pending' || main.campStartedAt > 0 || main.type === 'Kills' && main.killsRoamStartedAt > 0 || main.type === 'LootValue' && main.lootValueEnteredAt > 0)
}
export function mainInterrupted(main: any): boolean {
    if (!main.completed && main.campState === 'paused') return true
    return mainStarted(main) && ((main.type === 'MultiStep' || main.type === 'Rush') && main.operationState === 'paused' || main.type === 'LootValue' && main.lootValueInterrupted === true || main.campStartedAt > 0 && main.campHolding === false)
}
export function mainHoldDetail(main: any, atTime?: number): string {
    if (main.campState === 'failed') return `Failed: ${main.campFailure || 'No usable camp position'}`
    const remaining = main.type === 'ExtractCamp' && main.campUntilTimeExtract && !main.completed
        && Number.isFinite(main.campExtractAt) && Number.isFinite(atTime)
        ? Math.max(0, Math.ceil((main.campExtractAt - atTime!) / 1000)) : null
    const countdown = remaining == null ? '' : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')} until departure`
    const status = main.campState === 'searching cover' ? main.campSearchAttempt > 0
        ? `Searching cover (${main.campSearchAttempt}/4, radius ${Math.round(main.campSearchRadius || 0)}m)` : 'Searching cover'
        : main.campState === 'approach' ? 'Approaching camp position'
        : main.campState === 'paused' ? `Interrupted: ${main.campFailure || 'Waiting to resume'}` : ''
    if (status) return countdown ? `${status}; ${countdown}` : status
    if (main.type === 'ExtractCamp' && main.campUntilTimeExtract) {
        if (countdown) {
            return main.campStartedAt > 0 ? `${Math.round(main.campElapsed || 0)}s holding cover; ${countdown}` : countdown
        }
        return main.campStartedAt > 0
            ? `${Math.round(main.campElapsed || 0)}s holding cover; until time-based extraction`
            : 'Last main; hold until time-based extraction'
    }
    const duration = main.campTargetDuration || main.killsRoamTargetDuration || 0
    return `${Math.round(main.campElapsed || 0)} / ${Math.round(duration)}s holding cover`
}

export function airdropDetail(main: any): string {
    if (main.airdropStage === 'loot') return 'Loot'
    if (main.airdropStage === 'waiting') {
        const hold = `${Math.round(main.campElapsed || 0)} / ${Math.round(main.campTargetDuration || 0)}s`
        return main.airdropLanded ? `Waiting (${hold})` : `Waiting for landing (${hold})`
    }
    return main.airdropLanded ? 'Approach' : 'Approach (crate descending)'
}

// Keep the historical fallback for ordinary goals, but never show a future or ended temporary detour.
export function findMainSquadEntry(data: any[], squadId: number, atTime: number): any {
    let best: any = null, bestTime = -Infinity, latestTime = -Infinity
    let future: any = null, futureTime = Infinity
    for (const snap of data) {
        const time = Number(snap.time)
        const entry = (snap.squads || []).find((s: any) => Number(s.squadId) === squadId)
        if (time <= atTime) {
            latestTime = Math.max(latestTime, time)
            if (entry && time >= bestTime) { best = entry; bestTime = time }
        } else if (entry && time < futureTime) { future = entry; futureTime = time }
    }
    const result = best || future
    if (!result) return result
    const mains = (result.mainObjectives || []).filter((m: any) => best && bestTime === latestTime || m.type !== 'Airdrop')
    return { ...result, mainObjectives: mains.map((m: any) => {
        // New recordings have an extraction deadline in the RR timeline. Advance only
        // active holding time; completed/paused goals and old recordings stay literal.
        if (!best || bestTime !== latestTime || m.completed || !m.campHolding || !Number.isFinite(m.campExtractAt)) return m
        const delta = Math.max(0, (Math.min(atTime, m.campExtractAt) - bestTime) / 1000)
        return { ...m, campElapsed: (m.campElapsed || 0) + delta }
    }) }
}

export function operationDetail(main: any): string {
    if (main.operationId === 'Sniper' && main.campStartedAt > 0) return `${main.operationStep || 'Sniper post'} (${main.operationState}): ${Math.round(main.campElapsed || 0)} / ${Math.round(main.campTargetDuration || 0)}s`
    return `${main.operationStepIndex || 1}/${main.operationStepCount || '?'}: ${main.operationStep || 'Pending'} (${main.operationState || 'pending'})`
}
export function mainAbandoned(main: any): boolean {
    if (main.campState === 'failed') return true
    return (main.type === 'MultiStep' || main.type === 'Rush') && main.completed === true && !!main.operationState && !['completed', 'boss seen', 'boss body found', 'boss not found'].includes(main.operationState)
}
export function escapeMainText(value: string): string {
    return value.replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]!))
}
