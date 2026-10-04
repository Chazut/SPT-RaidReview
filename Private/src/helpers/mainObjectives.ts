export function mainLabel(main: any): string {
    if (main.type === 'MultiStep') return main.operationName || 'Multi-step'
    return main.type === 'ExtractCamp' ? 'Extract camp' : main.type === 'Kills' && main.killAmbush ? 'Kills (ambush)' : main.type
}
export function mainStarted(main: any): boolean {
    return !main.completed && (main.type === 'MultiStep' && !!main.operationState && main.operationState !== 'pending' || main.campStartedAt > 0 || main.type === 'Kills' && main.killsRoamStartedAt > 0 || main.type === 'LootValue' && main.lootValueEnteredAt > 0)
}
export function mainInterrupted(main: any): boolean {
    return mainStarted(main) && (main.type === 'MultiStep' && main.operationState === 'paused' || main.type === 'LootValue' && main.lootValueInterrupted === true || main.campStartedAt > 0 && main.campHolding === false)
}
export function mainHoldDetail(main: any): string {
    const duration = main.campTargetDuration || main.killsRoamTargetDuration || 0
    return `${Math.round(main.campElapsed || 0)} / ${Math.round(duration)}s holding cover`
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
