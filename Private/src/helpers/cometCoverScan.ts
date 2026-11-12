export type CoverScanContext = {
    state:string; reason:string; contact:string; selected:string;
    scan:number; published:number; pending:number; elapsed:number; validFor:number;
    fallback?:string; candidates?:number; rejected?:Record<string,number>;
}
export function parseCometCoverScan(raw:any):CoverScanContext|null {
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['idle','scanning','published','timeout','validated','rejected','ended'].includes(raw.state))return null
    if(!['reason','contact','selected'].every(k=>typeof raw[k]==='string'))return null
    if(!['scan','published','pending'].every(k=>Number.isSafeInteger(raw[k])&&raw[k]>=0))return null
    if(!['elapsed','validFor'].every(k=>typeof raw[k]==='number'&&Number.isFinite(raw[k])&&raw[k]>=0))return null
    if(raw.elapsed>86400||raw.validFor>2||raw.published>128||raw.pending>128||raw.state==='ended'&&raw.validFor!==0)return null
    if(raw.fallback!=null&&!['','full','partial'].includes(raw.fallback))return null
    if(raw.candidates!=null&&(!Number.isSafeInteger(raw.candidates)||raw.candidates<0||raw.candidates>48))return null
    if(raw.rejected!=null&&(typeof raw.rejected!=='object'||Array.isArray(raw.rejected)||Object.keys(raw.rejected).length>24||!Object.entries(raw.rejected).every(([k,v])=>k.length<=128&&Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=48)))return null
    return {...raw}
}
export function cometCoverScanSummary(t:CoverScanContext):string[] {
    return [t.reason.replace(/-/g,' '),`Search ${t.scan}: ${t.elapsed.toFixed(1)} s · ${t.state}`,
        `Available covers: ${t.published} · unfinished results: ${t.pending}`,
        `Known contact: ${t.contact || 'none'}`,
        ...(t.selected?[`Selected cover: ${t.selected}`]:[]),
        ...(t.candidates!=null?[`Local fallback: ${t.fallback||'searching'} protection · ${t.candidates} candidates`,
            ...Object.entries(t.rejected||{}).map(([reason,count])=>`${reason.replace(/-/g,' ')}: ${count}`),
            'A published position does not confirm movement or arrival.']:[]),
        'Alternatives: keep complete results; publish a finished search; restart a timed-out search; reject an invalid cover.']
}
