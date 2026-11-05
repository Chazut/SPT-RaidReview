import { useEffect, useRef, useState } from 'react'
import api from '../api/api'
import { CometMapRecord, prepareCometMapEvents } from '../helpers/cometMap'

export function useCometMapEvents(raidId: string, profileId: string | string[] | null, enabled: boolean) {
    const cache = useRef<{ raid: string; records: Record<string, CometMapRecord> }>({ raid: raidId, records: {} })
    const [view, setView] = useState(cache.current)
    const selection = JSON.stringify([...new Set(Array.isArray(profileId) ? profileId : profileId ? [profileId] : [])].sort())
    useEffect(() => {
        if (cache.current.raid !== raidId) { cache.current = { raid: raidId, records: {} }; setView(cache.current) }
        if (!enabled) return
        const pending: string[] = JSON.parse(selection).filter((id: string) => !['ready','unavailable'].includes(cache.current.records[id]?.status))
        if (!pending.length) return
        const controller = new AbortController()
        const update = (profileId: string, record: CometMapRecord) => {
            if (controller.signal.aborted || cache.current.raid !== raidId) return
            cache.current = { raid: raidId, records: { ...cache.current.records, [profileId]: record } }
            setView(cache.current)
        }
        const fetchProfile = async (profileId: string) => {
            update(profileId, { status: 'loading', events: [] })
            const rows: unknown[] = []
            for (let offset = 0; ;) {
                const page = await api.getCometMapDecisions(raidId, profileId, offset, controller.signal)
                if (controller.signal.aborted) return
                if (page === null) { update(profileId, { status: 'unavailable', events: [] }); return }
                if (!Array.isArray(page.events) || !Number.isFinite(page.total) || page.total < 0) throw new Error('Invalid COMET response')
                rows.push(...page.events); offset += page.events.length
                if (offset >= page.total) break
                if (page.events.length === 0) throw new Error('Incomplete COMET event page')
            }
            update(profileId, { status: 'ready', events: prepareCometMapEvents(rows, profileId) })
        }
        // Selected squad only, two requests at a time. Completed streams remain
        // cached when selecting another member or scrubbing the replay.
        let cursor = 0
        const worker = async () => {
            while (!controller.signal.aborted && cursor < pending.length) {
                const id = pending[cursor++]
                try { await fetchProfile(id) } catch { update(id, { status: 'error', events: [] }) }
            }
        }
        void Promise.all([worker(), worker()])
        return () => controller.abort()
    }, [raidId, selection, enabled])
    return view.raid === raidId ? view.records : {}
}
