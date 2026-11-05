const object=(v:any):v is Record<string,any>=>v!==null&&typeof v==='object'&&!Array.isArray(v)
const text=(v:any,max=96):v is string=>typeof v==='string'&&v.length<=max
const number=(v:any)=>typeof v==='number'&&Number.isFinite(v)&&v>=0
const count=(v:any)=>number(v)&&Number.isSafeInteger(v)
export type JournalContext={lines:string[];validFor:number}
export function parseCometJournal(detail:any,feature:string):JournalContext|null {
    if(!object(detail))return null
    if(feature==='T04')return parseControlJournal(detail.controlJournal)
    const w=detail.weaponJournal,c=detail.combatJournal
    const data=feature==='T01'?c:feature==='T03'?w:null
    if(!object(data))return null
    const ctx=data.context,lines:string[]=[]
    if(feature==='T01') {
        if(!['context','pause','hit-dealt','hit-taken','kill','death'].includes(data.kind))return null
        lines.push(`Combat journal: ${data.kind}`)
        if(number(data.damage))lines.push(`Observed health loss: ${data.damage.toFixed(1)}${text(data.bodyPart)?' · '+data.bodyPart:''}`)
    } else {
        const e=data.change
        if(!object(e)||!['accepted','refused','observed','in-hands','ready','unconfirmed','interrupted','loop-start','loop-update','loop-end'].includes(e.state)||!text(e.reason)||!text(e.origin))return null
        lines.push(`Weapon journal: ${e.state} · ${e.reason}`)
        lines.push(`Origin: ${e.origin||'unknown'}${count(e.request)&&e.request>0?' · Request '+e.request:''}`)
        if(count(e.incident)&&e.incident>0)lines.push(`Possible loop #${e.incident}: ${count(e.changes)?e.changes:'?'} observed changes · ${number(e.duration)?e.duration.toFixed(1):'?'} s`)
        if(!Array.isArray(data.weapons)||data.weapons.length>3)return null
        const names=new Map<string,string>()
        for(const gun of data.weapons) {
            if(!object(gun)||!text(gun.id,128)||!text(gun.name,192)||!text(gun.slot)||!text(gun.malfunction))continue
            names.set(gun.id,gun.name)
            const n=(v:any)=>count(v)?v:'?'
            lines.push(`${gun.name} (${gun.slot}): ${n(gun.chamber)} chamber + ${n(gun.magazine)} magazine; ${n(gun.reachableMagazines)} reachable compatible magazines (${n(gun.reachableMagazineRounds)} rounds); ${n(gun.looseRounds)} loose rounds; ${gun.malfunction}${gun.resourcesComplete===true?'':' · partial resources'}`)
        }
        if(text(e.from,128)&&text(e.to,128))lines.splice(1,0,`${names.get(e.from)||'Previous weapon / empty hands'} → ${names.get(e.to)||'Unknown target weapon'}`)
        if(number(data.resourcesAge))lines.push(`Resource snapshot age: ${data.resourcesAge.toFixed(1)} s`)
    }
    if(object(ctx)) {
        if(text(ctx.action))lines.push(`Native action: ${ctx.action||'unknown'}${ctx.sainActive===false?' · SAIN layer inactive':text(ctx.combat)?' · '+ctx.combat:''}`)
        if(ctx.sainActive!==false&&text(ctx.self)&&text(ctx.squad))lines.push(`Self: ${ctx.self} · Squad: ${ctx.squad}`)
        if(text(ctx.choice)&&ctx.choice)lines.push(`COMET choice: ${ctx.choice}${text(ctx.reason)?' · '+ctx.reason:''}`)
        lines.push(`Contact: ${ctx.visible===true?'visible':'not visible'}${number(ctx.knownDistance)?' · last-known distance '+ctx.knownDistance.toFixed(1)+' m':''}${number(ctx.contactAge)?' · information age '+ctx.contactAge.toFixed(1)+' s':''}`)
    }
    return {lines,validFor:feature==='T03'?5:2}
}
export type JournalReport={feature:string;session:string;enabled:boolean;complete:boolean;rows:Record<string,any>[];warnings:string[]}
export function groupJournalRows(report:JournalReport,group:string,filter:string):Record<string,any>[] {
    const grouped=new Map<string,Record<string,any>>()
    for(const r of report.rows) {
        const label=report.feature==='T04'&&group!=='PMC'?`${r.owner} - ${r.blocker}`:report.feature!=='T01'&&report.feature!=='T04'||group==='PMC'?r.name:group==='Action'?`${r.feature||'Native'} · ${r.action}`:r.personality||'Unknown'
        if(!label.toLowerCase().includes(filter.toLowerCase()))continue
        const key=report.feature!=='T01'&&report.feature!=='T04'||group==='PMC'?r.bot:label
        if(!grouped.has(key))grouped.set(key,{label})
        const row=grouped.get(key)!;for(const [k,v] of Object.entries(r))if(typeof v==='number')row[k]=(row[k]??0)+v
    }
    return [...grouped.values()]
}
export function parseJournalReports(events:unknown):JournalReport[] {
    if(!Array.isArray(events))return []
    const groups=new Map<string,Map<number,any>>()
    for(const event of events.slice(0,400)) {
        if(!object(event)||!['T01','T03','T04'].includes(event.feature)||event.stage!=='summary')continue
        let data:any;try{data=typeof event.detail==='string'?JSON.parse(event.detail):event.detail}catch{continue}
        if(!object(data)||data.feature!==event.feature)continue
        const p=data.journalReport,session=data.session
        if(!object(p)||p.version!==1||!text(session,128)||!session||!count(p.part)||!count(p.parts)||p.parts<1||p.parts>40||p.part>=p.parts||!Array.isArray(p.rows)||p.rows.length>8)continue
        const key=event.feature+':'+session;let pages=groups.get(key)
        if(!pages){if(groups.size>=8)continue;pages=new Map();groups.set(key,pages)}
        if(!pages.has(p.part))pages.set(p.part,p)
    }
    return [...groups].map(([key,pages])=>{
        const feature=key.slice(0,3),session=key.slice(4),header=pages.get(0),first=header??pages.values().next().value
        const rows:Record<string,any>[]=[],warnings:string[]=[];let invalid=0
        const fields=feature==='T01'?['samples','hitsDealt','hitsTaken','kills','deaths','contacts']:feature==='T04'?['transitions','takeovers','returns','freshThreatReturns','incidents','longWaits','residuals']:['requests','accepted','refused','observed','inHands','ready','unconfirmed','interrupted','incidents']
        for(const [part,p] of [...pages].sort((a,b)=>a[0]-b[0])) {
            if(p.parts!==first.parts){invalid++;continue}
            for(const r of p.rows) {
                if(part===0||!object(r)||!text(r.bot,128)||!text(r.profileId,128)||!text(r.name)||!fields.every(k=>count(r[k]))){invalid++;continue}
                if(feature==='T01'&&(!text(r.action)||!text(r.personality,40)||!text(r.feature)||!['seconds','damageDealt','damageTaken'].every(k=>number(r[k])))){invalid++;continue}
                if(feature==='T04'&&(!text(r.owner)||!text(r.blocker)||!['seconds','waitSeconds','takeoverSeconds'].every(k=>number(r[k])))){invalid++;continue}
                rows.push(r)
            }
        }
        if(!header||pages.size!==first.parts)warnings.push('Missing report pages. Counts are partial.')
        if(invalid)warnings.push('Invalid report rows or page counts were ignored.')
        for(const [k,label] of [['queueDropped','Queue losses'],['invalidEvents','Unavailable observations'],['omittedEvents','Rate-limited events'],['capacitySkipped','Memory-limit omissions']])
            if(number(first[k])&&first[k]>0)warnings.push(`${label}: ${first[k]}`)
        if(first.sawCleanup!==true)warnings.push('Raid cleanup was not observed.')
        return {feature,session,enabled:first.enabled===true,complete:!!header&&pages.size===first.parts&&!invalid&&[...pages.values()].every(p=>p.complete===true),rows,warnings}
    })
}

