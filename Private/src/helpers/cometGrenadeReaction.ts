export type GrenadeReactionContext={state:string;reason:string;reaction:string;personality:string;owner:string;item:string;source:string;contact:string;contactSource:string;
 projectile:number;active:number;x:number;y:number;z:number;radius:number;distance:number;goalX:number;goalY:number;goalZ:number;pathLength:number;validFor:number;hasGoal:boolean;alternatives:string[]};
export function parseCometGrenadeReaction(r:any):GrenadeReactionContext|null {
 if(!r||Array.isArray(r)||!['planning','moving','prone','ended'].includes(r.state)
  ||['reason','reaction','personality','owner','item','source','contact','contactSource'].some(k=>typeof r[k]!=='string'||r[k].length>500)||!r.owner||!r.item
  ||!['Push','Retreat','Relocate','Scatter'].includes(r.reaction)||!['sain-detected','own-throw','observed-squad-throw'].includes(r.source)
  ||['projectile','active','x','y','z','radius','distance','goalX','goalY','goalZ','pathLength','validFor'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))
  ||!Number.isInteger(r.projectile)||r.projectile< -2147483648||r.projectile>2147483647||!Number.isInteger(r.active)||r.active<0||r.active>128
  ||r.radius<=0||r.radius>150||r.distance<0||r.pathLength<0||r.validFor<0||r.validFor>.5||r.state==='ended'&&r.validFor!==0
  ||typeof r.hasGoal!=='boolean'||r.state==='moving'&&!r.hasGoal
  ||!Array.isArray(r.alternatives)||r.alternatives.length>8||r.alternatives.some((v:any)=>typeof v!=='string'||v.length>500))return null;
 return r;
}
export function cometGrenadeReactionSummary(t:GrenadeReactionContext):string[] {
 return [`Grenade reaction: ${t.reaction} · ${t.state} · ${t.reason.replace(/-/g,' ')}`,
  `Personality: ${t.personality} · detected grenade ${t.projectile} · ${t.source.replace(/-/g,' ')} · ${t.active} known danger(s)`,
  `Danger: ${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)} · radius ${t.radius.toFixed(1)} m · distance ${t.distance.toFixed(1)} m`,
  t.hasGoal?`Safe destination: ${t.goalX.toFixed(1)}, ${t.goalY.toFixed(1)}, ${t.goalZ.toFixed(1)} · route ${t.pathLength.toFixed(1)} m`:'No accepted destination',
  t.contact?`Known contact: ${t.contact} · ${t.contactSource}`:'No recent personal contact used',...t.alternatives];
}
