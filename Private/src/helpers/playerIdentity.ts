type Participant = { profileId: string, type?: string, mod_SAIN_brain?: string | null }

// Recording ownership is separate from being human: only the owner inherits the
// raid's exit result, but every co-op human gets PLAYER labels (including old raids).
export function isHumanPlayer(player: Participant, recordingOwnerId?: string): boolean {
    return player.type === 'HUMAN' || player.mod_SAIN_brain === 'PLAYER'
        || (!!recordingOwnerId && player.profileId === recordingOwnerId)
}
