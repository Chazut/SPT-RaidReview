import {useEffect,useState} from 'react'
import api from '../api/api'
import {parseJournalReports,groupJournalRows,JournalReport} from '../helpers/cometJournal'

const cell={padding:'6px 9px',borderBottom:'1px solid #302e29',whiteSpace:'nowrap' as const}
export function CometJournalView({reports}:{reports:JournalReport[]}) {
    const [controlGroup,setControlGroup]=useState('PMC')
    const [group,setGroup]=useState('PMC'),[filter,setFilter]=useState(''),[page,setPage]=useState(0)
    const tables=reports.map(report=>({report,all:groupJournalRows(report,report.feature==='T04'?controlGroup:group,filter)}))
    const pageCount=Math.max(1,...tables.map(t=>Math.ceil(t.all.length/25)))
    const currentPage=Math.min(page,pageCount-1)
    return <>
        <p>Observed combat events, grouped by the action in progress. A kill or death during an action does not prove that action caused it. Time is sampled; unobserved gaps are excluded. Damage to remote Fika players can be missing from the host. Downed players are not counted as confirmed deaths.</p>
        <label>Group combat stats by <select value={group} onChange={e=>{setGroup(e.target.value);setPage(0)}} style={{background:'#171717',color:'inherit',margin:8}}>{['PMC','Action','Personality'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Find <input aria-label="Filter combat report" value={filter} onChange={e=>{setFilter(e.target.value);setPage(0)}} style={{background:'#171717',color:'inherit',padding:5}}/></label>
        {tables.map(({report,all})=>{
            const visible=all.slice(currentPage*25,currentPage*25+25)
            const fields=report.feature==='T01'?[['seconds','Sampled time (s)'],['hitsDealt','Hits dealt'],['damageDealt','Damage dealt'],['hitsTaken','Hits taken'],['damageTaken','Damage taken'],['kills','Kills'],['deaths','Deaths'],['contacts','Contact starts']]:report.feature==='T04'?[['seconds','Observed time (s)'],['waitSeconds','Pending time (s)'],['takeovers','Takeovers'],['takeoverSeconds','Total takeover delay (s)'],['returns','Combat returns'],['freshThreatReturns','With fresh threat'],['incidents','Possible loops'],['longWaits','Long waits'],['residuals','Residual records']]:[['requests','Requests'],['accepted','Accepted'],['refused','Refused'],['observed','Actual changes'],['inHands','Requested weapon seen'],['ready','Ready'],['unconfirmed','Unconfirmed'],['interrupted','Superseded'],['incidents','Possible loops']]
            return <div key={report.feature+report.session}><h4>{report.feature==='T01'?'Combat journal':report.feature==='T04'?'Control transitions':'Weapon changes'}</h4>
                <p>{!report.enabled?'Collection disabled.':report.complete?'Recorded report complete.':'Partial report.'}</p>
                {report.warnings.map(w=><p role="status" key={w} style={{color:'#f0bd70'}}>{w}</p>)}
                {report.feature==='T04'&&<p>Observed layers and execution are separate. Long waits and repeated transitions are review hints, not proof of a bug. Fresh-threat returns and startup/wake transitions do not trigger loop incidents. </p>}
                {report.feature==='T04'&&<label>Group transitions by <select aria-label="Group transitions by" value={controlGroup} onChange={e=>{setControlGroup(e.target.value);setPage(0)}} style={{background:'#171717',color:'inherit',margin:8}}><option>PMC</option><option>Owner / context</option></select></label>}
                {report.feature==='T03'&&<p>A possible loop means repeated observed reversals. It can be legitimate: inspect the T03 events for weapon names, ammunition, failures, readiness and combat context.</p>}
                {report.enabled&&<><div style={{overflowX:'auto'}}><table style={{fontSize:12,textAlign:'left',width:'100%'}}><thead><tr><th style={cell}>{report.feature==='T03'?'PMC':report.feature==='T04'?controlGroup:group}</th>{fields.map(([k,l])=><th style={cell} key={k}>{l}</th>)}</tr></thead><tbody>{visible.map((r,i)=><tr key={i}><td style={cell}>{r.label}</td>{fields.map(([k])=><td style={cell} key={k}>{Number(r[k]??0).toLocaleString(undefined,{maximumFractionDigits:1})}</td>)}</tr>)}</tbody></table></div><p>{all.length} rows{all.length>25&&' · 25 per page'}</p></>}
            </div>
        })}
        {pageCount>1&&<><button disabled={currentPage===0} onClick={()=>setPage(Math.max(0,currentPage-1))}>Previous</button> <span>Page {currentPage+1} of {pageCount}</span> <button disabled={currentPage+1>=pageCount} onClick={()=>setPage(currentPage+1)}>Next</button></>}
    </>
}
export default function CometJournalSummary({raidId}:{raidId:string}) {
    const [open,setOpen]=useState(false),[reports,setReports]=useState<JournalReport[]>([]),[status,setStatus]=useState('')
    useEffect(()=>{
        if(!open)return
        const controller=new AbortController();setReports([]);setStatus('Loading combat, weapon and control reports...')
        Promise.all(['T01','T03','T04'].map(f=>api.getCometJournal(raidId,f,controller.signal))).then(data=>{
            if(controller.signal.aborted)return
            const parsed=parseJournalReports(data.flatMap(x=>x?.events??[]));setReports(parsed)
            setStatus(parsed.length?'':'No journal summary recorded. Reports are available after raid cleanup with the journal enabled.')
        }).catch(()=>{if(!controller.signal.aborted)setStatus('Could not load reports. Close and reopen to retry.')})
        return()=>controller.abort()
    },[raidId,open])
    return <details onToggle={e=>{if(e.target===e.currentTarget)setOpen(e.currentTarget.open)}} style={{border:'1px solid #514a3b',padding:12,margin:'12px 0'}}><summary style={{cursor:'pointer',fontWeight:600}}>COMET combat, weapon and control report</summary>{status&&<p role="status">{status}</p>}<CometJournalView key={raidId} reports={reports}/></details>
}
