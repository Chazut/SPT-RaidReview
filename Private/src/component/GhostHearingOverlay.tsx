import { displayPlayerName } from '../helpers/playerNames'
import { allFloors, type FloorPredicate } from '../helpers/floorFilter'
import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import api from '../api/api'
import { ghostHearingInvestigations } from '../helpers/ghostHearing'
import type { TrackingOrbitGhostHearing, TrackingPositionalData, TrackingPlayerStatus } from '../types/api_types'

interface Props {
    raidId: string
    map: L.Map | null
    ready: boolean
    time: number
    players: { profileId: string; name: string }[]
    positions: Record<string, TrackingPositionalData[]>
    kills?: { killedId: string; time: number }[]
    playerStatuses?: TrackingPlayerStatus[]
    onFloor?: FloorPredicate
}

const COLOR = '#9ed0c3'
const clock = (ms: number) => Math.floor(ms / 60000) + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0')
const tag = <T extends L.Layer,>(layer: T): T => {
    ;(layer as T & { _rr_ghostHearing: boolean })._rr_ghostHearing = true
    return layer
}
const earIcon = L.divIcon({
    className: 'rr-ghost-hearing-icon', iconSize: [20, 20], iconAnchor: [-5, 20],
    html: '<span style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:5px;background:#142220e6;border:1px solid #9ed0c366;color:#9ed0c3;box-shadow:0 1px 3px #0008"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 4-4 4-4 7a4 4 0 0 1-8 0"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4"/></svg></span>'
})

export function GhostHearingOverlay({ raidId, map, ready, time, players, positions, kills, playerStatuses, onFloor = allFloors }: Props) {
    const [enabled, setEnabled] = useState(() => localStorage.getItem('rr_showGhostHearing') === 'true')
    const [events, setEvents] = useState<TrackingOrbitGhostHearing[]>([])
    const [status, setStatus] = useState<'loading' | 'ready' | 'unsupported' | 'error'>('loading')
    const [hovered, setHovered] = useState<string | null>(null)
    const groupRef = useRef<L.LayerGroup | null>(null)
    const markers = useRef(new Map<string, L.Marker>())

    useEffect(() => { localStorage.setItem('rr_showGhostHearing', String(enabled)) }, [enabled])
    useEffect(() => {
        const abort = new AbortController()
        setEvents([])
        setStatus('loading')
        api.getRaidOrbitGhostHearing(raidId, abort.signal).then(data => {
            if (abort.signal.aborted) return
            setEvents(data || [])
            setStatus(data === null ? 'unsupported' : 'ready')
        }).catch(() => { if (!abort.signal.aborted) setStatus('error') })
        return () => abort.abort()
    }, [raidId])

    const names = useMemo(() => new Map(players.map(p => [p.profileId, displayPlayerName(p.name, '')])), [players])
    const endTimes = useMemo(() => {
        const result = new Map<string, number>()
        const end = (id: string, t: number) => result.set(id, Math.min(result.get(id) ?? Infinity, Number(t)))
        for (const kill of kills || []) end(kill.killedId, kill.time)
        for (const status of playerStatuses || [])
            if (['Dead', 'Unspawned', 'Unknown', '1', '2', '3'].includes(String(status.status))) end(status.profileId, status.time)
        return result
    }, [kills, playerStatuses])
    const investigations = useMemo(() => enabled ? ghostHearingInvestigations(events, positions, time, endTimes).filter(onFloor) : [],
        [enabled, events, positions, time, endTimes, onFloor])

    useEffect(() => {
        setHovered(null)
        if (!map || !ready || !enabled) return
        const group = tag(L.layerGroup()).addTo(map)
        groupRef.current = group
        return () => {
            group.remove()
            markers.current.clear()
            groupRef.current = null
        }
    }, [map, ready, enabled, raidId])

    // Keep marker elements alive across playback frames so hover and keyboard focus stay stable.
    useEffect(() => {
        const group = groupRef.current
        if (!group) return
        const visible = new Set(investigations.map(h => h.profileId))
        for (const [id, marker] of markers.current) {
            if (visible.has(id)) continue
            group.removeLayer(marker)
            markers.current.delete(id)
        }
        if (hovered && !visible.has(hovered)) setHovered(null)
        for (const h of investigations) {
            const name = names.get(h.profileId) || 'Squad ' + h.event.squadId
            let marker = markers.current.get(h.profileId)
            if (!marker) {
                marker = tag(L.marker([h.z, h.x], { icon: earIcon, keyboard: true, zIndexOffset: 1000,
                    title: name + ': investigating a sound', alt: 'Ghost hearing investigation' })).addTo(group)
                marker.on('mouseover', () => setHovered(h.profileId))
                marker.on('mouseout', () => setHovered(null))
                marker.on('click', () => setHovered(h.profileId))
                const element = marker.getElement()
                element?.setAttribute('aria-label', name + ': investigating a sound')
                element?.addEventListener('focus', () => setHovered(h.profileId))
                element?.addEventListener('blur', () => setHovered(null))
                markers.current.set(h.profileId, marker)
            } else marker.setLatLng([h.z, h.x])
        }
    }, [investigations, names, map, ready, enabled, raidId, hovered])

    useEffect(() => {
        const group = groupRef.current
        const h = investigations.find(h => h.profileId === hovered)
        if (!group || !h || !onFloor({ x: h.event.sourceX, y: h.event.sourceY, z: h.event.sourceZ })) return
        const details = tag(L.layerGroup()).addTo(map!)
        const origin: L.LatLngExpression = [h.event.sourceZ, h.event.sourceX]
        tag(L.polyline([[h.z, h.x], origin], { color: COLOR, weight: 1.5, dashArray: '4 6', opacity: 0.85,
            interactive: false, className: 'rr-ghost-hearing-link' })).addTo(details)
        const text = document.createElement('div')
        text.style.whiteSpace = 'pre'
        text.textContent = (h.event.simulated ? 'Ghost fight' : 'Gunfire') + ' at ' + clock(h.event.time)
            + '\n' + (names.get(h.profileId) || 'Squad ' + h.event.squadId) + ': investigating (squad decision)'
            + '\n' + h.event.distance.toFixed(0) + ' m from the squad listener when heard'
        tag(L.circleMarker(origin, { radius: 4, color: COLOR, weight: 1.5, fillColor: '#142220', fillOpacity: 1,
            interactive: false, className: 'rr-ghost-hearing-source' })).addTo(details)
        tag(L.tooltip({ permanent: true, direction: 'top', offset: [0, -6] })
            .setLatLng(origin).setContent(text)).addTo(details)
        return () => {
            details.clearLayers()
            details.remove()
        }
    }, [investigations, hovered, names, map, ready, enabled, raidId, onFloor])

    const hint = status === 'error' ? 'Could not load recorded hearing decisions. Reload to retry.'
        : status === 'unsupported' ? 'Update the RaidReview server to load hearing decisions.'
        : 'An ear icon appears for 8 seconds when a Ghost squad decides to investigate a sound. Hover or focus it to reveal the source.'

    return <label className="flex items-center gap-2 cursor-pointer mt-4" style={{ fontSize: 14 }} title={hint}>
        <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="accent-eft" />
        <strong>Ghost hearing</strong>
    </label>
}
