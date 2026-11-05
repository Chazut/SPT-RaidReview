export interface RestLightsContext {
    state:string; reason:string; owner:string; behavior:string; layer:string; weapon:string; execution:string;
    episode:number; devices:number; activeDevices:number;
    speed:number; stillFor:number; waitRemaining:number; cooldownRemaining:number; validFor:number;
    requested:boolean; accepted:boolean; observedOff:boolean;
    accessories:{id:string;name:string;mode:number;active:boolean}[];
    alternatives:string[];
}
export function parseCometRestLights(r:any):RestLightsContext|null {
    if(!r||Array.isArray(r)||!['waiting','pending','dark','yielded','released','no-device'].includes(r.state)
        ||['reason','owner','behavior','layer','weapon','execution'].some(k=>typeof r[k]!=='string'||!r[k])
        ||!['ORBIT','EFT'].includes(r.owner)||['requested','accepted','observedOff'].some(k=>typeof r[k]!=='boolean')
        ||!Number.isInteger(r.episode)||r.episode<1||r.accepted&&!r.requested
        ||['speed','stillFor','waitRemaining','cooldownRemaining','validFor'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)
        ||r.validFor>1||r.waitRemaining>15||r.cooldownRemaining>120||r.state==='released'&&r.validFor!==0
        ||['devices','activeDevices'].some(k=>!Number.isInteger(r[k])||r[k]<0||r[k]>16)||r.activeDevices>r.devices
        ||!Array.isArray(r.accessories)||r.accessories.length!==r.devices
        ||r.accessories.some((a:any)=>!a||Array.isArray(a)||typeof a.id!=='string'||!a.id||typeof a.active!=='boolean'||!Number.isInteger(a.mode)||a.mode<0)
        ||new Set(r.accessories.map((a:any)=>a.id)).size!==r.devices
        ||r.accessories.filter((a:any)=>a.active).length!==r.activeDevices
        ||r.observedOff!==(r.devices>0&&r.activeDevices===0)||r.state==='dark'&&!r.observedOff)return null;
    return {...r,accessories:r.accessories.map((a:any)=>({...a,name:typeof a.name==='string'?a.name.trim().slice(0,160):''})),
        alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((x:any)=>typeof x==='string').slice(0,8):[]};
}
export function cometRestDeviceName(r:RestLightsContext,i:number):string {
    const name=r.accessories[i].name;
    if(!name)return `Accessory ${i+1}`;
    const matches=r.accessories.filter(a=>a.name.toLowerCase()===name.toLowerCase());
    return matches.length<2?name:`${name} #${r.accessories.slice(0,i+1).filter(a=>a.name.toLowerCase()===name.toLowerCase()).length}`;
}
export function cometRestLightsSummary(r:RestLightsContext):string[] {
    return [`Lights while resting - ${r.state.replace(/-/g,' ')} (${r.owner})`,
        `Reason: ${r.reason.replace(/-/g,' ')} - ${r.execution}`,
        `Behavior: ${r.behavior} - speed ${r.speed.toFixed(2)} m/s - stable for ${r.stillFor.toFixed(1)} s`,
        `Wait remaining: ${r.waitRemaining.toFixed(1)} s - next episode cooldown: ${r.cooldownRemaining.toFixed(1)} s`,
        `OFF requested: ${r.requested?'yes':'no'} - native accepted: ${r.accepted?'yes':'no'} - OFF observed: ${r.observedOff?'yes':'no'}`,
        ...r.accessories.map((a,i)=>`${cometRestDeviceName(r,i)}: ${a.active?'ON':'OFF'}, mode ${a.mode}`),
        'Lighting context only. Behavior colors are unchanged; SAIN keeps combat control.',...r.alternatives];
}
export function cometRestLightsIdentifiers(r:RestLightsContext):string[] {
    return [`Weapon ID: ${r.weapon}`,...r.accessories.map((a,i)=>`${cometRestDeviceName(r,i)} - ID: ${a.id}`)];
}
