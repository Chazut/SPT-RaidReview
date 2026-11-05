import { useEffect } from 'react'
import L from 'leaflet'
import { FloorPoint, FloorPredicate } from '../helpers/floorFilter'

export default function CometDestinationOverlay({ map, ready, visible, origin, destination, onFloor }: {
    map: L.Map | null; ready: boolean; visible: boolean; origin?: FloorPoint | null;
    destination?: { x: number; y: number; z: number } | null; onFloor: FloorPredicate;
}) {
    useEffect(() => {
        if (!map || !ready || !visible || !origin || !destination || !onFloor(origin) || !onFloor(destination)) return
        if (![origin.x,origin.y,origin.z].every(n=>n!==null && n!==undefined && Number.isFinite(Number(n)))) return
        const target: L.LatLngExpression = [destination.z,destination.x]
        const layers=[
            L.polyline([[Number(origin.z),Number(origin.x)],target], {color:'#e4cb83',weight:2,dashArray:'4 7',opacity:.75,interactive:false}),
            L.circleMarker(target, {radius:4,color:'#e4cb83',fillColor:'#171710',fillOpacity:1,weight:2,interactive:false}),
        ]
        // This effect owns these layers; the replay's per-frame cleanup must keep them.
        layers.forEach(layer => Object.assign(layer, { _rr_cometDestination: true }))
        const group=L.layerGroup(layers).addTo(map)
        return () => { group.remove() }
    },[map,ready,visible,origin?.x,origin?.y,origin?.z,destination?.x,destination?.y,destination?.z,onFloor])
    return null
}
