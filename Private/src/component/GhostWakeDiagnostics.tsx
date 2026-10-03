import { useEffect, useMemo, useState } from 'react'
import api from '../api/api'
import { GhostWake, wakeCauseLabels } from '../helpers/ghostWakes'
import { msToHMS } from '../helpers'

export default function GhostWakeDiagnostics({ raidId }: { raidId: string }) {
    const [wakes, setWakes] = useState<GhostWake[] | null>(null)
    const [status, setStatus] = useState('Loading Ghost wake diagnostics...')
    const [filter, setFilter] = useState('')
    const [page, setPage] = useState(0)
    useEffect(() => {
        const controller = new AbortController()
        setWakes(null); setPage(0); setFilter(''); setStatus('Loading Ghost wake diagnostics...')
        api.getRaidOrbitGhostWakes(raidId, controller.signal).then(data => {
            if (controller.signal.aborted) return
            setWakes(data)
            setStatus(data === null ? 'Update the Raid Review server to view wake diagnostics.'
                : data.length === 0 ? 'No recorded wakes. Older ORBIT clients and older raids do not contain this data.' : '')
        }).catch(() => { if (!controller.signal.aborted) setStatus('Could not load wake diagnostics. Reload to retry.') })
        return () => controller.abort()
    }, [raidId])
    const filtered = useMemo(() => {
        const query = filter.trim().toLocaleLowerCase()
        return (wakes || []).filter(w => `${w.name} ${w.profileId} ${w.triggerName} ${w.triggerProfileId} ${w.cause} ${wakeCauseLabels[w.cause] || ''}`.toLocaleLowerCase().includes(query))
    }, [wakes, filter])
    const pages = Math.max(1, Math.ceil(filtered.length / 50))
    const currentPage = Math.min(page, pages - 1)
    return <details className="mb-4 text-eft" style={{ border: '1px solid #514a3b', borderRadius: 5, padding: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Ghost wake diagnostics {wakes?.length ? `(${wakes.length})` : ''}</summary>
        <p style={{ fontSize: 12, opacity: .75, margin: '10px 0' }}>Actual wake causes recorded by ORBIT. Each squad member has a row; the trigger and distance refer to the member that caused the group to wake. This does not explain bots that never entered Ghost.</p>
        {status && <p role="status">{status}</p>}
        {!!wakes?.length && <>
            <label>Filter bot, trigger or cause <input aria-label="Filter Ghost wakes" value={filter} onChange={e => { setFilter(e.target.value); setPage(0) }} style={{ margin: '0 8px 12px', color: '#ddd', background: '#171717', padding: 5, border: '1px solid #514a3b' }} /></label>
            <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', fontSize: 12, textAlign: 'left' }}>
                <thead><tr>{['Time', 'Bot', 'Cause', 'Trigger', 'Distance', 'Details'].map(label => <th key={label} style={{ padding: 6 }}>{label}</th>)}</tr></thead>
                <tbody>{filtered.slice(currentPage * 50, currentPage * 50 + 50).map(w => <tr key={w.id} style={{ borderTop: '1px solid #302e29' }}>
                    <td style={{ padding: 6, whiteSpace: 'nowrap' }}>{msToHMS(w.time)}</td>
                    <td title={w.profileId} style={{ padding: 6 }}>{w.name || w.profileId}</td>
                    <td style={{ padding: 6 }}>{wakeCauseLabels[w.cause] || w.cause}</td>
                    <td title={w.triggerProfileId} style={{ padding: 6 }}>{w.triggerName || w.triggerProfileId || 'Not recorded'}</td>
                    <td style={{ padding: 6 }}>{w.distance >= 0 ? `${w.distance.toFixed(1)} m` : 'N/A'}</td>
                    <td title={w.memberProfileId ? `Triggering member: ${w.memberProfileId}` : ''} style={{ padding: 6 }}>{w.detail}</td>
                </tr>)}</tbody>
            </table></div>
            {filtered.length === 0 && <p>No matching wakes.</p>}
            <div className="flex gap-3 mt-3" style={{ alignItems: 'center', fontSize: 12 }}>
                <button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button>
                <span>{currentPage + 1} / {pages} ({filtered.length} wakes)</span>
                <button disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Next</button>
            </div>
        </>}
    </details>
}
