import { useEffect, useState } from 'react'
import api from '../api/api'
import { parseCounterReports, CounterReport, CounterRow } from '../helpers/cometCounters'

const cell={padding:'6px 9px',borderBottom:'1px solid #302e29',whiteSpace:'nowrap' as const}
const reasons=(r:CounterRow)=>Object.entries(r.reasons).map(([key,n])=>`${key}: ${n}`).join('\n')
export function CometCountersView({ reports }: {reports:CounterReport[]}) {
    return <>{reports.map(report=><div key={report.session}>
        <p>{report.enabled ? (report.complete ? 'Recorded counters complete.' : 'Partial report.') : 'Counter collection was disabled.'} Counts describe recorded opportunities, not every frame or every bot.</p>
        {report.warnings.map(w=><p role="status" key={w} style={{color:'#f0bd70'}}>{w}</p>)}
        {report.enabled&&<>
            <p style={{maxWidth:900}}>Accepted means SAIN accepted a command. Started means COMET observed the corresponding native action. No observed start is not proof of failure: a short action or a recording gap can be missed. Completion is only counted where explicitly observed; it does not mean the tactic won the fight.</p>
            <h4>Actions</h4><div style={{overflowX:'auto'}}><table style={{fontSize:12,textAlign:'left',width:'100%'}}><thead><tr>
                {['Feature / action','Personality','Eligible / examined','Selected','Requested','Accepted','Observed starts','Completed','Released / interrupted','Command refused','No observed start'].map(t=><th style={cell} key={t}>{t}</th>)}
            </tr></thead><tbody>{report.rows.filter(r=>r.kind==='action').map((r,i)=><tr key={i} title={reasons(r)}>
                <td style={cell}>{r.feature} · {r.decision}</td><td style={cell}>{r.personality||'Unknown'}</td><td style={cell}>{r.eligible} / {r.opportunities}</td>
                <td style={cell}>{r.selected}</td><td style={cell}>{r.requested}</td><td style={cell}>{r.accepted}</td>
                <td style={cell}>{r.executionTracked?r.started:'Unknown'}</td><td style={cell}>{r.completionTracked?r.completed:'Unknown'}</td>
                <td style={cell}>{r.released} / {r.interrupted}</td><td style={cell}>{r.commandRefused}</td><td style={cell}>{r.executionTracked?r.selectionWithoutObservedStart:'Unknown'}</td>
            </tr>)}</tbody></table></div>
            <h4>Random draws</h4><p>Expected selections are the sum of the effective probabilities at each recorded draw. A04 is the first choice; A05 is conditional on that choice. Deterministic decisions are excluded from the draw totals. Small samples naturally vary.</p>
            <div style={{overflowX:'auto'}}><table style={{fontSize:12,textAlign:'left',width:'100%'}}><thead><tr>{['Feature / choice','Personality','Draws','Expected selections','Observed selections','Not selected'].map(t=><th style={cell} key={t}>{t}</th>)}</tr></thead>
            <tbody>{report.rows.filter(r=>r.randomTrials>0).map((r,i)=><tr key={i}><td style={cell}>{r.feature} · {r.decision}</td><td style={cell}>{r.personality||'Unknown'}</td><td style={cell}>{r.randomTrials}</td><td style={cell}>{r.expectedSelections.toFixed(2)}</td><td style={cell}>{r.randomSelections}</td><td style={cell}>{r.randomDeclined}</td></tr>)}</tbody></table></div>
            <details style={{marginTop:12}}><summary>Reasons and recording coverage</summary>
                <p>Exact opportunity counts currently cover A01/A02 choices, A04/A05 draws and D05/D06 feints. Features without a stable opportunity identity only report event coverage. No events does not mean zero opportunities.</p>
                {report.rows.filter(r=>Object.keys(r.reasons).length).map((r,i)=><p key={i}>{r.feature} · {r.decision} · {r.personality}: {Object.entries(r.reasons).map(([k,n])=>`${k}: ${n}`).join('; ')}</p>)}
                {report.coverage.map(c=><p key={c.feature}>{c.feature}: {c.events} events · {c.exactOpportunities?'identifiable opportunities observed':'event coverage only'}</p>)}
            </details>
        </>}
    </div>)}</>
}
export default function CometCountersSummary({raidId}:{raidId:string}) {
    const [open,setOpen]=useState(false),[reports,setReports]=useState<CounterReport[]>([]),[status,setStatus]=useState('')
    useEffect(()=>{
        if(!open)return
        const controller=new AbortController();setReports([]);setStatus('Loading raid counters...')
        api.getCometSummaries(raidId,controller.signal).then(data=>{
            if(controller.signal.aborted)return
            const parsed=parseCounterReports(data?.events);setReports(parsed)
            setStatus(parsed.length?'':'No T02 summary recorded. It is available after raid cleanup with counter collection enabled.')
        }).catch(()=>{if(!controller.signal.aborted)setStatus('Could not load counters. Close and reopen to retry.')})
        return()=>controller.abort()
    },[raidId,open])
    return <details onToggle={e=>{if(e.target===e.currentTarget)setOpen(e.currentTarget.open)}} style={{border:'1px solid #514a3b',padding:12,margin:'12px 0'}}>
        <summary style={{cursor:'pointer',fontWeight:600}}>COMET raid counters</summary>{status&&<p role="status">{status}</p>}<CometCountersView reports={reports}/>
    </details>
}
