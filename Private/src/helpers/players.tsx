import BotMapping from '../assets/botMapping.json'
import { resolveIsbCategory } from './isb'
import { isHumanPlayer, playerGroupKey } from './playerIdentity'
import { squadColor } from './groupColors'
import { participantMarkerHtml, ParticipantKind } from './participantMarkers'

export { PMC_COLORS } from './groupColors'

// Older recordings assigned hunt raiders to the faction they were hunting.
export function isRaiderHunter(player: any): boolean {
    return player?.type === 'RAIDER HUNTER|RAIDER' || player?.type === 'UNTAR HUNTER|UNTAR'
}

export function getMarkerLabel(player: any): string | null {
    if (isRaiderHunter(player)) return 'Rd'
    const type = (player?.type || '').toUpperCase()
    const isb = resolveIsbCategory(player)
    if (isb) return isb === 'ISB_WT' ? 'WT' : 'IS'

    if (type.includes('KILLA')) return 'Ki'
    if (type.includes('RASHALA')) return 'Ra'
    if (type.includes('SHTURMAN')) return 'Sh'
    if (type.includes('TAGILLA')) return 'Ta'
    if (type.includes('SANITAR')) return 'Sa'
    if (type.includes('GLUHAR')) return 'Gl'
    if (type.includes('ZRYACHIY')) return 'Zr'
    if (type.includes('KABAN')) return 'Kb'
    if (type.includes('KOLONTAY')) return 'Ko'
    if (type.includes('PARTIZAN')) return 'P'
    if (type.includes('WEDGE')) return 'We'

    if (type.includes('KNIGHT')) return 'Kn'
    if (type.includes('BIGPIPE')) return 'BP'
    if (type.includes('BIRDEYE')) return 'BE'

    if (type.includes('MERCENARY')) return 'M'
    if (type.includes('RUAF')) return 'R'
    if (type.includes('UNTAR')) return 'U'
    if (type.includes('BLACK DIV')) return 'BD'
    if (type.includes('ISB')) return 'IS'

    if (type.includes('SHADOW TAGILLA')) return 'ST'
    if (type.includes('VENGEFUL KILLA')) return 'VK'
    if (type.includes('INFECTED')) return 'If'
    if (type.includes('SPIRIT')) return 'Sp'

    if (type.includes('RAIDER')) return 'Rd'
    if (type.includes('ROGUE')) return 'Rg'
    if (type.includes('CULTIST PRIEST')) return 'CP'
    if (type.includes('CULTIST')) return 'Cu'
    if (type.includes('BLOODHOUND')) return 'Bh'
    if (type.includes('BTR')) return 'BTR_ICON'
    if (type.includes('SNIPER')) return 'Sn'

    // Custom mod bots (FACTION_MOD): generate initials from the WildSpawnType
    // e.g. BOSSLEGION|FACTION_MOD → "Le", LEGIONNAIRE|FACTION_MOD → "Le"
    if (type.includes('FACTION_MOD')) {
        const rawName = type.split('|')[0].replace('BOSS', '').replace('FOLLOWER', '')
        if (rawName.length >= 2) return rawName.substring(0, 2).charAt(0).toUpperCase() + rawName.substring(1, 2).toLowerCase()
        if (rawName.length === 1) return rawName.toUpperCase()
    }

    return null
}

// Resolve ISB's display-only subgroup, then botMapping.json and the "NAME|CATEGORY" fallback.
// All colour/label/role/grouping helpers build on this.
export function resolveBotType(player: any): string {
    if (!player) return 'UNKNOWN'
    const isb = resolveIsbCategory(player)
    if (isb) return isb
    let botMapping = (BotMapping as any)[player.type]
    if (player.name === 'Knight') botMapping = { type: 'GOON' }
    if (!botMapping && typeof player.type === 'string' && player.type.includes('|')) {
        const category = player.type.split('|')[1]
        const name = player.type.split('|')[0].toLowerCase()
        if (category === 'FACTION_MOD') {
            botMapping = { type: name.startsWith('boss') ? 'BOSS' : name.startsWith('combine') ? 'COMBINE' : 'FOLLOWER' }
        } else {
            botMapping = { type: category }
        }
    }
    return botMapping?.type ?? 'UNKNOWN'
}

