export const isGasDeath = (event: { type?: string }) => event.type === 'HotGases'
export const deathIcon = (event: { type?: string }) => isGasDeath(event) ? '/explosion.svg' : '/skull.png'

// Old raids recorded the final gas damage and Dead status but no kill packet.
// Use the last real position, without inventing an attacker or changing kill stats.
export function legacyGasKills(deaths: any[] = [], positions: Record<string, any[]> = {}, kills: any[] = []) {
    const present = new Set(kills.map(k => k.killedId))
    const result: any[] = []
    for (const death of deaths) {
        if (!isGasDeath(death) || present.has(death.profileId)) continue
        const time = Number(death.time)
        if (!Number.isFinite(time)) continue
        let last: any
        for (const p of positions[death.profileId] || []) {
            const t = Number(p.time)
            if (t <= time && (!last || t > Number(last.time))) last = p
        }
        if (!last || ![last.x,last.y,last.z].every(n => Number.isFinite(Number(n)))) continue
        const position = JSON.stringify({ x:Number(last.x), y:Number(last.y), z:Number(last.z) })
        result.push({ time, profileId:death.profileId, killedId:death.profileId, type:'HotGases',
            weapon:'Gas explosion', bodyPart:'', distance:0, positionKiller:position, positionKilled:position })
        present.add(death.profileId)
    }
    return result
}
