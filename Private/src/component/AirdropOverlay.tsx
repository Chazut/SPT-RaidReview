import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import api from '../api/api'
import { AirdropFlightOverlay } from './AirdropFlightOverlay'
import { airdropLabel, visibleAirdrops, type Airdrop } from '../helpers/airdrops'

const icon = L.divIcon({
    className: 'rr-airdrop-icon', iconSize: [26, 26], iconAnchor: [13, 13],
    html: '<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;background:#241d11;border:2px solid #fbbf24;color:#fbbf24"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 10a9 9 0 0 1 18 0H3ZM3 10l6 7m12-7-6 7M9 10l2 7m4-7-2 7M9 17h6v5H9z"/></svg></span>'
})

export function AirdropOverlay({ raidId, map, ready, time }: { raidId: string; map: L.Map | null; ready: boolean; time: number }) {
    const [enabled, setEnabled] = useState(() => localStorage.getItem('rr_showAirdrops') !== 'false')
    const [drops, setDrops] = useState<Airdrop[]>([])
    const [status, setStatus] = useState('loading')
    const group = useRef<L.LayerGroup | null>(null)
    const markers = useRef(new Map<string, L.Marker>())
    const visible = useMemo(() => visibleAirdrops(drops, time), [drops, time])

    useEffect(() => { localStorage.setItem('rr_showAirdrops', String(enabled)) }, [enabled])
    useEffect(() => {
        const abort = new AbortController()
        setDrops([])
        setStatus('loading')
        api.getRaidAirdrops(raidId, abort.signal).then(data => {
            if (abort.signal.aborted) return
            setDrops(data || [])
            setStatus(data === null ? 'unsupported' : 'ready')
        }).catch(() => { if (!abort.signal.aborted) setStatus('error') })
        return () => abort.abort()
    }, [raidId])

    useEffect(() => {
        if (!map || !ready || !enabled) return
        const layer = L.layerGroup().addTo(map)
        ;(layer as L.LayerGroup & { _rr_airdrop: boolean })._rr_airdrop = true
        group.current = layer
        return () => { layer.clearLayers(); layer.remove(); group.current = null; markers.current.clear() }
    }, [map, ready, enabled, raidId])

    useEffect(() => {
        const layer = group.current
        if (!layer) return
        const ids = new Set(visible.map(drop => drop.dropId))
        for (const [id, marker] of markers.current) {
            if (ids.has(id)) continue
            layer.removeLayer(marker)
            markers.current.delete(id)
        }
        for (const drop of visible) {
            if (markers.current.has(drop.dropId)) continue
            const clock = Math.floor(drop.time / 60000) + ':' + String(Math.floor(drop.time / 1000) % 60).padStart(2, '0')
            const marker = L.marker([drop.z, drop.x], { icon, title: airdropLabel(drop.crateTemplateId), zIndexOffset: 450 })
            ;(marker as L.Marker & { _rr_airdrop: boolean })._rr_airdrop = true
            const text = document.createElement('div')
            text.textContent = `${airdropLabel(drop.crateTemplateId)} | Landed ${clock} | Height ${drop.y.toFixed(1)} m`
            marker.bindTooltip(text, { direction: 'top', offset: [0, -12] }).addTo(layer)
            markers.current.set(drop.dropId, marker)
        }
    }, [visible, map, ready, enabled, raidId])

    const hint = status === 'error' ? 'Could not load airdrops. Reload to retry.'
        : status === 'unsupported' ? 'Update the RaidReview server to show recorded airdrops.'
        : 'Shows aircraft tracks, release points and landed crates at the replay time. Loot contents are not tracked. Older raids may have no airdrop data.'
    return <label className="flex items-center gap-2 cursor-pointer mt-4" style={{ fontSize: 14 }} title={hint}>
        <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="accent-eft" />
        <strong>Airdrops</strong><span style={{ opacity: .6 }}>{visible.length}</span>
        <AirdropFlightOverlay raidId={raidId} map={map} ready={ready} time={time} enabled={enabled} />
    </label>
}