export function getPlayerColor(player: any, index: number): string {
    if (player === undefined) return '#999'
    if (isHumanPlayer(player)) return '#D9C48A'

    switch (resolveBotType(player)) {
        case 'SCAV': return '#33FF57'
        case 'BOSS': return '#FF0000'
        case 'ROGUE':
        case 'FOLLOWER': return '#ff7b00'
        case 'BLOODHOUND': return '#6d0000'
        case 'RAIDER': return '#FF00FF'
        case 'PLAYER_SCAV': return '#33FF8D'
        case 'SNIPER': return '#00911a'
        case 'GOON': return '#ff005d'
        case 'CULT': return '#6f00ff'
        case 'OTHER': return '#00eeff'
        case 'MERCENARY': return '#FFD700'
        case 'RUAF': return '#4A90D9'
        case 'UNTAR': return '#00BFFF'
        case 'BLACKDIV': return '#555555'
        case 'ISB': return '#1ABC9C'
        case 'ISB_WT': return '#D5E8E4'
        case 'COMBINE': return '#4B6584'
        case 'INFECTED': return '#7FFF00'
        default:
            if (player.type === 'PLAYER' && player.team === 'Savage') return '#33FF57'
            return squadColor(Number.isFinite(Number(player.group)) ? Number(player.group) : index)
    }
}

export function getParticipantKind(player: any): ParticipantKind {
    if (!player) return 'other'
    if (isHumanPlayer(player)) return 'player'
    const type = resolveBotType(player)
    if (type === 'SCAV' || type === 'PLAYER_SCAV' || (player.type === 'PLAYER' && player.team === 'Savage')) return 'scav'
    if (type === 'PMC' || (type === 'UNKNOWN' && (player.type === 'PMC' || player.team === 'Usec' || player.team === 'Bear'))) return 'pmc'
    return 'other'
}

// Always use the full recording roster, never just the visible/alive participants.
// Sorting group keys keeps colors identical across pages, filters and reloads.
export function createPlayerColorResolver(players: any[] = [], recordingOwnerId?: string): (player: any, index: number) => string {
    const groups = [...new Set(players.filter(p => getParticipantKind(p) === 'pmc' && !isHumanPlayer(p, recordingOwnerId))
        .map(p => playerGroupKey(p)))].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
    const colors = new Map<string, string>()
    const used = new Set(['#D9C48A', ...players.filter(p => getParticipantKind(p) !== 'pmc')
        .map((p, i) => getPlayerColor(p, i).toUpperCase())])
    let slot = 0
    for (const group of groups) {
        let color = squadColor(slot++)
        while (used.has(color)) color = squadColor(slot++)
        used.add(color)
        colors.set(group, color)
    }
    return (player, index) => {
        if (player && isHumanPlayer(player, recordingOwnerId)) return '#D9C48A'
        if (getParticipantKind(player) === 'pmc') return colors.get(playerGroupKey(player)) ?? getPlayerColor(player, index)
        return getPlayerColor(player, index)
    }
}

