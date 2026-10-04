export function mainLabel(main: any): string {
    if (main.type === 'MultiStep') return main.operationName || 'Multi-step'
    return main.type === 'ExtractCamp' ? 'Extract camp' : main.type === 'Kills' && main.killAmbush ? 'Kills (ambush)' : main.type
}
export function mainStarted(main: any): boolean {
    return !main.completed && (main.type === 'Airdrop' || main.type === 'MultiStep' && !!main.operationState && main.operationState !== 'pending' || main.campStartedAt > 0 || main.type === 'Kills' && main.killsRoamStartedAt > 0 || main.type === 'LootValue' && main.lootValueEnteredAt > 0)
}
export function mainInterrupted(main: any): boolean {
    return mainStarted(main) && (main.type === 'MultiStep' && main.operationState === 'paused' || main.type === 'LootValue' && main.lootValueInterrupted === true || main.campStartedAt > 0 && main.campHolding === false)
}
export function mainHoldDetail(main: any): string {
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
    if (!result || best && bestTime === latestTime) return result
    return { ...result, mainObjectives: (result.mainObjectives || []).filter((m: any) => m.type !== 'Airdrop') }
}

export function operationDetail(main: any): string {
    return `${main.operationStepIndex || 1}/${main.operationStepCount || '?'}: ${main.operationStep || 'Pending'} (${main.operationState || 'pending'})`
}
export function mainAbandoned(main: any): boolean {
    return main.type === 'MultiStep' && main.completed === true && !!main.operationState && main.operationState !== 'completed'
}
export function escapeMainText(value: string): string {
    return value.replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]!))
}
