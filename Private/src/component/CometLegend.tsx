import { CometSymbol, symbolText } from '../helpers/cometPresentation'

const labels: Record<CometSymbol, string> = {
    move: 'Move / evade', hold: 'Hold / bait', fire: 'Fire / suppress',
    reload: 'Reload / weapon', medical: 'Heal / recover', grenade: 'Grenade / escape',
    door: 'Door action', look: 'Peek / watch', light: 'Lights / lasers', voice: 'Voice calls', quiet: 'Quiet approach',
}

export default function CometLegend() {
    return <section className="rr-comet-legend" aria-label="COMET intervention legend">
        <strong>COMET intervention</strong>
        <div className="rr-comet-legend-signals">
            <span><b>✦</b> Active intervention</span>
            <span><b>!</b> Visual contact</span>
            <span><b>?</b> Heard movement</span>
        </div>
        <div className="rr-comet-legend-grid">
            {(Object.keys(symbolText) as CometSymbol[]).map(key => <span key={key}><b>{symbolText[key]}</b> {labels[key]}</span>)}
        </div>
        <p>Squad labels show each member's role. <strong>Plan</strong> = not yet confirmed.</p>
    </section>
}
