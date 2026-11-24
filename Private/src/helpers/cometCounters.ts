export type CounterRow = {
    feature: string; decision: string; personality: string; kind: string;
    opportunities: number; eligible: number; selected: number; randomTrials: number;
    randomSelections: number; expectedSelections: number; randomDeclined: number;
    requested: number; accepted: number; started: number; completed: number;
    interrupted: number; released: number; commandRefused: number;
    selectionWithoutObservedStart: number; executionTracked: boolean; completionTracked: boolean;
    reasons: Record<string, number>;
}
type Coverage = { feature: string; events: number; exactOpportunities: boolean }
export type CounterReport = { session: string; complete: boolean; enabled: boolean; rows: CounterRow[]; coverage: Coverage[]; missing: number; warnings: string[] }
const object = (v: any): v is Record<string, any> => v !== null && typeof v === 'object' && !Array.isArray(v)
const num = (v: any) => typeof v === 'number' && Number.isFinite(v) && v >= 0
const count = (v: any) => num(v) && Number.isSafeInteger(v)
const text = (v: any, max = 96) => typeof v === 'string' && v.length <= max
const fields = ['opportunities','eligible','selected','randomTrials','randomSelections','randomDeclined','requested','accepted','started','completed','interrupted','released','commandRefused','selectionWithoutObservedStart'] as const
function row(v: any): CounterRow | null {
    if (!object(v) || !text(v.feature, 12) || !text(v.decision) || !text(v.personality,40) || !['action','draw'].includes(v.kind)) return null
    if (!fields.every(f=>count(v[f])) || !num(v.expectedSelections) || typeof v.executionTracked !== 'boolean' || typeof v.completionTracked !== 'boolean') return null
    if (v.eligible>v.opportunities || v.randomSelections>v.randomTrials || v.expectedSelections>v.randomTrials+0.000001) return null
    const reasons: Record<string,number> = Object.create(null)
    if (object(v.reasons)) for (const [key,n] of Object.entries(v.reasons).slice(0,9)) if (text(key) && count(n)) reasons[key]=n
    return { ...v, reasons } as CounterRow
}
// Pages belong to one COMET raid, never to the currently selected player.
export function parseCounterReports(events: unknown): CounterReport[] {
    if (!Array.isArray(events)) return []
    const groups = new Map<string, Map<number, any>>()
    for (const event of events) {
        if (!object(event) || event.feature!=='T02' || event.stage!=='summary') continue
        let d: any
        try { d = typeof event.detail==='string' ? JSON.parse(event.detail) : event.detail } catch { continue }
        const p = d?.tacticCounters, session = d?.session ?? event.cometSession
        if (!object(p)||p.version!==1||!text(session,128)||!session||!count(p.part)||!count(p.parts)||p.parts<1||p.parts>40||p.part>=p.parts) continue
        if (!Array.isArray(p.rows)||p.rows.length>8||!Array.isArray(p.coverage)||p.coverage.length>160) continue
        let group = groups.get(session)
        if (!group) { if(groups.size>=4) continue; group=new Map();groups.set(session,group) }
        // Duplicate transport deliveries do not sum the same report twice.
        if (!group.has(p.part)) group.set(p.part,p)
    }
    return [...groups].map(([session,pages])=>{
        const header=pages.get(0),first=header??pages.values().next().value
        const parts=first.parts, valid=[...pages].filter(([part,p])=>part<parts&&p.parts===parts)
        let badRows=0
        const rows: CounterRow[]=[]
        for(const [part,p] of valid.sort((a,b)=>a[0]-b[0])) for(const v of p.rows){const r=row(v);if(r&&part>0)rows.push(r);else badRows++}
        const coverage: Coverage[] = (header?.coverage??[]).filter((c:any)=>object(c)&&text(c.feature,12)&&count(c.events)&&typeof c.exactOpportunities==='boolean')
        const missing=parts-valid.length, warnings:string[]=[]
        if(missing||!header)warnings.push('Some summary pages are missing. These are partial counts.')
        if(badRows)warnings.push('Invalid counter rows were ignored.')
        for(const [key,label] of [['queueDropped','Events lost before analysis'],['capacitySkipped','Observations omitted at the memory limit'],['invalidEvents','Invalid events'],['oversizeEvents','Oversized events']] as const)
            if(num(first[key])&&first[key]>0)warnings.push(`${label}: ${first[key]}`)
        if(first.sawCleanup!==true)warnings.push('Raid cleanup was not observed. The report may end early.')
        return {session,enabled:first.enabled===true,complete:!!header&&missing===0&&!badRows&&valid.every(([,p])=>p.complete===true),rows,coverage,missing,warnings}
    })
}
