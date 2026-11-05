import { useMemo } from 'react'
import { CometMapRecord, cometMapState, cometTooltipHtml } from '../helpers/cometMap'
import { CometMode, cometPresentation, symbolText } from '../helpers/cometPresentation'
import './CometReplayPanel.css'

export function CometModePicker({ mode, onChange }: { mode: CometMode; onChange: (mode: CometMode) => void }) {
    return <div className="rr-comet-modes" role="group" aria-label="COMET detail level">
        <button type="button" aria-pressed={mode === 'simple'} onClick={() => onChange('simple')}>Simple</button>
        <button type="button" aria-pressed={mode === 'debug'} onClick={() => onChange('debug')}>Debug</button>
    </div>
}
type Props = {
    name: string; record?: CometMapRecord; time: number; decision?: string; sampledAt: number; ghost: boolean;
    names: Record<string, string>; mode: CometMode; setMode: (mode: CometMode) => void;
    available: boolean; showDestination: boolean; setShowDestination: (show: boolean) => void; onClose: () => void;
}
export default function CometReplayPanel(props: Props) {
    const { name, record, time, decision, sampledAt, ghost, names, mode, setMode, available } = props
    const state = useMemo(() => cometMapState(record, time, decision, sampledAt, ghost), [record, time, decision, sampledAt, ghost])
    const view = useMemo(() => cometPresentation(record, time, decision, sampledAt, ghost, names, state), [record, time, decision, sampledAt, ghost, names, state])
    const debug = useMemo(() => mode === 'debug' && available ? cometTooltipHtml(state, record, time, names) : '', [mode, available, state, record, time, names])
    return <section className="rr-comet-panel" aria-label="Selected bot decisions">
        <div className="rr-comet-panel-head"><h3>{name}</h3><button type="button" aria-label="Close bot details" onClick={props.onClose}>×</button></div>
        <CometModePicker mode={mode} onChange={setMode} />
        {!available ? <p className="rr-comet-note">This participant is not present at this replay time.</p> : <>
            <p className="rr-comet-owner">Current behavior: <strong>{view.owner}</strong></p>
            <h4>{view.symbol && <span aria-hidden="true">{symbolText[view.symbol]} </span>}{view.title}</h4>
            <div className="rr-comet-note">{view.status}</div>
            {view.reason && <p>{view.reason}</p>}
            {view.contact && <p className="rr-comet-note">{view.contact}</p>}
            {view.signal && <p className="rr-comet-cue">{view.signal.glyph} {view.signal.title}</p>}
            {view.score !== null && <>
                <div className="rr-comet-score"><span>Decision score</span><strong>{view.score.toFixed(1)}</strong></div>
                <div className="rr-comet-note">Score at selection, not a success probability.</div>
                {view.factors.length > 0 && <ul>{view.factors.slice(0,3).map(f=><li key={f.label}>{f.label}: {f.delta>0?'+':''}{f.delta.toFixed(1)}</li>)}</ul>}
            </>}
            {view.selection && <p>{view.selection}</p>}
            {view.alternatives.length > 0 && <details className="rr-comet-options">
                <summary>Other options &amp; score details</summary>
                {view.alternatives.map((a,i)=><div className="rr-comet-option" key={i}><strong>{a.label}</strong><span>{a.eligible ? `Score ${a.score?.toFixed(1) ?? '?'}` : 'Rejected'}</span><small>{a.reason}</small></div>)}
                {view.factors.length > 3 && <ul>{view.factors.slice(3).map(f=><li key={f.label}>{f.label}: {f.delta>0?'+':''}{f.delta.toFixed(1)}</li>)}</ul>}
            </details>}
            {view.interventions.length > 0 && <details className="rr-comet-options"><summary>COMET interventions ({view.interventions.length})</summary>
                {view.interventions.map((a,i)=><div className="rr-comet-option" key={i}><strong>{symbolText[a.symbol]} {a.title}</strong><small>{a.reason}</small></div>)}
            </details>}
            <label className="rr-comet-destination-toggle"><input type="checkbox" checked={props.showDestination} onChange={e=>props.setShowDestination(e.target.checked)} /> Show selected destination</label>
            <div className="rr-comet-note">Dotted line = recorded destination, not the route.</div>
            {record?.status==='loading' && <p className="rr-comet-note" role="status">Loading COMET details...</p>}
            {record?.status==='error' && <p className="rr-comet-note" role="status">COMET details could not be loaded. Select the bot again to retry.</p>}
            {record?.status==='unavailable' && <p className="rr-comet-note">This recording has no COMET event stream. Only recorded behavior is shown.</p>}
            {mode==='debug' && <details className="rr-comet-debug" open><summary>Full diagnostics at this time</summary><div dangerouslySetInnerHTML={{__html:debug}} /></details>}
        </>}
    </section>
}
