// World coordinates are x/y/z. Map extent rectangles contain x/z pairs;
// grid-cell y values are not elevations and must never be passed as world y.
export type FloorPoint = { x?: unknown; y?: unknown; z?: unknown }
export type FloorPredicate = (point: FloorPoint | null | undefined) => boolean
type Extent = { height?: number[]; bounds?: unknown[] }
type FloorMap = { heightRange?: number[]; layers?: { name: string; extents?: Extent[] }[] }
const finite = (v: unknown) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))

function inside(point: FloorPoint, extent: Extent): boolean {
    if (!extent.height || extent.height.length !== 2) return false
    const y = Number(point.y)
    if (y < extent.height[0] || y >= extent.height[1]) return false
    if (!extent.bounds?.length) return true
    return extent.bounds.some((rect: any) => {
        if (!Array.isArray(rect?.[0]) || !Array.isArray(rect?.[1])) return false
        const x = Number(point.x), z = Number(point.z)
        return x >= Math.min(rect[0][0], rect[1][0]) && x <= Math.max(rect[0][0], rect[1][0])
            && z >= Math.min(rect[0][1], rect[1][1]) && z <= Math.max(rect[0][1], rect[1][1])
    })
}

export function hasFloors(map: FloorMap | null | undefined): boolean {
    return !!map?.layers?.some(layer => layer.extents?.some(e => e.height?.length === 2))
}

export const allFloors: FloorPredicate = () => true

export function createFloorFilter(map: FloorMap | null | undefined, selected: string, enabled: boolean): FloorPredicate {
    if (!enabled || !hasFloors(map)) return allFloors
    const layers = map!.layers || []
    const extents = selected ? layers.find(layer => layer.name === selected)?.extents || [] : []
    const otherFloors = layers.flatMap(layer => layer.extents || [])
    return point => {
        if (!point || ![point.x, point.y, point.z].every(finite)) return false
        if (selected) return extents.some(extent => inside(point, extent))
        // Base ranges are often unbounded. Explicit regional floors win over
        // Base, including garages and tunnels inside its broad height range.
        return (!map!.heightRange || inside(point, { height: map!.heightRange }))
            && !otherFloors.some(extent => inside(point, extent))
    }
}

// Preserve breaks when a route leaves the selected floor and later returns.
export function floorSegments<T extends FloorPoint>(points: T[], visible: FloorPredicate): T[][] {
    const result: T[][] = []
    let segment: T[] | null = null
    for (const point of points) {
        if (!visible(point)) { segment = null; continue }
        if (!segment) { segment = []; result.push(segment) }
        segment.push(point)
    }
    return result
}

export function positionAt<T extends { time: unknown }>(samples: T[] | undefined, time: number): T | undefined {
    if (!samples) return undefined
    let lo = 0, hi = samples.length
    while (lo < hi) {
        const mid = (lo + hi) >>> 1
        if (Number(samples[mid].time) <= time) lo = mid + 1
        else hi = mid
    }
    return samples[lo - 1]
}

export const objectivePoint = (o: any): FloorPoint => ({ x: o.objectiveX, y: o.objectiveY, z: o.objectiveZ })

// Match the existing all-floor heatmap's unique-point weighting.
export function floorHeatmap(positions: Record<string, FloorPoint[]>, visible: FloorPredicate): number[][] {
    const points = new Map<string, number[]>()
    for (const samples of Object.values(positions || {})) for (const p of samples) {
        if (!visible(p)) continue
        points.set(`${p.z},${p.x}`, [Number(p.z), Number(p.x), 1])
    }
    return [...points.values()]
}

export function mainPoint(m: any): FloorPoint | null {
    // Cell-based kill/loot mains historically use y=0 as a placeholder.
    // Hiding an unlocated objective is safer than assigning it to a floor.
    if (['Kills', 'LootValue'].includes(m.type) && Number(m.y) === 0) return null
    return m
}
