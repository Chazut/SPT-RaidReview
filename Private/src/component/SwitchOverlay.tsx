import { allFloors, type FloorPredicate } from '../helpers/floorFilter'
import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import api from '../api/api'
import { groupSwitches, switchAt, switchAppearance, switchName, type SwitchState } from '../helpers/switches'

function icon(color: string) {
    return L.divIcon({ className: 'rr-switch-icon', iconSize: [22, 22], iconAnchor: [11, 11],
        html: `<span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#111827;border:2px solid ${color};color:${color}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M12 2v10M6 5a9 9 0 1 0 12 0"/></svg></span>` })
}

export function SwitchOverlay({ raidId, location, map, ready, time, onFloor = allFloors }: { raidId: string; location: string; map: L.Map | null; ready: boolean; time: number; onFloor?: FloorPredicate }) {
    const [enabled, setEnabled] = useState(() => localStorage.getItem('rr_showSwitches') !== 'false')
    const [events, setEvents] = useState<SwitchState[]>([])
    const [status, setStatus] = useState('loading')
    const group = useRef<L.LayerGroup | null>(null)
    const markers = useRef(new Map<string, { marker: L.Marker; sequence: number }>())
    const histories = useMemo(() => groupSwitches(events, location), [events, location])
    const visible = useMemo(() => histories.map(history => switchAt(history, time)).filter((e): e is SwitchState => !!e && onFloor(e)), [histories, time, onFloor])

    useEffect(() => { localStorage.setItem('rr_showSwitches', String(enabled)) }, [enabled])
    useEffect(() => {
        const abort = new AbortController()
        setEvents([]); setStatus('loading')
        api.getRaidSwitches(raidId, abort.signal).then(data => {
            if (abort.signal.aborted) return
            setEvents(data || []); setStatus(data === null ? 'unsupported' : 'ready')
        }).catch(() => { if (!abort.signal.aborted) setStatus('error') })
        return () => abort.abort()
    }, [raidId])

    useEffect(() => {
        if (!map || !ready || !enabled) return
        const layer = L.layerGroup().addTo(map)
        ;(layer as L.LayerGroup & { _rr_switch: boolean })._rr_switch = true
        group.current = layer
        return () => { layer.clearLayers(); layer.remove(); group.current = null; markers.current.clear() }
    }, [map, ready, enabled, raidId])

    useEffect(() => {
        const layer = group.current
        if (!layer) return
        const ids = new Set(visible.map(event => event.switchId))
        for (const [id, entry] of markers.current) {
            if (ids.has(id)) continue
            layer.removeLayer(entry.marker); markers.current.delete(id)
        }
        for (const event of visible) {
            let entry = markers.current.get(event.switchId)
            if (entry?.sequence === event.sequence) continue
            const appearance = switchAppearance(event.state)
            const name = switchName(event)
            if (!entry) {
                const marker = L.marker([event.z, event.x], { icon: icon(appearance.color), title: name, zIndexOffset: 400 })
                ;(marker as L.Marker & { _rr_switch: boolean })._rr_switch = true
                entry = { marker, sequence: event.sequence }
                marker.addTo(layer); markers.current.set(event.switchId, entry)
            } else {
                entry.marker.setIcon(icon(appearance.color)).setLatLng([event.z, event.x])
                entry.sequence = event.sequence
            }
            const clock = Math.floor(event.time / 60000) + ':' + String(Math.floor(event.time / 1000) % 60).padStart(2, '0')
            const text = document.createElement('div')
            text.textContent = `${name} | ${appearance.label} | ${event.time === 0 ? 'Initial state' : 'Changed ' + clock} | Height ${event.y.toFixed(1)} m | ${event.switchId}`
            if (entry.marker.getTooltip()) entry.marker.setTooltipContent(text)
            else entry.marker.bindTooltip(text, { direction: 'top', offset: [0, -10] })
        }
    }, [visible, map, ready, enabled, raidId])

    const hint = status === 'error' ? 'Could not load switches. Reload to retry.'
        : status === 'unsupported' ? 'Update the RaidReview server to show switches.'
        : 'Recorded switch states at the replay time: green activated, gray inactive, red locked, yellow changing. Older raids have no switch history.'
    return <label className="flex items-center gap-2 cursor-pointer mt-4" style={{ fontSize: 14 }} title={hint}>
        <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="accent-eft" />
        <strong>Switches</strong><span style={{ opacity: .6 }}>{visible.length}</span>
    </label>
}
