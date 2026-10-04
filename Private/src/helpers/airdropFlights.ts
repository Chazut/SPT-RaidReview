export interface FlightPoint {
    flightId: string
    kind: 'sample' | 'end' | 'release' | 'airborne'
    dropId: string
    time: number
    x: number
    y: number
    z: number
    heading: number
}
export interface AirdropFlight { id: string; path: FlightPoint[]; drops: FlightPoint[] }

export function parseAirdropFlights(input: unknown): FlightPoint[] {
    if (!Array.isArray(input)) return []
    const points = new Map<string, FlightPoint>()
    for (const value of input) {
        if (!value || typeof value !== 'object') continue
        const row = value as Record<string, unknown>
        if (typeof row.flightId !== 'string' || !row.flightId || row.flightId.length > 128
            || !['sample', 'end', 'release', 'airborne'].includes(String(row.kind)) || typeof row.dropId !== 'string') continue
        if (['time', 'x', 'y', 'z', 'heading'].some(key =>
            !['number', 'string'].includes(typeof row[key]) || row[key] === '' || !Number.isFinite(Number(row[key])))) continue
        if (Number(row.time) < 0 || !Number.isSafeInteger(Number(row.time))) continue
        if ((row.kind === 'release' || row.kind === 'airborne') && !row.dropId) continue
        const point: FlightPoint = { flightId: row.flightId, kind: row.kind as FlightPoint['kind'], dropId: row.dropId,
            time: Number(row.time), x: Number(row.x), y: Number(row.y), z: Number(row.z), heading: Number(row.heading) }
        const key = `${point.flightId}\0${point.time}\0${point.kind}`
        if (!points.has(key)) points.set(key, point)
    }
    return [...points.values()].sort((a, b) => a.time - b.time || Number(a.kind === 'end') - Number(b.kind === 'end'))
}

export function groupAirdropFlights(points: FlightPoint[]): AirdropFlight[] {
    const groups = new Map<string, AirdropFlight>()
    for (const point of points) {
        let flight = groups.get(point.flightId)
        if (!flight) { flight = { id: point.flightId, path: [], drops: [] }; groups.set(point.flightId, flight) }
        if (point.kind === 'release' || point.kind === 'airborne') flight.drops.push(point)
        else flight.path.push(point)
    }
    return [...groups.values()]
}

export function flightAt(flight: AirdropFlight, time: number): { plane: FlightPoint | null; trail: FlightPoint[][] } {
    const path = flight.path
    let low = 0, high = path.length
    while (low < high) {
        const mid = (low + high) >>> 1
        if (path[mid].time <= time) low = mid + 1
        else high = mid
    }
    if (low === 0) return { plane: null, trail: [] }
    const previous = path[low - 1], next = path[low]
    let plane: FlightPoint | null = null
    if (previous.kind !== 'end') {
        if (next && next.time - previous.time <= 2000) {
            const t = (time - previous.time) / (next.time - previous.time)
            const turn = ((next.heading - previous.heading + 540) % 360 + 360) % 360 - 180
            plane = { ...previous, time, x: previous.x + (next.x - previous.x) * t,
                y: previous.y + (next.y - previous.y) * t, z: previous.z + (next.z - previous.z) * t,
                heading: previous.heading + turn * t }
        } else if (time - previous.time <= 1000) plane = previous
    }
    const trail: FlightPoint[][] = []
    for (let i = 0; i < low; i++) {
        if (i === 0 || path[i].time - path[i - 1].time > 2000) trail.push([])
        trail[trail.length - 1].push(path[i])
    }
    if (plane && plane !== previous) trail[trail.length - 1].push(plane)
    return { plane, trail }
}

export function visibleReleases(flights: AirdropFlight[], time: number): FlightPoint[] {
    const drops = new Map<string, FlightPoint>()
    for (const flight of flights) for (const point of flight.drops) {
        if (point.time > time) continue
        const old = drops.get(point.dropId)
        if (!old || old.kind === 'airborne' && point.kind === 'release') drops.set(point.dropId, point)
    }
    return [...drops.values()]
}
