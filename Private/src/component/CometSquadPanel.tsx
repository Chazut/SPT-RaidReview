import { useMemo, useState } from 'react'
import { CometMapRecord, cometReason } from '../helpers/cometMap'
import { MemberSample, SquadMember, SquadRoleView, buildSquadHistory, recentSquadHistory } from '../helpers/cometSquad'
import { CometMode, cometPresentation, symbolText } from '../helpers/cometPresentation'

type Props = {
    members: SquadMember[]; records: Record<string, CometMapRecord>; roles: SquadRoleView[];
    samples: Record<string, MemberSample>; time: number; names: Record<string,string>; mode: CometMode;
    onSeek: (time: number, profileId: string) => void; onSelect: (profileId: string) => void; selectedProfileId: string;
}
export const replayClock = (ms: number) => `${Math.floor(ms/60000).toString().padStart(2,'0')}:${(ms/1000%60).toFixed(1).padStart(4,'0')}`
export default function CometSquadPanel({ members, records, roles, samples, time, names, mode, onSeek, onSelect, selectedProfileId }: Props) {
    const [tacticsOnly, setTacticsOnly] = useState(true)
    const indexed = useMemo(() => buildSquadHistory(members, records), [members, records])
    const filtered = useMemo(() => tacticsOnly ? indexed.filter(e => !!e.event.crossfire) : indexed, [indexed, tacticsOnly])
    const recent = useMemo(() => recentSquadHistory(filtered, time, mode === 'simple' ? 5 : 12), [filtered, time, mode])
    const actions = useMemo(() => members.map(member => {
        const sample = samples[member.profileId]
        const ghost = !!(sample?.ghost || sample?.dormant)
        return { member, sample, ghost, view: sample?.present
            ? cometPresentation(records[member.profileId], time, sample.decision, sample.time || 0, ghost, names)
            : null }
    }), [members, samples, records, time, names])
    const plans = [...new Set(roles.map(r => r.plan))].map(id => roles.filter(r => r.plan === id))
    const loading = members.some(m => !records[m.profileId] || records[m.profileId].status === 'loading')
    const missing = members.filter(m => records[m.profileId]?.status === 'error' || records[m.profileId]?.status === 'unavailable')
    return <div className="rr-comet-squad" role="tabpanel" aria-label="Squad tactic">
        <p className="rr-comet-note">{members.length > 1 ? `Squad ${members[0].group} · ${members.length} members` : 'Solo participant'}</p>
        {loading && <p role="status" className="rr-comet-note">Loading squad events...</p>}
        {!!missing.length && <p role="status" className="rr-comet-note">Incomplete recording: no COMET details for {missing.map(m=>m.name).join(', ')}. Select another squad and return to retry a failed load.</p>}
        {!plans.length && <p className="rr-comet-note">No shared tactic recorded.</p>}
        {plans.map(plan => <div className="rr-comet-plan" key={plan[0].plan}>
            <strong>{plan[0].title}</strong>
            <div className="rr-comet-note">{plan.some(r=>r.confirmed) ? 'In progress' : 'Preparing · execution not yet confirmed'}</div>
            <details className="rr-comet-options" key={`${plan[0].plan}-${mode}`} open={mode==='debug'}><summary>Tactic details</summary>
            {plan[0].target && <p>Known contact: {names[plan[0].target] || 'Unidentified contact'}</p>}
            <p className="rr-comet-note">{plan[0].reason}</p>
            {plan[0].event.crossfire?.storm && <p className="rr-comet-note">Vulnerability score: {plan[0].event.crossfire.storm.score.toFixed(2)} / {plan[0].event.crossfire.storm.threshold.toFixed(2)} required</p>}
            </details>
        </div>)}
        <div className="rr-comet-members" aria-label="Current actions of squad members">
            {actions.map(({member, sample, view}) => {
                const r = roles.find(role=>role.member.profileId===member.profileId)
                return <button type="button" key={member.profileId} aria-pressed={selectedProfileId===member.profileId} onClick={()=>onSelect(member.profileId)}>
                    <span className="rr-comet-member-heading"><strong>{member.name}</strong>{view && <small>{view.owner}</small>}</span>
                    <span className="rr-comet-member-action">{!sample?.present ? 'Not present' : view && <>{view.symbol && `${symbolText[view.symbol]} `}{view.title}</>}</span>
                    {view && r && <span>Squad: {r.role} · {r.status}</span>}
                    {view && view.status && (mode==='debug' || !['In progress','Current behavior'].includes(view.status)) && <span>{view.status}</span>}
                </button>
            })}
        </div>
        <details className="rr-comet-options" key={`squad-history-${mode}`} open={mode==='debug'}><summary>Recent squad events</summary>
        <div className="rr-comet-modes rr-comet-history-filter" aria-label="Squad history filter">
            <button type="button" aria-pressed={tacticsOnly} onClick={()=>setTacticsOnly(true)}>Squad tactics</button>
            <button type="button" aria-pressed={!tacticsOnly} onClick={()=>setTacticsOnly(false)}>All actions</button>
        </div>
        <p className="rr-comet-note">Click an event to replay it.</p>
        {!recent.length && <p className="rr-comet-note">{tacticsOnly ? 'No squad tactic recorded yet. All actions also includes individual COMET actions by squad members.' : 'No COMET events recorded yet.'}</p>}
        <ol className="rr-comet-recent">
            {recent.map(e => <li key={`${e.profileId}:${e.event.id}:${e.start}`}>
                <button type="button" onClick={()=>onSeek(e.start,e.profileId)}>
                    <time>{replayClock(e.start)}</time><strong>{e.name}</strong>
                    <span>{e.title}</span><small>{e.status}</small>
                </button>
                {mode==='debug' && <div className="rr-comet-note">{cometReason(e.event.crossfire?.reason || e.event.reason)}</div>}
                {mode==='debug' && <details><summary>Recorded event</summary><pre>{JSON.stringify({feature:e.event.feature,stage:e.event.stage,sequence:e.event.sequence,reason:e.event.reason,crossfire:e.event.crossfire,candidates:e.event.candidates},null,2)}</pre></details>}
            </li>)}
        </ol>
        </details>
    </div>
}
