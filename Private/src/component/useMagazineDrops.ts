import { useEffect, useState } from 'react'
import api from '../api/api'

// Fetch only the sparse magazine lifecycle, not every bot's combat stream.
export function useMagazineDrops(raidId: string, enabled: boolean) {
    const [result, setResult] = useState<{ raid: string; rows: unknown[] }>({ raid: '', rows: [] })
    useEffect(() => {
        if (!enabled || result.raid === raidId) return
        const controller = new AbortController()
        void (async () => {
            const rows: unknown[] = []
            for (let page = 0; ; page++) {
                const response = await api.getCometDecisions(raidId, page, 'RecoverMagazine', controller.signal)
                if (controller.signal.aborted) return
                if (response === null) break
                if (!Array.isArray(response.events) || !Number.isFinite(response.total)) throw new Error('Invalid magazine event page')
                rows.push(...response.events)
                if (rows.length >= response.total) break
                if (response.events.length === 0) throw new Error('Incomplete magazine event page')
            }
            setResult({ raid: raidId, rows })
        })().catch(error => { if (!controller.signal.aborted) console.warn('Magazine replay data unavailable', error) })
        return () => controller.abort()
    }, [raidId, enabled, result.raid])
    return result.raid === raidId ? result.rows : []
}
