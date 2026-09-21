import type { TrackingOrbitGhostHearing } from '../types/api_types'
import type { TrackingPositionalData } from '../types/api_types'

export const HEARING_DISPLAY_MS = 8000

// SQLite stores membership as JSON. Validate coordinates before passing them to Leaflet.
export function parseGhostHearing(data: unknown): TrackingOrbitGhostHearing[] {
    if (!Array.isArray(data)) return []
    const result: TrackingOrbitGhostHearing[] = []
    const numbers = ['id', 'time', 'noiseId', 'squadId', 'sourceX', 'sourceY', 'sourceZ',
        'listenerX', 'listenerY', 'listenerZ', 'range', 'minimumDistance', 'distance',
        'chance', 'simulated', 'shots', 'investigate'] as const
    for (const row of data) {
        if (!row || typeof row !== 'object') continue
        const event = { ...row }
        if (numbers.some(key => row[key] == null || !Number.isFinite(Number(row[key])))) continue
        for (const key of numbers) event[key] = Number(row[key])
        if (event.time < 0 || event.range <= 0 || event.minimumDistance < 0
            || event.minimumDistance > event.range || event.distance < 0
            || event.chance < 0 || event.chance > 1
            || ![0, 1].includes(event.simulated) || ![0, 1].includes(event.investigate)) continue
        try {
            const ids = typeof row.memberProfileIds === 'string' ? JSON.parse(row.memberProfileIds) : row.memberProfileIds
            event.memberProfileIds = Array.isArray(ids) ? ids.filter((id: unknown) => typeof id === 'string') : []
        } catch { event.memberProfileIds = [] }
        event.profileId = typeof row.profileId === 'string' ? row.profileId : ''
        event.personality = typeof row.personality === 'string' ? row.personality : ''
        result.push(event as TrackingOrbitGhostHearing)
    }
    return result.sort((a, b) => a.time - b.time || a.id - b.id)
}

// Binary search keeps playback work proportional to recent decisions, not total raid length.
export function hearingCursor(events: TrackingOrbitGhostHearing[], time: number, inclusive = true): number {
    let lo = 0, hi = events.length
    while (lo < hi) {
        const mid = (lo + hi) >>> 1
        if (events[mid].time < time || (inclusive && events[mid].time === time)) lo = mid + 1
        else hi = mid
    }
    return lo
}

export function activeGhostHearing(events: TrackingOrbitGhostHearing[], time: number): TrackingOrbitGhostHearing[] {
    return events.slice(hearingCursor(events, time - HEARING_DISPLAY_MS), hearingCursor(events, time))
}

export interface HearingInvestigation {
    profileId: string
    x: number
    z: number
    event: TrackingOrbitGhostHearing
}

// A hearing roll belongs to the squad. Mark its recorded members at their current replay positions.
// Only accepted decisions produce an icon; do not invent an investigation from hearing coverage.
export function ghostHearingInvestigations(events: TrackingOrbitGhostHearing[],
    positions: Record<string, TrackingPositionalData[]>, time: number, endTimes: Map<string, number>): HearingInvestigation[] {
    const latest = new Map<string, TrackingOrbitGhostHearing>()
    for (const event of activeGhostHearing(events, time)) {
        if (!event.investigate) continue
        for (const id of new Set([event.profileId, ...event.memberProfileIds]))
            if (id) latest.set(id, event)
    }
    const result: HearingInvestigation[] = []
    for (const [profileId, event] of latest) {
        if (time >= (endTimes.get(profileId) ?? Infinity)) continue
        const samples = positions[profileId] || []
        let lo = 0, hi = samples.length
        while (lo < hi) {
            const mid = (lo + hi) >>> 1
            if (Number(samples[mid].time) <= time) lo = mid + 1
            else hi = mid
        }
        const sample = samples[lo - 1]
        if (!sample || !(sample.ghost ?? sample.dormant)) continue
        if ([sample.x, sample.z].some(v => v == null || !Number.isFinite(Number(v)))) continue
        result.push({ profileId, event, x: Number(sample.x), z: Number(sample.z) })
    }
    return result
}
