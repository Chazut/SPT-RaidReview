import BotMapping from '../assets/botMapping.json'
import { resolveIsbCategory } from './isb'
import { isHumanPlayer, playerGroupKey } from './playerIdentity'
import { squadColor } from './groupColors'
import { participantMarkerHtml, ParticipantKind } from './participantMarkers'
import { DEFAULT_PLAYER_COLOR, readPlayerColor } from './playerColor'

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

    const roleLabels: Record<string, string> = { BOSS: 'B', FOLLOWER: 'Gd', GOON: 'G', RAIDER: 'Rd',
        ROGUE: 'Rg', CULT: 'Cu', BLOODHOUND: 'Bh', SNIPER: 'Sn', INFECTED: 'If' }
    return roleLabels[resolveBotType(player)] ?? null
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

export function getPlayerColor(player: any, index: number, playerColor = DEFAULT_PLAYER_COLOR): string {
    if (player === undefined) return '#999'
    if (isHumanPlayer(player)) return playerColor

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
    // Recorded PMCs use PMC|USEC or PMC|BEAR: the resolved suffix is their side.
    if (type === 'PMC' || type === 'USEC' || type === 'BEAR'
        || (type === 'UNKNOWN' && (player.type === 'PMC' || player.team === 'Usec' || player.team === 'Bear'))) return 'pmc'
    return 'other'
}

// Always use the full recording roster, never just the visible/alive participants.
// Sorting group keys keeps colors identical across pages, filters and reloads.
export function createPlayerColorResolver(players: any[] = [], recordingOwnerId?: string, playerColor = readPlayerColor()): (player: any, index: number) => string {
    const groups = [...new Set(players.filter(p => getParticipantKind(p) === 'pmc' && !isHumanPlayer(p, recordingOwnerId))
        .map(p => playerGroupKey(p)))].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
    const colors = new Map<string, string>()
    const used = new Set([playerColor.toUpperCase(), ...players.filter(p => getParticipantKind(p) !== 'pmc')
        .map((p, i) => getPlayerColor(p, i, playerColor).toUpperCase())])
    let slot = 0
    for (const group of groups) {
        let color = squadColor(slot++)
        while (used.has(color)) color = squadColor(slot++)
        used.add(color)
        colors.set(group, color)
    }
    return (player, index) => {
        if (player && isHumanPlayer(player, recordingOwnerId)) return playerColor
        if (getParticipantKind(player) === 'pmc') return colors.get(playerGroupKey(player)) ?? getPlayerColor(player, index, playerColor)
        return getPlayerColor(player, index, playerColor)
    }
}

export function getParticipantMarkerHtml(player: any, color: string, memberIndex?: number,
    size = 20, hpPercent = 100, behaviorColor?: string | null, opacity = 1): string {
    const kind = getParticipantKind(player)
    const label = kind === 'other' ? getMarkerLabel(player) ?? '?'
        : kind === 'scav' ? '' : String(memberIndex ?? (kind === 'player' ? 'P' : ''))
    return participantMarkerHtml(kind, color, label, size, hpPercent, behaviorColor, opacity)
}

export function getLegendIcon(player: any, color: string, pmcIdx?: number): JSX.Element {
    return <span style={{ width: '20px', height: '20px', marginRight: '6px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        dangerouslySetInnerHTML={{ __html: getParticipantMarkerHtml(player, color, pmcIdx) }} />
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
