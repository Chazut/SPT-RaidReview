type Position = { time: number | string }
type Status = { profileId: string, time: number | string, status: string | number }
type Kill = { killedId: string, time: number | string }

// Bound marker presence by recorded terminal events or a stopped position stream.
// A stopped stream alone does not establish why the bot left; keep historical trails.
export function playerEndTimes(positions: Record<string, Position[]>, statuses: Status[] = [], kills: Kill[] = []): Record<string, number> {
    const ends: Record<string, number> = {}
    const lasts: Record<string, number> = {}
    let raidEnd = 0
    for (const [id, samples] of Object.entries(positions || {})) {
        for (const sample of samples || []) {
            const time = Number(sample.time)
            if (!Number.isFinite(time)) continue
            lasts[id] = Math.max(lasts[id] ?? 0, time)
            raidEnd = Math.max(raidEnd, time)
        }
    }
    const end = (id: string, time: number) => {
        if (Number.isFinite(time)) ends[id] = Math.min(ends[id] ?? Infinity, time)
    }
    for (const kill of kills || []) end(kill.killedId, Number(kill.time))
    for (const status of statuses || []) {
        // An early Unknown can precede a valid spawn. Do not erase later recorded life.
        if (['Dead', 'Unspawned', 'Unknown', 'Extracted', '1', '2', '3', '4'].includes(String(status.status))
            && Number(status.time) >= (lasts[status.profileId] ?? 0)) end(status.profileId, Number(status.time))
    }
    for (const [id, last] of Object.entries(lasts)) {
        if (last < raidEnd - 2000) end(id, last)
    }
    return ends
}