export function parseControlJournal(v:any):JournalContext|null {
    if(!object(v)||!['baseline','gap','interval','suspended','resumed','combat-ended','takeover','combat-return','incident-start','incident-update','incident-end','long-wait','residual','context'].includes(v.kind))return null
    if(!['owner','previousOwner','layer','action','feature','blocker','reason','residual'].every(k=>text(v[k],256))||!['elapsed','sampledSeconds','waitSeconds'].every(k=>number(v[k]))||!count(v.cycles)||!count(v.incident)||typeof v.waiting!=='boolean')return null
    const lines=[`Control transition: ${v.kind} - ${v.reason}`,`Layer: ${v.layer||'unknown'} (${v.owner})`,`Observed action: ${v.action||'unobserved'}${v.feature?' - COMET '+v.feature:''}`,`Context: ${v.blocker}`]
    if(v.waiting||v.elapsed>0)lines.push(`${v.waiting?'Pending transition':'Transition observation'}: ${v.elapsed.toFixed(1)} s`)
    if(v.incident>0)lines.push(`Possible repeated-transition incident #${v.incident} - ${v.cycles} rapid round trips`)
    if(v.residual)lines.push(`COMET records: ${v.residual}. A record alone does not prove a native command is still executing.`)
    if(v.kind==='long-wait')lines.push('Review this wait; medical, recovery or unknown reasons are not automatically a bug.')
    return {lines,validFor:7}
}
