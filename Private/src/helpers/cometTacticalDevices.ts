export interface TacticalDevicesContext {
    state:string; reason:string; action:string; weapon:string; source:string; execution:string;
    target:boolean; requested:boolean; accepted:boolean; observed:boolean;
    devices:number; activeDevices:number; validFor:number;
    accessories:{id:string;name?:string;state:string;active:boolean;requested:boolean;confirmed:boolean;mode:number;failures:number;rounds:number;retryIn:number}[];
    alternatives:string[];
}
export function parseCometTacticalDevices(r:any):TacticalDevicesContext|null {
    if(!r||Array.isArray(r)||!['waiting','pending','backoff','confirmed','yielded','released','no-device'].includes(r.state)
        ||['reason','action','weapon','source','execution'].some(k=>typeof r[k]!=='string')||!r.reason||!r.weapon||!r.execution
        ||!['SAIN','holster'].includes(r.source)||['target','requested','accepted','observed'].some(k=>typeof r[k]!=='boolean')
        ||['devices','activeDevices'].some(k=>!Number.isInteger(r[k])||r[k]<0||r[k]>16)||r.activeDevices>r.devices
        ||typeof r.validFor!=='number'||!Number.isFinite(r.validFor)||r.validFor<0||r.validFor>1
        ||r.state==='released'&&r.validFor!==0||r.accepted&&!r.requested||r.source==='holster'&&r.target
        ||!Array.isArray(r.accessories)||r.accessories.length!==r.devices
        ||r.accessories.some((a:any)=>!a||Array.isArray(a)||typeof a.id!=='string'||!a.id
            ||!['idle','waiting','pending','confirmed','yielded','backoff'].includes(a.state)
            ||['active','requested','confirmed'].some(k=>typeof a[k]!=='boolean')
            ||['mode','failures','rounds'].some(k=>!Number.isInteger(a[k])||a[k]<0)
            ||a.failures>5||typeof a.retryIn!=='number'||!Number.isFinite(a.retryIn)||a.retryIn<0||a.retryIn>300)
        ||new Set(r.accessories.map((a:any)=>a.id)).size!==r.devices
        ||r.accessories.filter((a:any)=>a.active).length!==r.activeDevices
        ||r.observed!==(r.devices>0&&(r.target?r.activeDevices===r.devices:r.activeDevices===0))
        ||r.state==='confirmed'&&!r.observed)return null;
    return {...r,accessories:r.accessories.map((a:any)=>({...a,name:typeof a.name==='string'?a.name.trim().slice(0,160):''})),
        alternatives:Array.isArray(r.alternatives)?r.alternatives.filter((x:any)=>typeof x==='string').slice(0,8):[]};
}
export function cometTacticalDeviceLabel(t:TacticalDevicesContext,index:number):string {
    const name=t.accessories[index].name?.trim();
    if(!name)return `Accessory ${index+1}`; // Older recordings did not capture names.
    const duplicates=t.accessories.filter(a=>a.name?.trim().toLowerCase()===name.toLowerCase());
    if(duplicates.length<2)return name;
    const ordinal=t.accessories.slice(0,index+1).filter(a=>a.name?.trim().toLowerCase()===name.toLowerCase()).length;
    return `${name} #${ordinal}`;
}
export function cometTacticalDeviceIdentifiers(t:TacticalDevicesContext):string[] {
    return [`Weapon ID: ${t.weapon}`,...t.accessories.map((a,i)=>`${cometTacticalDeviceLabel(t,i)} - ID: ${a.id}`)];
}
export function cometTacticalDevicesSummary(t:TacticalDevicesContext):string[] {
    return [`Weapon accessories - ${t.state.replace(/-/g,' ')} - desired ${t.target?'ON':'OFF'} (${t.source})`,
        `Reason: ${t.reason.replace(/-/g,' ')} - ${t.execution}`,
        `Action: ${t.action||'none'} - active ${t.activeDevices}/${t.devices}`,
        `Command requested: ${t.requested?'yes':'no'} - native accepted: ${t.accepted?'yes':'no'} - target state observed: ${t.observed?'yes':'no'}`,
        ...t.accessories.map((a,i)=>`${cometTacticalDeviceLabel(t,i)}: ${a.active?'ON':'OFF'}, mode ${a.mode}, ${a.state}, ${a.failures} failures, pause round ${a.rounds}${a.retryIn>0?`, retry in ${a.retryIn.toFixed(1)} s`:''}`),
        'Lighting context only. Native behavior colors and combat ownership are unchanged.',...t.alternatives];
}
