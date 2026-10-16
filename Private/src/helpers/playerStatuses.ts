type StatusSample = { profileId: string, time: number | string, status: string | number }
type PlayerStatus = 'Alive' | 'Dead' | 'Unspawned' | 'Unknown' | 'Extracted'

// Status packets report transitions, not heartbeats. An old Alive packet remains
// valid until another state is recorded, regardless of activity from other bots.
export function finalPlayerStatuses(samples: StatusSample[] = [], headlessEndTime?: number): Map<string, PlayerStatus> {
    const latest = new Map<string, { time: number, status: PlayerStatus }>()
    const dead = new Set<string>()
    const names: PlayerStatus[] = ['Alive', 'Dead', 'Unspawned', 'Unknown', 'Extracted']
    const previouslyAlive = new Set(samples.filter(sample => ['Alive', '0'].includes(String(sample.status))
        && Number(sample.time) < (headlessEndTime ?? -Infinity)).map(sample => sample.profileId))
    for (const sample of samples) {
        const status = names.find((name, index) => String(sample.status) === name || String(sample.status) === String(index))
        if (!status) continue
        const time = Number(sample.time)
        if (!Number.isFinite(time)) continue
        if (status === 'Dead') dead.add(sample.profileId)
        // Older headless recordings inspected destroyed players during Finish(),
        // emitting mass removals at exactly END. Preserve the last known state.
        if (time === headlessEndTime && status === 'Unspawned' && previouslyAlive.has(sample.profileId)) continue
        if (time >= (latest.get(sample.profileId)?.time ?? -Infinity)) {
            latest.set(sample.profileId, { time, status })
        }
    }
    const result = new Map<string, PlayerStatus>()
    for (const [id, sample] of latest) result.set(id, sample.status)
    // A later removal must not replace a recorded death.
    for (const id of dead) result.set(id, 'Dead')
    return result
}

// Alive packets are state changes, so grouping their timestamps measures spawns,
// not the population that was present simultaneously.
export function peakActiveBots(samples: StatusSample[] = [], humanIds: string[] = []): number {
    const humans = new Set(humanIds), active = new Set<string>()
    let peak = 0
    for (const sample of [...samples].sort((a, b) => Number(a.time) - Number(b.time))) {
        if (humans.has(sample.profileId) || !Number.isFinite(Number(sample.time))) continue
        if (['Alive', '0'].includes(String(sample.status))) active.add(sample.profileId)
        else if (['Dead', 'Unspawned', 'Unknown', 'Extracted', '1', '2', '3', '4'].includes(String(sample.status))) active.delete(sample.profileId)
        peak = Math.max(peak, active.size)
    }
    return peak
}

// Missing/removal evidence must never be presented as a successful extraction.
export function playerStatusLabel(status?: PlayerStatus): string {
    return status === 'Dead' ? 'KIA' : status === 'Extracted' ? 'Extracted'
        : status === 'Unspawned' ? 'Removed' : status === 'Alive' ? 'Alive' : 'Unknown'
}
