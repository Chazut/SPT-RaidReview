export type MagazineRecoveryContext = {
    magazine: string; state: string; pending: number; itemName: string; template: string;
    x: number | null; y: number | null; z: number | null;
    active: boolean; pickupStateEntered: boolean; callbackReceived: boolean;
}

const stages = ['queued', 'started', 'arrived', 'pickup-wait', 'pickup-started', 'pickup-ready', 'completed', 'failed', 'interrupted', 'unavailable']
export function isMagazineRecoveryEvent(row: any): boolean {
    return row?.feature === 'W04' && row?.decision === 'RecoverMagazine' && stages.includes(row.stage)
}
export function parseMagazineRecovery(value: any, stage: string): MagazineRecoveryContext | null {
    if (!value || typeof value.magazine !== 'string' || !value.magazine || !stages.includes(stage)) return null
    const coordinate = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null
    return {
        magazine: value.magazine, state: stage, pending: Number(value.pending) || 0,
        itemName: typeof value.itemName === 'string' ? value.itemName : 'Discarded magazine',
        template: typeof value.template === 'string' ? value.template : '',
        x: coordinate(value.x), y: coordinate(value.y), z: coordinate(value.z),
        active: ['started', 'arrived', 'pickup-wait', 'pickup-started', 'pickup-ready'].includes(stage),
        pickupStateEntered: value.pickupStateEntered === true, callbackReceived: value.callbackReceived === true,
    }
}
export function magazineRecoveryTitle(c: MagazineRecoveryContext): string {
    if (c.state === 'started') return 'Returning for a discarded magazine'
    if (c.state === 'arrived' || c.state === 'pickup-wait') return 'Preparing to pick up a magazine'
    if (c.state === 'pickup-started' || c.state === 'pickup-ready') return 'Picking up a magazine'
    if (c.state === 'completed') return 'Magazine recovered'
    if (c.state === 'failed') return 'Magazine recovery failed'
    if (c.state === 'interrupted') return 'Magazine recovery interrupted'
    if (c.state === 'unavailable') return 'Magazine no longer available'
    return 'Magazine dropped during quick reload'
}

// Replay all inventory mutations in time order. An earlier pickup does not hide
// a later drop of the same item, and an unsuccessful recovery does not remove it.
export function droppedLootAt(looting: any[], recovery: any[], at: number): any[] {
    const known = new Map<string, any>()
    const changes: { time: number; order: number; id: string; row: any; stage?: string; add?: boolean }[] = []
    for (const row of looting || []) {
        const id = row.itemId || row.id
        if (!id) continue
        known.set(id, row)
        if (!Number.isFinite(Number(row.time)) || Number(row.time) > at) continue
        changes.push({ time: Number(row.time), order: 0, id, row, add: ['True', 'true', '1', true, 1].includes(row.added) })
    }
    for (const row of recovery || []) {
        if (!isMagazineRecoveryEvent(row) || !Number.isFinite(Number(row.time)) || Number(row.time) > at) continue
        let detail = row.detail
        if (typeof detail === 'string') { try { detail = JSON.parse(detail) } catch { continue } }
        const c = parseMagazineRecovery(detail?.magazineRecovery, row.stage)
        if (!c) continue
        changes.push({ time: Number(row.time), order: 1, id: c.magazine, row: c, stage: row.stage })
    }
    changes.sort((a, b) => a.time - b.time || a.order - b.order)
    const ground = new Map<string, any>()
    const confirmedWorld = new Set<string>()
    for (const change of changes) {
        const { id, row, stage } = change
        if (change.add || stage === 'completed' || stage === 'unavailable') { ground.delete(id); confirmedWorld.delete(id); continue }
        if (!stage && !change.add) {
            // Inventory events can arrive a frame after the physical drop.
            ground.set(id, confirmedWorld.has(id) ? { ...row, ...ground.get(id) } : row)
            continue
        }
        if (stage === 'queued' || ground.has(id)) {
            const existing = ground.get(id) || known.get(id) || {}
            if (row.x === null || row.y === null || row.z === null) continue
            ground.set(id, { ...existing, itemId: id, itemName: row.itemName === 'Discarded magazine' ? existing.itemName || existing.name || row.itemName : row.itemName,
                x: row.x, y: row.y, z: row.z, qty: existing.qty || 1, magazineRecovery: true })
            confirmedWorld.add(id)
        }
    }
    return [...ground.values()].filter(row => ['x', 'y', 'z'].every(k => row[k] !== null && row[k] !== undefined && Number.isFinite(Number(row[k])))
        && (row.magazineRecovery || Number(row.x) !== 0 || Number(row.z) !== 0))
}
