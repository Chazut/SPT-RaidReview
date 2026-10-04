type StatusSample = { profileId: string, time: number | string, status: string | number }
type PlayerStatus = 'Alive' | 'Dead' | 'Unspawned' | 'Unknown'

// Status packets report transitions, not heartbeats. An old Alive packet remains
// valid until another state is recorded, regardless of activity from other bots.
export function finalPlayerStatuses(samples: StatusSample[] = []): Map<string, PlayerStatus> {
    const latest = new Map<string, { time: number, status: PlayerStatus }>()
    const dead = new Set<string>()
    const names: PlayerStatus[] = ['Alive', 'Dead', 'Unspawned', 'Unknown']
    for (const sample of samples) {
        const status = names.find((name, index) => String(sample.status) === name || String(sample.status) === String(index))
        if (!status) continue
        if (status === 'Dead') dead.add(sample.profileId)
        const time = Number(sample.time)
        if (!Number.isFinite(time)) continue
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
