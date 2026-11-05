import { useEffect, useRef, useState } from 'react'
import api from '../api/api'
import { CometMapRecord, prepareCometMapEvents } from '../helpers/cometMap'

export function useCometMapEvents(raidId: string, profileId: string | null, enabled: boolean) {
    const cache = useRef<{ raid: string; records: Record<string, CometMapRecord> }>({ raid: raidId, records: {} })
    const [view, setView] = useState(cache.current)
    useEffect(() => {
        if (cache.current.raid !== raidId) { cache.current = { raid: raidId, records: {} }; setView(cache.current) }
        if (!enabled || !profileId) return
        const saved = cache.current.records[profileId]
        if (saved?.status === 'ready' || saved?.status === 'unavailable') return
        const controller = new AbortController()
        const update = (record: CometMapRecord) => {
            if (controller.signal.aborted || cache.current.raid !== raidId) return
            cache.current = { raid: raidId, records: { ...cache.current.records, [profileId]: record } }
            setView(cache.current)
        }
        update({ status: 'loading', events: [] })
        void (async () => {
            const rows: unknown[] = []
            for (let offset = 0; ;) {
                const page = await api.getCometMapDecisions(raidId, profileId, offset, controller.signal)
                if (controller.signal.aborted) return
                if (page === null) { update({ status: 'unavailable', events: [] }); return }
                if (!Array.isArray(page.events) || !Number.isFinite(page.total) || page.total < 0) throw new Error('Invalid COMET response')
                rows.push(...page.events); offset += page.events.length
                if (offset >= page.total) break
                if (page.events.length === 0) throw new Error('Incomplete COMET event page')
            }
            update({ status: 'ready', events: prepareCometMapEvents(rows, profileId) })
        })().catch(() => update({ status: 'error', events: [] }))
        return () => controller.abort()
    }, [raidId, profileId, enabled])
    return view.raid === raidId ? view.records : {}
}
