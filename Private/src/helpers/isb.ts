type IsbRole = { category: 'ISB' | 'ISB_WT', name: string }

// Explicit role metadata, including names recorded by older clients. Never classify by nickname.
const roles = new Map<string, IsbRole>()
const otherIsb: IsbRole = { category: 'ISB', name: '' }
function add(id: number, wildtype: string, name: string, whiteTusk = false, aliases: string[] = []) {
    const role: IsbRole = { category: whiteTusk ? 'ISB_WT' : 'ISB', name }
    for (const key of [String(id), wildtype, name, ...aliases]) roles.set(key.toUpperCase(), role)
}

add(13701, 'ISBSpecialForces', 'ISB Operative', false, ['ISB SPECIAL FORCES', 'ISB Operator'])
add(13702, 'ISBBossFirefly', 'ISB March One', true, ['ISBFirefly', 'ISB FIREFLY'])
add(13703, 'ISBFollowerVipper', 'ISB March Two', true, ['ISBFireflyFollowerVipper', 'ISB FIREFLY VIPPER'])
add(13704, 'ISBFollowerLoghan', 'ISB March Three', true, ['ISBFireflyFollowerLoghan', 'ISB FIREFLY LOGHAN'])
add(13705, 'ISBFollowerSpearthrower', 'ISB March Four', true, ['ISBFireflyShielder01', 'ISB FIREFLY SHIELDER 1'])
add(13706, 'ISBBerserker', 'ISB March Five', true, ['ISBFireflyShielder02', 'ISB FIREFLY SHIELDER 2'])
add(13707, 'ISBBossCommander', 'ISB Vengeful Chosen One', true)
add(13708, 'ISBFollowerCommander', 'ISB Vengeful Dark Lord', true)
add(13709, 'ISBTeamLeader', 'ISB Team Leader')
add(13710, 'ISBSecondLeader', 'ISB Specialist', false, ['ISB SECOND LEADER'])
add(13711, 'ISBScout', 'ISB Scout')
add(13712, 'ISBHeavy', 'ISB Heavy')
add(13713, 'ISBAssassin', 'ISB Assassin')
add(13714, 'ISBMarksman', 'ISB Marksman')
add(13715, 'ISBFollowerEvernight', 'ISB March Six', true)
add(13716, 'ISBFollowerNemesis', 'ISB March Seven', true)
roles.set('WHITE TUSK', { category: 'ISB_WT', name: 'White Tusk' })

function resolveIsb(player: any): IsbRole | undefined {
    if (typeof player?.type !== 'string') return undefined
    const [name, category] = player.type.toUpperCase().split('|', 2)
    if (category !== 'ISB' && category !== 'ISB_WT' && category !== 'FACTION_MOD') return undefined
    const role = roles.get(name)
    if (role) return role
    if (category === 'ISB_WT') return roles.get('WHITE TUSK')
    if (category === 'ISB') {
        const sainRole = roles.get((player.mod_SAIN_name || '').trim().toUpperCase())
        return sainRole ?? otherIsb
    }
    return undefined
}

export function resolveIsbCategory(player: any): string | undefined {
    return resolveIsb(player)?.category
}

export function getIsbDisplayName(player: any): string {
    const role = resolveIsb(player)
    return role ? (player.mod_SAIN_name || '').trim() || role.name : ''
}
