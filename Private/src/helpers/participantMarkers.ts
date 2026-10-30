export type ParticipantKind = 'player' | 'pmc' | 'scav' | 'other'

const escapeXml = (value: string) => value.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]!))
const safeColor = (value?: string | null) => value && /^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(value) ? value : '#999999'

// Shared SVG for map markers, tooltips and React legends. Shape carries the role;
// color carries the squad. No random values or SVG IDs that collide across icons.
export function participantMarkerHtml(kind: ParticipantKind, color: string,
    label = '', size = 18, hpPercent = 100, behaviorColor?: string | null, opacity = 1): string {
    const fill = safeColor(color)
    const hp = Number.isFinite(hpPercent) ? Math.max(0, Math.min(100, hpPercent)) : 100
    const alpha = Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 1
    const shape = kind === 'player' ? 'path d="M12 2 L22 12 L12 22 L2 12 Z"'
        : kind === 'scav' ? 'path d="M12 3 L22 21 L2 21 Z"'
        : kind === 'other' ? 'rect x="3" y="3" width="18" height="18" rx="3"' : 'circle cx="12" cy="12" r="9"'
    const vehicle = kind === 'other' && label === 'BTR_ICON'
    const role = kind === 'player' ? 'Player' : kind === 'pmc' ? 'PMC' : kind === 'scav' ? 'Scav' : 'Bot'
    const text = escapeXml(vehicle ? 'BTR' : label)
    const title = `${role}${label ? ` ${text}` : ''}`
    const ring = behaviorColor ? `<${shape} fill="none" stroke="${safeColor(behaviorColor)}" stroke-width="5"/>` : ''
    const content = vehicle
        ? '<g transform="translate(4 6) scale(.67)" fill="#fff" stroke="#101318" stroke-width="1"><rect x="1" y="3" width="22" height="8" rx="1"/><rect x="5" y="1" width="10" height="4" rx="1"/><path d="M15 3 L22 5" fill="none" stroke="#fff" stroke-width="2"/><circle cx="5" cy="14" r="3"/><circle cx="12" cy="14" r="3"/><circle cx="19" cy="14" r="3"/></g>'
        : text ? `<text x="12" y="12.5" dominant-baseline="central" text-anchor="middle" fill="#fff" stroke="#101318" stroke-width="1.8" paint-order="stroke" font-size="${label.length > 2 ? 8 : label.length > 1 ? 10 : 11}" font-weight="700" font-family="Arial,sans-serif">${text}</text>` : ''
    return `<svg class="rr-participant-marker rr-marker-${kind}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" role="img" aria-label="${title}" style="display:inline-block;overflow:visible;vertical-align:middle;opacity:${alpha}"><title>${title}</title>${ring}<${shape} fill="${hp < 100 ? '#1e1e1e' : fill}"/>${hp < 100 ? `<${shape} fill="${fill}" style="clip-path:inset(${100 - hp}% 0 0 0)"/>` : ''}<${shape} fill="none" stroke="#101318" stroke-width="2.8"/><${shape} class="rr-marker-outline" fill="none" stroke="#f4f4ee" stroke-width="1.2"/>${content}</svg>`
}
