import { useEffect, useRef, useState } from 'react'
import api from '../api/api'
import { CometMapRecord, prepareCometMapEvents } from '../helpers/cometMap'
import { appendCometPage, CometStream, newCometStream } from '../helpers/cometStream'

export function useCometMapEvents(raidId: string, profileId: string | string[] | null, enabled: boolean) {
    const cache = useRef<{ raid: string; records: Record<string, CometMapRecord> }>({ raid: raidId, records: {} })
    const [view, setView] = useState(cache.current)
    const streams = useRef<Record<string, CometStream>>({})
    const selection = JSON.stringify([...new Set(Array.isArray(profileId) ? profileId : profileId ? [profileId] : [])].sort())
    useEffect(() => {
        if (cache.current.raid !== raidId) { cache.current = { raid: raidId, records: {} }; streams.current = {}; setView(cache.current) }
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
            const stream = streams.current[profileId] ??= newCometStream()
            update(profileId, { status: 'loading', events: cache.current.records[profileId]?.events ?? [] })
            for (;;) {
                const page = await api.getCometMapDecisions(raidId, profileId, stream.cursor, controller.signal)
                if (controller.signal.aborted) return
                if (page === null) { update(profileId, { status: 'unavailable', events: [] }); return }
                const { done, publish } = appendCometPage(stream, page)
                if (publish) update(profileId, { status: done ? 'ready' : 'loading', events: prepareCometMapEvents(stream.rows, profileId) })
                if (done) { delete streams.current[profileId]; return }
            }
        }
        // Selected squad only, two requests at a time. Completed streams remain
        // cached when selecting another member or scrubbing the replay.
        let cursor = 0
        const worker = async () => {
            while (!controller.signal.aborted && cursor < pending.length) {
                const id = pending[cursor++]
                try { await fetchProfile(id) } catch { update(id, { status: 'error', events: cache.current.records[id]?.events ?? [] }) }
            }
        }
        void Promise.all([worker(), worker()])
        return () => controller.abort()
    }, [raidId, selection, enabled])
    return view.raid === raidId ? view.records : {}
}
