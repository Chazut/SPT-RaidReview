export interface GhostWake {
    id: number
    time: number
    profileId: string
    name: string
    cause: string
    detail: string
    triggerProfileId: string
    triggerName: string
    memberProfileId: string
    distance: number
}

export function parseGhostWakes(value: unknown): GhostWake[] {
    if (!Array.isArray(value)) throw new Error('Invalid Ghost wake response')
    return value.filter(v => v && typeof v === 'object' && v.time != null && Number.isFinite(Number(v.time)) && Number(v.time) >= 0
        && v.id != null && Number.isFinite(Number(v.id)) && typeof v.profileId === 'string' && v.profileId.length > 0
        && typeof v.cause === 'string').map(v => ({
        id: Number(v.id), time: Number(v.time), profileId: v.profileId,
        name: typeof v.name === 'string' ? v.name : '', cause: v.cause,
        detail: typeof v.detail === 'string' ? v.detail : '',
        triggerProfileId: typeof v.triggerProfileId === 'string' ? v.triggerProfileId : '',
        triggerName: typeof v.triggerName === 'string' ? v.triggerName : '',
        memberProfileId: typeof v.memberProfileId === 'string' ? v.memberProfileId : '',
        distance: Number.isFinite(Number(v.distance)) && v.distance != null ? Number(v.distance) : -1,
    })).sort((a, b) => a.time - b.time || a.id - b.id)
}

export const wakeCauseLabels: Record<string, string> = {
    HumanProximity: 'Player nearby', ScopedView: 'Visible through a scope',
    BotProximity: 'Awake bot nearby', Damage: 'Damage received', Targeted: 'Targeted by an enemy',
    Extraction: 'Extraction', GroupChanged: 'Group or controller changed',
    NativeFallback: 'Native behavior needs an awake body', RealFight: 'Real Ghost encounter',
    Spectator: 'Spectator mode',
}
