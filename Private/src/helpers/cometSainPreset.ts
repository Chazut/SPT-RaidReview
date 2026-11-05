export type SainPresetContext = {
    source: 'selected-preset'; name: string; availability: string; singletonMatches: boolean;
    jump: boolean; lean: boolean; grenades: boolean; aiGrenades: boolean; suppression: boolean;
    observedChanges: number; coalescedChanges: number; reason: string;
}
export function parseCometSainPreset(raw: any): SainPresetContext | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.source !== 'selected-preset') return null
    if (typeof raw.name !== 'string' || raw.name.length > 160) return null
    if (!['ready','preset-missing','globals-missing','settings-incomplete'].includes(raw.availability)) return null
    if (!['initial','selected-preset-changed','preset-context-changed'].includes(raw.reason)) return null
    if (!['singletonMatches','jump','lean','grenades','aiGrenades','suppression'].every(k => typeof raw[k] === 'boolean')) return null
    if (!['observedChanges','coalescedChanges'].every(k => Number.isSafeInteger(raw[k]) && raw[k] >= 0 && raw[k] <= 2147483647)) return null
    if (raw.observedChanges < 1 || raw.coalescedChanges >= raw.observedChanges || (raw.aiGrenades && !raw.grenades)) return null
    return {...raw}
}
export function cometSainPresetSummary(t: SainPresetContext): string[] {
    const state = (enabled: boolean) => enabled ? 'allowed' : 'disabled'
    return [`Selected SAIN preset: ${t.name}.`, `Settings: ${t.availability}.`,
        t.singletonMatches ? 'The global singleton matches the selected preset.'
            : 'The global singleton does not match. COMET uses the selected preset; it does not change SAIN globally.',
        `SAIN permissions read by COMET: jump ${state(t.jump)}, lean ${state(t.lean)}, suppression ${state(t.suppression)}.`,
        `Grenades ${state(t.grenades)}; against AI ${state(t.aiGrenades)}. Other bot and tactic checks still apply.`,
        ...(t.coalescedChanges ? [`${t.coalescedChanges} intermediate observed changes were grouped into this report.`] : []),
        'Raid-wide preset context, not a combat action. COMET keeps its server configuration revision for this raid.']
}
