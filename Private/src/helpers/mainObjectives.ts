export function mainLabel(main: any): string {
    return main.type === 'ExtractCamp' ? 'Extract camp' : main.type === 'Kills' && main.killAmbush ? 'Kills (ambush)' : main.type
}
export function mainStarted(main: any): boolean {
    return !main.completed && (main.campStartedAt > 0 || main.type === 'Kills' && main.killsRoamStartedAt > 0 || main.type === 'LootValue' && main.lootValueEnteredAt > 0)
}
export function mainInterrupted(main: any): boolean {
    return mainStarted(main) && (main.type === 'LootValue' && main.lootValueInterrupted === true || main.campStartedAt > 0 && main.campHolding === false)
}
export function mainHoldDetail(main: any): string {
    const duration = main.campTargetDuration || main.killsRoamTargetDuration || 0
    return `${Math.round(main.campElapsed || 0)} / ${Math.round(duration)}s holding cover`
}
