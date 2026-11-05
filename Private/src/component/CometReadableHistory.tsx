import { useMemo, useState, useEffect } from 'react'
import { useCometMapEvents } from './useCometMapEvents'
import { cometEpisodes } from '../helpers/cometPresentation'
import { cometReason } from '../helpers/cometMap'
import { formatDecisionLabel } from '../helpers/botBehavior'

const time = (ms: number) => `${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`
export default function CometReadableHistory({raidId,names}:{raidId:string;names:Record<string,string>}) {
    const [bot,setBot]=useState('')
    const [page,setPage]=useState(0)
    useEffect(()=>{setBot('');setPage(0)},[raidId])
    const records=useCometMapEvents(raidId,bot||null,!!bot)
    const episodes=useMemo(()=>cometEpisodes(records[bot]),[records,bot])
    const record=records[bot]
    return <div className="rr-comet-readable">
        <p>Choose a bot to see its decisions and observed actions. Repeated observations are grouped. Debug keeps every event.</p>
        <label>Bot <select aria-label="COMET history bot" value={bot} onChange={e=>{setBot(e.target.value);setPage(0)}}>
            <option value="">Select a bot</option>{Object.entries(names).sort((a,b)=>a[1].localeCompare(b[1])).map(([id,name])=><option key={id} value={id}>{name}</option>)}
        </select></label>
        {record?.status==='loading' && <p role="status">Loading decisions...</p>}
        {record?.status==='error' && <p role="status">Could not load decisions. Select the bot again to retry.</p>}
        {record?.status==='unavailable' && <p>This recording has no COMET event stream.</p>}
        {record?.status==='ready' && episodes.length===0 && <p>No COMET actions were recorded for this participant.</p>}
        {episodes.slice(page*20,page*20+20).map((episode,i)=>{
            const e=episode.event,chosen=e.candidates.find(c=>c.decision===e.decision)
            return <details className="rr-comet-history-entry" key={`${bot}-${episode.start}-${i}`}>
                <summary><time>{time(episode.start)}{episode.end>episode.start?` - ${time(episode.end)}`:''}</time><strong>{episode.title}</strong><span>{episode.status}</span>{chosen?.score!=null&&<span>Score {chosen.score.toFixed(1)}</span>}</summary>
                <p>{cometReason(e.choiceReason||e.reason)}</p>
                {e.contact&&<p>Known contact: {names[e.contact.target||'']||'unnamed'} · {cometReason(e.contact.source||'unknown source')}{e.contact.age!=null?` · ${e.contact.age.toFixed(1)} s old at this decision`:''}</p>}
                <ul>{e.candidates.map((c,j)=><li key={j}>{formatDecisionLabel('COMET:'+c.decision)}: {c.eligible?`score ${c.score?.toFixed(1)??'not recorded'}`:'unavailable'} · {cometReason(c.reason)}</li>)}</ul>
                {episode.count>1&&<p className="rr-comet-note">{episode.count} observations grouped. Details above are the last observation in this group.</p>}
                <p className="rr-comet-note">Chosen means accepted as a plan, not proof of success. Use the map to follow execution.</p>
            </details>
        })}
        {episodes.length>20&&<div className="rr-comet-modes"><button disabled={page===0} onClick={()=>setPage(page-1)}>Previous</button><span>{page+1} / {Math.ceil(episodes.length/20)}</span><button disabled={(page+1)*20>=episodes.length} onClick={()=>setPage(page+1)}>Next</button></div>}
    </div>
}
