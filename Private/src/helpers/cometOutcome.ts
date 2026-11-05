export type OutcomeEffect = {action:string; results:number; favorable:number; unfavorable:number; delta:number; applied:number; refusal:string}
export type OutcomeContext = {
    state:string; reason:string; target:string; instance:number; episode:number; action:string; result:string;
    elapsed:number; remaining:number; validFor:number; age:number; healthLoss:number; recognizedDamage:number;
    ambiguous:boolean; x:number; y:number; z:number; choice:string; alternatives:string[]; effects:OutcomeEffect[];
}
const text=(x:unknown)=>typeof x==='string'?x:''
const finite=(x:unknown)=>typeof x==='number'&&Number.isFinite(x)
export function parseCometOutcome(raw:any):OutcomeContext|null {
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['idle','observing','resolved','review','ended'].includes(raw.state)
        ||!['pending','neutral','favorable','unfavorable'].includes(raw.result))return null
    for(const key of ['instance','episode','elapsed','remaining','validFor','age','healthLoss','recognizedDamage','x','y','z'])if(!finite(raw[key]))return null
    if(!Number.isInteger(raw.instance)||!Number.isInteger(raw.episode)||raw.episode<0||raw.elapsed<0||raw.remaining<0||raw.remaining>60
        ||raw.validFor<0||raw.validFor>.35||raw.age<0||raw.healthLoss<0||raw.healthLoss>1||raw.recognizedDamage<0
        ||typeof raw.ambiguous!=='boolean'||!Array.isArray(raw.effects)||raw.effects.length>7)return null
    const actions=new Set<string>()
    const effects:OutcomeEffect[]=[]
    for(const e of raw.effects) {
        if(!e||!['Hold','Shoot','Push','Search','Flank','Cover','FallBack'].includes(e.action)||actions.has(e.action))return null
        actions.add(e.action)
        if(!['results','favorable','unfavorable','delta','applied'].every(k=>finite(e[k]))
            ||!['results','favorable','unfavorable'].every(k=>Number.isInteger(e[k])&&e[k]>=0&&e[k]<=32)
            ||e.results!==e.favorable+e.unfavorable||e.delta< -20||e.delta>10||e.applied< -20||e.applied>10
            ||Math.abs(e.applied)>Math.abs(e.delta)||e.applied*e.delta<0)return null
        effects.push({action:e.action,results:e.results,favorable:e.favorable,unfavorable:e.unfavorable,
            delta:e.delta,applied:e.applied,refusal:text(e.refusal)})
    }
    return {...raw,reason:text(raw.reason),target:text(raw.target),action:text(raw.action),choice:text(raw.choice),effects,
        alternatives:Array.isArray(raw.alternatives)?raw.alternatives.filter((s:any)=>typeof s==='string').slice(0,6):[]}
}
export function cometOutcomeSummary(t:OutcomeContext,names:Record<string,string>={}):string[] {
    return [`Observed opponent: ${names[t.target]||t.target||'unknown'}`,
        `Attempt #${t.episode}: ${t.action||'candidate review'} · ${t.result} · ${t.reason.replace(/-/g,' ')}`,
        `Observed for ${t.elapsed.toFixed(1)} s · Own health lost ${(100*t.healthLoss).toFixed(1)}% · Recognized incoming damage ${t.recognizedDamage.toFixed(1)}${t.ambiguous?' · Ambiguous evidence':''}`,
        `Attempt origin: ${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)} · Memory remaining ${t.remaining.toFixed(1)} s`,
        ...t.effects.filter(e=>e.results>0||e.applied!==0).map(e=>`${e.action}: ${e.favorable} favorable / ${e.unfavorable} unfavorable comparable results · ${e.delta.toFixed(1)} available / ${e.applied.toFixed(1)} applied${e.refusal?' · '+e.refusal.replace(/-/g,' '):''}`),
        `Choice: ${t.choice||'not selected here'}. Score influence is not proof of execution.`,...t.alternatives,
        'Observed outcomes, not a guarantee of success. Individual memory for this encounter only.']
}
