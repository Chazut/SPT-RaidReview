// COMET labels describe intent; these SAIN actions execute that intent. Keep
// auxiliary observations visible without treating unrelated owners as COMET.
export function cometActionMatches(sample = '', action = ''): boolean {
    if (!sample || !action) return false
    const native = sample.replace(/^SAIN:/, '')
    if (!sample.startsWith('COMET:')) return native === action
    const label = sample.slice(6)
    if (label === action) return true
    const aliases: Record<string, string[]> = {
        Hold: ['Freeze'], Shoot: ['StandAndShoot'], KeepAngle: ['StandAndShoot'],
        Push: ['RushEnemy'], ContinuePush: ['RushEnemy'], Search: ['Search'],
        Cover: ['SeekCover'], FallBack: ['Retreat'], Flank: ['ShiftCover'], Grenade: ['ThrowGrenade'],
    }
    return aliases[label]?.includes(action) === true || (label.startsWith('Crossfire') && action === 'Freeze')
}
