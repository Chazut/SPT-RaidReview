export interface Airdrop {
    dropId: string
    time: number
    x: number
    y: number
    z: number
    crateTemplateId: string
}

export function parseAirdrops(value: unknown): Airdrop[] {
    if (!Array.isArray(value)) return []
    const drops = new Map<string, Airdrop>()
    for (const row of value) {
        if (!row || typeof row !== 'object' || typeof row.dropId !== 'string' || !row.dropId) continue
        if (['time', 'x', 'y', 'z'].some(key => row[key] == null || row[key] === '' || !Number.isFinite(Number(row[key])))) continue
        const drop = { dropId: row.dropId, time: Number(row.time), x: Number(row.x), y: Number(row.y), z: Number(row.z),
            crateTemplateId: typeof row.crateTemplateId === 'string' ? row.crateTemplateId : '' }
        if (drop.time < 0) continue
        const previous = drops.get(drop.dropId)
        if (!previous || drop.time < previous.time) drops.set(drop.dropId, drop)
    }
    return [...drops.values()].sort((a, b) => a.time - b.time)
}

export const visibleAirdrops = (drops: Airdrop[], time: number) => drops.filter(drop => drop.time <= time)

export function airdropLabel(template: string): string {
    switch (template) {
        case '6223349b3136504a544d1608': return 'Common supply airdrop'
        case '622334c873090231d904a9fc': return 'Medical airdrop'
        case '622334fa3136504a544d160c': return 'Supply airdrop'
        case '6223351bb5d97a7b2c635ca7':
        case '62f10b79e7ee985f386b2f47':
        case '633ffb5d419dbf4bea7004c6': return 'Weapon airdrop'
        default: return 'Airdrop'
    }
}
