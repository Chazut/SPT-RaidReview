import { ReactNode, useMemo } from 'react'
import { CometMapRecord, cometMapState, cometTooltipHtml } from '../helpers/cometMap'
import { CometMode, cometPresentation, cometActionText, symbolText } from '../helpers/cometPresentation'
import './CometReplayPanel.css'
import { buildSquadHistory, recentSquadHistory } from '../helpers/cometSquad'
import { replayClock } from './CometSquadPanel'

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
    profileId: string; tab: 'bot' | 'squad'; setTab: (tab: 'bot' | 'squad') => void; squad: ReactNode;
    onSeek: (time: number, profileId: string) => void;
    identity?: ReactNode;
}
export default function CometReplayPanel(props: Props) {
    const { name, record, time, decision, sampledAt, ghost, names, mode, setMode, available } = props
    const state = useMemo(() => cometMapState(record, time, decision, sampledAt, ghost), [record, time, decision, sampledAt, ghost])
    const view = useMemo(() => cometPresentation(record, time, decision, sampledAt, ghost, names, state), [record, time, decision, sampledAt, ghost, names, state])
    const debug = useMemo(() => mode === 'debug' && available ? cometTooltipHtml(state, record, time, names) : '', [mode, available, state, record, time, names])
    const history = useMemo(() => buildSquadHistory([{profileId:props.profileId,name,kind:'pmc'}], record ? {[props.profileId]:record} : {}), [props.profileId,name,record])
    const recent = useMemo(() => recentSquadHistory(history,time,mode === 'simple' ? 5 : 8), [history,time,mode])
    const detailed = mode === 'debug'
    const interventions = detailed ? view.interventions : view.interventions.filter(a => a.title !== view.title)
    return <section className="rr-comet-panel" aria-label="Selected bot decisions">
        <div className="rr-comet-panel-head"><h3>{name}</h3><button type="button" aria-label="Close bot details" onClick={props.onClose}>×</button></div>
        {props.identity}
        <div className="rr-comet-toolbar"><div className="rr-comet-tabs" role="tablist" aria-label="Replay details">
            <button type="button" role="tab" aria-selected={props.tab==='bot'} onClick={()=>props.setTab('bot')}>Bot</button>
            <button type="button" role="tab" aria-selected={props.tab==='squad'} onClick={()=>props.setTab('squad')}>Squad tactic</button>
        </div>
        <CometModePicker mode={mode} onChange={setMode} /></div>
        {props.tab==='squad' ? props.squad : <div role="tabpanel" aria-label="Bot decisions">
        {!available ? <p className="rr-comet-note">This participant is not present at this replay time.</p> : <>
            <div className="rr-comet-now">
                <div className="rr-comet-now-heading">
                    <h4>{view.symbol && <span aria-hidden="true">{symbolText[view.symbol]} </span>}{view.title}</h4>
                    {view.score !== null && <span className="rr-comet-score" title="Tactical plan score at selection, not a success probability.">{view.plan ? 'Plan score' : 'Score'} <strong>{view.score.toFixed(1)}</strong></span>}
                </div>
                {view.featureTitle && view.featureTitle !== view.title && <div className="rr-comet-action-detail">{view.featureTitle}</div>}
                {view.plan && <div className="rr-comet-note">Plan: {view.plan}</div>}
                {view.movement && <div className="rr-comet-motion" title="Observed posture and speed. This does not identify which mod set them or measure footstep noise.">Observed: {view.movement}</div>}
                <div className="rr-comet-note"><strong>{view.owner}</strong>{view.status && (detailed || view.status !== 'Current behavior') && <> · {view.status}</>}</div>
                {view.reason && <p>{view.reason}</p>}
            </div>
            {view.signal && <p className="rr-comet-cue">{view.signal.glyph} {view.signal.title}</p>}
            {(view.score !== null || view.contact || view.selection || view.alternatives.length > 0) && <details className="rr-comet-options" key={`decision-${mode}`} open={detailed}>
                <summary>{view.plan ? `Why this plan (${view.plan})?` : 'Why this action?'}</summary>
                {view.contact && <p className="rr-comet-note">{view.contact}</p>}
                {view.score !== null && <p className="rr-comet-note">Score at selection, not a success probability.</p>}
                {view.selection && <p>{view.selection}</p>}
                {view.factors.length > 0 && <ul>{view.factors.map(f=><li key={f.label}>{f.label}: {f.delta>0?'+':''}{f.delta.toFixed(1)}</li>)}</ul>}
                {view.alternatives.map((a,i)=><div className="rr-comet-option" key={i}><strong>{a.label}</strong><span>{a.eligible ? `Score ${a.score?.toFixed(1) ?? '?'}` : 'Rejected'}</span><small>{a.reason}</small></div>)}
            </details>}
            {interventions.length > 0 && <details className="rr-comet-options" key={`interventions-${mode}`} open={detailed}>
                <summary>Also doing <span className="rr-comet-inline-actions">{interventions.slice(0,2).map(a=>`${symbolText[a.symbol]} ${a.title}`).join(' · ')}{interventions.length > 2 && ` · +${interventions.length - 2}`}</span></summary>
                {interventions.map((a,i)=><div className="rr-comet-option" key={i}><strong>{symbolText[a.symbol]} {a.title}</strong><small>{a.featureTitle && a.featureTitle !== a.title && <>{a.featureTitle} · </>}{a.reason}</small></div>)}
            </details>}
            <label className="rr-comet-destination-toggle" title="Dotted line to the recorded destination, not the route."><input type="checkbox" checked={props.showDestination} onChange={e=>props.setShowDestination(e.target.checked)} /> Destination line</label>
            {detailed && <div className="rr-comet-note">Dotted line = recorded destination, not the route.</div>}
            {record?.status==='loading' && <p className="rr-comet-note" role="status">Loading COMET details...</p>}
            {record?.status==='error' && <p className="rr-comet-note" role="status">COMET details could not be loaded. Select the bot again to retry.</p>}
            {record?.status==='unavailable' && <p className="rr-comet-note">This recording has no COMET event stream. Only recorded behavior is shown.</p>}
            {mode==='debug' && <details className="rr-comet-debug" open><summary>Full diagnostics at this time</summary><div dangerouslySetInnerHTML={{__html:debug}} /></details>}
        </>}
        <details className="rr-comet-options" key={`history-${mode}`} open={detailed}><summary>Recent COMET actions</summary>
            {!recent.length && <p className="rr-comet-note">No COMET events recorded yet.</p>}
            <ol className="rr-comet-recent">{recent.map(e=><li key={`${e.event.id}:${e.start}`}><button type="button" onClick={()=>props.onSeek(e.start,props.profileId)}><time>{replayClock(e.start)}</time><span>{cometActionText(e)}</span><small>{e.status}</small></button></li>)}</ol>
        </details>
        </div>}
    </section>
}
