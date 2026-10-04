import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import api from '../api/api'
import { flightAt, groupAirdropFlights, visibleReleases, type FlightPoint } from '../helpers/airdropFlights'

const planeIcon = L.divIcon({ className: 'rr-airdrop-plane', iconSize: [30, 30], iconAnchor: [15, 15],
    html: '<svg viewBox="0 0 24 24" width="30" height="30" style="transform-origin:50% 50%;filter:drop-shadow(0 1px 2px #000)" fill="#67e8f9" stroke="#083344" stroke-width=".8" aria-hidden="true"><path d="M12 2c-1 0-1.5 1-1.5 2v5L3 14v2l7.5-2v5L8 21v1l4-1 4 1v-1l-2.5-2v-5l7.5 2v-2l-7.5-5V4c0-1-.5-2-1.5-2Z"/></svg>' })
const releaseIcon = L.divIcon({ className: 'rr-airdrop-release', iconSize: [18, 18], iconAnchor: [9, 9],
    html: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 1 17 9 9 17 1 9Z" fill="#164e63" stroke="#67e8f9" stroke-width="2"/><circle cx="9" cy="9" r="2" fill="#ecfeff"/></svg>' })
const clock = (ms: number) => Math.floor(ms / 60000) + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0')
const label = (text: string) => { const node = document.createElement('div'); node.textContent = text; return node }
function owned<T extends L.Layer>(layer: T): T { (layer as T & { _rr_airdrop: boolean })._rr_airdrop = true; return layer }

export function AirdropFlightOverlay({ raidId, map, ready, time, enabled }: {
    raidId: string; map: L.Map | null; ready: boolean; time: number; enabled: boolean
}) {
    const [points, setPoints] = useState<FlightPoint[]>([])
    const [status, setStatus] = useState('loading')
    const flights = useMemo(() => groupAirdropFlights(points), [points])
    const states = useMemo(() => flights.map(flight => ({ id: flight.id, ...flightAt(flight, time) })), [flights, time])
    const drops = useMemo(() => visibleReleases(flights, time), [flights, time])
    const layerRef = useRef<L.LayerGroup | null>(null)
    const planes = useRef(new Map<string, L.Marker>())
    const trails = useRef(new Map<string, L.Polyline>())
    const releases = useRef(new Map<string, L.Marker>())

    useEffect(() => {
        const abort = new AbortController()
        setPoints([]); setStatus('loading')
        api.getRaidAirdropFlights(raidId, abort.signal).then(data => {
            if (abort.signal.aborted) return
            setPoints(data || []); setStatus(data === null ? 'unsupported' : 'ready')
        }).catch(() => { if (!abort.signal.aborted) setStatus('error') })
        return () => abort.abort()
    }, [raidId])

    useEffect(() => {
        if (!map || !ready || !enabled) return
        const layer = owned(L.layerGroup()).addTo(map)
        layerRef.current = layer
        return () => { layer.clearLayers(); layer.remove(); layerRef.current = null; planes.current.clear(); trails.current.clear(); releases.current.clear() }
    }, [map, ready, enabled, raidId])

    useEffect(() => {
        const layer = layerRef.current
        if (!layer || !map) return
        const ids = new Set(states.filter(state => state.plane).map(state => state.id))
        for (const [id, marker] of planes.current) if (!ids.has(id)) { layer.removeLayer(marker); planes.current.delete(id) }
        const trailIds = new Set(states.filter(state => state.trail.length).map(state => state.id))
        for (const [id, line] of trails.current) if (!trailIds.has(id)) { layer.removeLayer(line); trails.current.delete(id) }
        for (const state of states) {
            if (state.trail.length) {
                let trail = trails.current.get(state.id)
                if (!trail) {
                    trail = owned(L.polyline([], { color: '#67e8f9', weight: 2, opacity: .65, interactive: false })).addTo(layer)
                    trails.current.set(state.id, trail)
                }
                trail.setLatLngs(state.trail.map(segment => segment.map(p => [p.z, p.x] as L.LatLngTuple)))
            }
            const point = state.plane
            if (!point) continue
            let marker = planes.current.get(state.id)
            if (!marker) {
                marker = owned(L.marker([point.z, point.x], { icon: planeIcon, title: 'Airdrop aircraft', zIndexOffset: 600 }))
                    .bindTooltip('', { direction: 'top', offset: [0, -14] }).addTo(layer)
                planes.current.set(state.id, marker)
            }
            marker.setLatLng([point.z, point.x])
            marker.setTooltipContent(label(`Airdrop aircraft | ${clock(time)} | Height ${point.y.toFixed(1)} m`))
            const from = map.latLngToLayerPoint([point.z, point.x])
            const radians = point.heading * Math.PI / 180
            const to = map.latLngToLayerPoint([point.z + Math.cos(radians) * 10, point.x + Math.sin(radians) * 10])
            const svg = marker.getElement()?.querySelector('svg')
            if (svg) svg.style.transform = `rotate(${Math.atan2(to.x - from.x, from.y - to.y) * 180 / Math.PI}deg)`
        }
        const dropIds = new Set(drops.map(drop => drop.dropId))
        for (const [id, marker] of releases.current) if (!dropIds.has(id)) { layer.removeLayer(marker); releases.current.delete(id) }
        for (const drop of drops) {
            let marker = releases.current.get(drop.dropId)
            const title = drop.kind === 'release' ? 'Airdrop release point' : 'Crate first observed airborne'
            if (!marker) {
                marker = owned(L.marker([drop.z, drop.x], { icon: releaseIcon, title, zIndexOffset: 400 }))
                    .bindTooltip('', { direction: 'top', offset: [0, -10] }).addTo(layer)
                releases.current.set(drop.dropId, marker)
            }
            marker.setLatLng([drop.z, drop.x])
            marker.setTooltipContent(label(`${title} | ${clock(drop.time)} | Height ${drop.y.toFixed(1)} m`))
            const element = marker.getElement()
            if (element) element.title = title
        }
    }, [states, drops, map, ready, enabled, raidId])

    const hint = status === 'error' ? 'Could not load aircraft tracks. Reload to retry.'
        : status === 'unsupported' ? 'Update the RaidReview server to show aircraft tracks.'
        : 'Cyan aircraft and line: recorded flight. Cyan diamond: release point, or first airborne observation on a remote client. Yellow crate: actual landing. Older raids have no flight history.'
    return <span title={hint} style={{ opacity: .7, fontSize: 12 }}>{status === 'error' ? 'flight data unavailable' : ` · ✈ ${states.filter(state => state.plane).length}`}</span>
}
