import { isPbtCheater, pbtDescription, PbtParticipant } from '../helpers/pbtCheaters'
import './PbtCheaterBadge.css'

export default function PbtCheaterBadge({ player }: { player: PbtParticipant }) {
    return isPbtCheater(player)
        ? <span className="rr-pbt-badge" title={pbtDescription(player)}>PBT cheater</span> : null
}

export function PbtCheaterDetails({ player }: { player: PbtParticipant }) {
    return isPbtCheater(player) ? <div className="rr-pbt-details">{pbtDescription(player)}</div> : null
}
