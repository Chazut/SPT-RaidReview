export type CometDifficultyPreset = {
    baseProfile: 'Easy' | 'Normal' | 'Hard'; catalogVersion: number;
    customized: boolean; changedSettings: number;
    presetName?: string; presetId?: string; presetRevision?: number; modifiedSincePreset?: boolean;
}
export function parseCometDifficultyPreset(raw: any): CometDifficultyPreset | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    if (!['Easy','Normal','Hard'].includes(raw.baseProfile) || typeof raw.customized !== 'boolean') return null
    if (!Number.isSafeInteger(raw.catalogVersion) || raw.catalogVersion < 1 || raw.catalogVersion > 2147483647) return null
    if (!Number.isSafeInteger(raw.changedSettings) || raw.changedSettings < 0 || raw.changedSettings > 2147483647) return null
    if (raw.customized !== (raw.changedSettings > 0)) return null
    const result: CometDifficultyPreset = {baseProfile:raw.baseProfile,catalogVersion:raw.catalogVersion,customized:raw.customized,changedSettings:raw.changedSettings}
    // Older U01 recordings have no personal-preset identity. Partial/malformed new metadata
    // must not turn into a plausible preset name or revision in the diagnostics.
    if ([raw.presetName,raw.presetId,raw.presetRevision,raw.modifiedSincePreset].some(v=>v!==undefined&&v!==null)) {
        if (typeof raw.presetName!=='string'||!raw.presetName.trim()||raw.presetName!==raw.presetName.trim()||raw.presetName.length>80||/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(raw.presetName)) return null
        if (typeof raw.presetId!=='string'||!/^[0-9a-f]{32}$/i.test(raw.presetId)||!Number.isSafeInteger(raw.presetRevision)||raw.presetRevision<1||typeof raw.modifiedSincePreset!=='boolean') return null
        Object.assign(result,{presetName:raw.presetName,presetId:raw.presetId,presetRevision:raw.presetRevision,modifiedSincePreset:raw.modifiedSincePreset})
    }
    return result
}
export function cometDifficultyPresetSummary(t: CometDifficultyPreset): string[] {
    return [`COMET difficulty: ${t.baseProfile}${t.customized ? ' - customized' : ''}.`,
        ...(t.presetName ? [`Personal preset: ${t.presetName} (revision ${t.presetRevision}).`,
            t.modifiedSincePreset ? 'Further settings changes were saved after loading this personal copy.' : 'Settings match this personal preset revision.'] : []),
        ...(t.customized ? [`Changed settings: ${t.changedSettings}.`] : []),
        `Preset catalogue version: ${t.catalogVersion}.`,
        'Hard is the default and highest COMET preset. Normal and Easy reduce tactical manoeuvre chances and increase time between attempts.',
        'This is the server configuration loaded for this raid. SAIN difficulty and preset settings are unchanged.']
}