export function getLegendIcon(player: any, color: string, pmcIdx?: number): JSX.Element {
    const kind = getParticipantKind(player)
    if (kind !== 'other') {
        const label = kind === 'scav' ? '' : String(pmcIdx ?? (kind === 'player' ? 'P' : ''))
        return <span style={{ width: '20px', height: '20px', marginRight: '6px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            dangerouslySetInnerHTML={{ __html: participantMarkerHtml(kind, color, label, kind === 'scav' ? 15 : 20) }} />
    }
    const label = getMarkerLabel(player)
    if (label === 'BTR_ICON') {
        return <span style={{ width: '24px', height: '18px', marginRight: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg viewBox="0 0 24 18" width="24" height="18" fill="none"><rect x="2" y="3" width="20" height="8" rx="1" fill={color}/><rect x="5" y="1" width="10" height="4" rx="1" fill={color}/><line x1="15" y1="3" x2="20" y2="5" stroke={color} strokeWidth="1.2"/><circle cx="5.5" cy="13.5" r="2.5" fill={color}/><circle cx="12" cy="13.5" r="2.5" fill={color}/><circle cx="18.5" cy="13.5" r="2.5" fill={color}/><circle cx="5.5" cy="13.5" r="1" fill="#1a1a1a"/><circle cx="12" cy="13.5" r="1" fill="#1a1a1a"/><circle cx="18.5" cy="13.5" r="1" fill="#1a1a1a"/></svg></span>
    }
    if (label) {
        return <span style={{ width: '18px', height: '18px', borderRadius: '2px', marginRight: '6px', background: color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold', color: '#fff', textShadow: '0 0 2px rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.6)', flexShrink: 0, lineHeight: 1 }}>{label}</span>
    }
    if (pmcIdx !== undefined) {
        return <span style={{ width: '18px', height: '18px', borderRadius: '50%', marginRight: '6px', background: color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold', color: '#fff', textShadow: '0 0 2px rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.6)', flexShrink: 0, lineHeight: 1 }}>{pmcIdx}</span>
    }
    return <span style={{ width: '10px', height: '10px', minWidth: '10px', minHeight: '10px', borderRadius: '50%', marginRight: '6px', background: color, border: '1px solid rgba(255,255,255,0.4)', flexShrink: 0, display: 'inline-block' }}></span>
}

/**
 * Extracts the specific role of a faction-mod bot from its type name.
 * e.g. "REMNANT RIFLEMAN|RUAF" → "Rifleman", "UNTAR SQUAD LEADER|UNTAR" → "Squad Leader"
 * Returns '' if the bot has no recognizable faction role.
 */
export function getFactionRole(player: any): string {
    if (isRaiderHunter(player)) return 'Raider (Hunter)'
    const typeName = ((player?.type || '') as string).split('|')[0]
    if (!typeName) return ''
    // Strip the known faction prefix (longest first so "BLACK DIV" matches before "BLACK")
    const prefixes = ['BLACK DIV', 'RUAF', 'REMNANT', 'UNTAR', 'MERCENARY', 'ISB']
    let role = typeName
    for (const p of prefixes) {
        if (typeName === p) { role = typeName; break }
        if (typeName.startsWith(p + ' ')) { role = typeName.slice(p.length + 1); break }
    }
    // Combine-mod roles have no space separator (e.g. COMBINESOLDIER), so strip the prefix to read "Soldier".
    if (role.startsWith('COMBINE') && role.length > 'COMBINE'.length) role = role.slice('COMBINE'.length)
    return role.toLowerCase().split(' ').filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function getPlayerFaction(player: any): string {
    if (player === undefined) return 'Unknown'
    const type = resolveBotType(player)
    if (type === 'ISB_WT') return 'ISB WT'
    if (type === 'ISB') return 'ISB'

    if (player.team === 'Usec' || player.team === 'Bear') return 'PMC'
    if (player.type === 'PLAYER' && player.team === 'Savage') return 'Player Scav'
    if (player.type === 'HUMAN') return 'PMC'

    switch (type) {
        case 'SCAV': return 'Scav'
        case 'BOSS': return 'Boss'
        case 'ROGUE': return 'Rogue'
        case 'FOLLOWER': return 'Follower'
        case 'BLOODHOUND': return 'Bloodhound'
        case 'RAIDER': return 'Raider'
        case 'PLAYER_SCAV': return 'Player Scav'
        case 'SNIPER': return 'Sniper'
        case 'GOON': return 'Goon'
        case 'CULT': return 'Cultist'
        case 'OTHER': return 'Other'
        case 'MERCENARY': return 'Mercenary'
        case 'RUAF': return 'RUAF'
        case 'UNTAR': return 'UNTAR'
        case 'BLACKDIV': return 'Black Div'
        case 'COMBINE': return 'Combine'
        case 'INFECTED': return 'Infected'
        default: return 'Unknown'
    }
}

export function buildPmcIndexMap(players: any[]): Record<string, number> {
    const map: Record<string, number> = {}
    const groupCounters: Record<string, number> = {}
    for (const p of players) {
        if (resolveIsbCategory(p)) continue
        const isPMC = getParticipantKind(p) === 'pmc'
        const isHuman = isHumanPlayer(p)
        if (isPMC || isHuman) {
            const group = playerGroupKey(p)
            if (groupCounters[group] === undefined) groupCounters[group] = 0
            groupCounters[group]++
            map[p.profileId] = groupCounters[group]
        }
    }
    return map
}
