export type MedicalChoiceContext={state:string;choice:string;reason:string;item:string;part:string;need:string;duration:number;health:number;heavyBleed:boolean;lightBleed:boolean;vital:boolean;cover:boolean;visible:boolean;footsteps:boolean;threatsIncomplete:boolean;contacts:number;contact:string;x:number|null;y:number|null;z:number|null;quiet:number;distance:number;sinceHit:number;started:boolean;applied:boolean;validFor:number;outcome:string;alternatives:{action:string;item:string;part:string;need:string;usable:boolean;duration:number;resource:number;score:number;reason:string}[]};
const text=(v:any)=>typeof v==='string'&&v.length<=512;
const number=(v:any,min:number,max:number)=>Number.isFinite(v)&&v>=min&&v<=max;
const actions=['FirstAid','Stims','Surgery','Wait'];
export function parseCometMedicalChoice(t:any):MedicalChoiceContext|null{
 if(!t||Array.isArray(t)||!['evaluated','selected','requested','started','ended'].includes(t.state)||!actions.includes(t.choice)
 ||['reason','item','part','need','contact','outcome'].some(k=>!text(t[k]))
 ||!number(t.duration,0,120)||!number(t.health,0,1)||!number(t.quiet,0,100000)||!number(t.distance,0,100000)||!number(t.sinceHit,0,100000)
 ||!Number.isInteger(t.contacts)||!number(t.contacts,0,16)||!number(t.validFor,0,1)
 ||['heavyBleed','lightBleed','vital','cover','visible','footsteps','threatsIncomplete','started','applied'].some(k=>typeof t[k]!=='boolean')
 ||(t.contact?['x','y','z'].some(k=>!number(t[k],-100000,100000)):['x','y','z'].some(k=>t[k]!==null))
 ||!['unconfirmed','resource-consumed','health-improved'].includes(t.outcome)
 ||t.applied&&(!t.started||t.state!=='started'||t.choice==='Wait')||!t.applied&&t.validFor!==0
 ||t.state==='started'&&!t.started||['evaluated','selected','requested'].includes(t.state)&&t.started
 ||t.choice!=='Wait'&&(!t.item||!t.part||t.duration<=0)||t.choice==='Wait'&&t.state!=='evaluated'
 ||!Array.isArray(t.alternatives)||t.alternatives.length>4||t.alternatives.length<1
 ||t.alternatives.some((a:any)=>!a||!actions.includes(a.action)||['item','part','need','reason'].some(k=>!text(a[k]))||typeof a.usable!=='boolean'||!number(a.duration,0,120)||!number(a.resource,0,1e9)||!number(a.score,-1,200)))return null;
 return t;
}
export function cometMedicalChoiceSummary(t:MedicalChoiceContext):string[]{return[
 `Medical choice: ${t.choice} · ${t.state} · ${t.reason.replace(/-/g,' ')}`,
 `Need: ${t.need||'none'} · health: ${(t.health*100).toFixed(0)}% · bleeding: ${t.heavyBleed?'heavy':t.lightBleed?'light':'no'} · vital emergency: ${t.vital?'yes':'no'}`,
 t.item?`Item: ${t.item} · ${t.part} · native base duration: ${t.duration.toFixed(1)} s`:'No usable treatment selected',
 `Reached protective cover: ${t.cover?'yes':'no'} · visible threat: ${t.visible?'yes':'no'} · recent footsteps: ${t.footsteps?'yes':'no'}`,
 t.contact?`Known contact: ${t.contact} · newest information: ${t.quiet.toFixed(1)} s · nearest known threat: ${t.distance.toFixed(1)} m · position: ${t.x!.toFixed(1)}, ${t.y!.toFixed(1)}, ${t.z!.toFixed(1)}`:'No recorded personal contact',
 t.threatsIncomplete?'Threat assessment incomplete; long treatment refused':`${t.contacts} known contacts assessed`,
 `Actual start: ${t.started?'observed in hands':'not observed'} · outcome: ${t.outcome.replace(/-/g,' ')}`,
 ...t.alternatives.map(a=>`${a.action}: ${a.score<0?'unavailable':a.score.toFixed(0)+' points'} · ${a.reason.replace(/-/g,' ')}`)
 ];}
