export type MovementRecoveryContext = {
    state:string; reason:string; step:string; result:string; owner:string; action:string; route:string; contact:string;
    incident:number; stalledSeconds:number; displacement:number; validFor:number; teleportEnabled:boolean;
}
export function parseCometMovementRecovery(raw:any):MovementRecoveryContext|null {
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['idle','tracking','paused','requested','attempted','rejected','skipped','recovered','exhausted','ended'].includes(raw.state))return null
    if(!['reason','step','result','owner','action','route','contact'].every(k=>typeof raw[k]==='string'))return null
    if(!['incident','stalledSeconds','displacement','validFor'].every(k=>typeof raw[k]==='number'&&Number.isFinite(raw[k])&&raw[k]>=0))return null
    if(!Number.isSafeInteger(raw.incident)||raw.stalledSeconds>86400||raw.displacement>10000||raw.validFor>2||typeof raw.teleportEnabled!=='boolean')return null
    if(['ended','recovered','exhausted','paused'].includes(raw.state)&&raw.validFor!==0)return null
    return {...raw}
}
export function cometMovementRecoverySummary(t:MovementRecoveryContext):string[] {
    return [t.reason.replace(/-/g,' '),`Movement owner: ${t.owner || 'unknown'} · action: ${t.action || 'none'}`,
        `Blocked: ${t.stalledSeconds.toFixed(1)} s · movement: ${t.displacement.toFixed(2)} m · incident ${t.incident}`,
        `Step: ${t.step || 'observation'} · ${t.result || t.state}`,
        t.state==='recovered'?'Real movement observed': 'An accepted request alone does not confirm recovery',
        `Known contact: ${t.contact || 'none'} · relocation ${t.teleportEnabled?'enabled':'OFF'}`,
        'Alternatives: wait for intentional action; C04 door recovery; recalculate path; vault/jump; optional hidden relocation; stop and replan.']
}
