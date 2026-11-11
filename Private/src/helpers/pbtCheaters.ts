import { isHumanPlayer } from './playerIdentity'

export type PbtParticipant = {
    profileId: string, type?: string, mod_SAIN_brain?: string | null,
    mod_PBT_cheater?: unknown, mod_PBT_personality?: unknown, mod_PBT_cheats?: unknown,
}

export function isPbtCheater(player: PbtParticipant | null | undefined): boolean {
    if (!player || isHumanPlayer(player)) return false
    const flag = player.mod_PBT_cheater
    return flag === true || flag === 1 || flag === '1' || flag === 'true' || flag === 'True'
}

const text = (value: unknown) => typeof value === 'string' ? value.slice(0, 512).trim() : ''
const cheatLabels: Record<string, string> = {
    Aimbot: 'Aimbot', Godmode: 'Invulnerability', Speedhack: 'Speedhack', Spinbot: 'Spinbot',
    BunnyHop: 'Bunny hop', FightTeleport: 'Combat teleport', Fly: 'Flying', Vacuum: 'Loot vacuum',
    Stalker: 'Stalker', VoiceSpam: 'Voice spam', Esp: 'ESP', None: 'None', Unknown: 'Unknown cheat',
}

// Recorded assignments, not proof that each cheat was used at this replay time.
export function pbtDescription(player: PbtParticipant | null | undefined): string {
    if (!isPbtCheater(player)) return ''
    const personality = text(player!.mod_PBT_personality) || 'Not recorded'
    const cheats = [...new Set(text(player!.mod_PBT_cheats).split(',').map(x => x.trim()).filter(Boolean))]
        .slice(0, 32).map(x => cheatLabels[x] || x).join(', ') || 'Not recorded'
    return `PBT cheater\nPBT personality: ${personality}\nAssigned cheats: ${cheats}`
}

export function pbtMarkerHtml(player: PbtParticipant | null | undefined): string {
    return isPbtCheater(player)
        ? '<span class="rr-pbt-marker" title="PBT cheater" aria-label="PBT cheater">C</span>' : ''
}
