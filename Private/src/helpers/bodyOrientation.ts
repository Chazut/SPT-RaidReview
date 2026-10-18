type OrientationSample = {
    x?: unknown
    z?: unknown
    bodyYaw?: number | null
    ghost?: boolean
    dormant?: boolean
}
type Point = { x: number, y: number }

// Screen angle for an arrow pointing up at zero degrees. Project both ends
// through the map CRS so map rotation, axis flips and scaling are respected.
export function bodyOrientationAngle(sample: OrientationSample | null | undefined,
    project: (x: number, z: number) => Point): number | null {
    if (!sample || (sample.ghost ?? sample.dormant) || typeof sample.bodyYaw !== 'number'
        || !Number.isFinite(sample.bodyYaw) || typeof sample.x !== 'number' || typeof sample.z !== 'number'
        || !Number.isFinite(sample.x) || !Number.isFinite(sample.z)) return null

    const radians = sample.bodyYaw * Math.PI / 180
    const origin = project(sample.x, sample.z)
    const forward = project(sample.x + Math.sin(radians) * 10, sample.z + Math.cos(radians) * 10)
    const dx = forward.x - origin.x, dy = forward.y - origin.y
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || dx * dx + dy * dy < 1e-12) return null
    return Math.atan2(dx, -dy) * 180 / Math.PI
}

// Rotate only a non-interactive child, never Leaflet's positioned root or the
// label. This also updates focused markers without recreating their tooltip.
export function updateBodyOrientation(element: HTMLElement | undefined, angle: number | null,
    color: string, opacity: number): void {
    if (!element) return
    let arrow = element.querySelector<HTMLElement>('.rr-body-orientation')
    if (angle == null || !Number.isFinite(angle)) {
        arrow?.remove()
        return
    }
    if (!arrow) {
        arrow = document.createElement('span')
        arrow.className = 'rr-body-orientation'
        arrow.setAttribute('aria-hidden', 'true')
        arrow.innerHTML = '<svg viewBox="0 0 14 14"><path d="M7 1 L13 12 L7 9 L1 12 Z"/></svg>'
        element.appendChild(arrow)
    }
    arrow.style.transform = `rotate(${angle}deg)`
    arrow.style.color = color
    arrow.style.opacity = String(opacity)
}
