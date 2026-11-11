const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('node:assert/strict');

const ts = require('../Private/node_modules/typescript');

const cache = new Map();

function load(filename) {

    filename = path.resolve(__dirname, filename);

    if (cache.has(filename)) return cache.get(filename);

    const context = { exports: {}, require: name => load(path.resolve(path.dirname(filename), name) + '.ts') };

    vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {

        fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }

    }).outputText, context);

    cache.set(filename, context.exports); return context.exports;

}

const {prepareCometMapEvents:prepare,cometMapState:state}=load('../Private/src/helpers/cometMap.ts');
const {cometPresentation:view,cometMarkerHtml:marker,cometSimpleTooltip:tip,cometEpisodes:episodes}=load('../Private/src/helpers/cometPresentation.ts');
const fixture=name=>JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures',name+'.json'),'utf8'));
const row=(id,time,stage='accepted',decision='Hold',extra={})=>({id,time,profileId:'pmc',cometSession:'s',sequence:id,feature:'A01',stage,decision,reason:'new-contact',detail:{botInstance:'one',contact:{target:'enemy',source:'heard',age:2,distance:20},candidates:[{decision:'Hold',eligible:true,score:70,reason:'available',fearDelta:5},{decision:'Push',eligible:false,score:90,reason:'unsafe-push'},{decision:'Flank',eligible:true,score:60,reason:'available'}]},...extra});
const ready=rows=>({status:'ready',events:prepare(rows,'pmc')});
const control=(id,time,owner)=>row(id,time,'evaluated','ControlHandoff',{feature:'I02',detail:{botInstance:'one',controlHandoff:{...fixture('i02-control').controlHandoff,owner}}});
let checks=0;
function check(name,run){try{run();checks++}catch(e){e.message=name+': '+e.message;throw e}}
const history=ready([row(1,1000,'selected'),row(2,1100),row(3,4000,'released')]);
check('selection does not imply execution',()=>assert.equal(view(history,1050,'SAIN:Search',900).badge,false));
check('accepted plan is explicitly pending until observed',()=>{const v=view(history,1150,'SAIN:Search',900);assert.equal(v.badge,false);assert.match(v.status,/not yet observed/);assert.equal(v.owner,'SAIN')});
check('observed action retains score, alternatives, factors and contact age in seconds',()=>{const v=view(history,2200,'COMET:Hold',2000);assert.equal(v.badge,true);assert.equal(v.score,70);assert.equal(v.factors[0].delta,5);assert.equal(v.alternatives.length,2);assert.match(v.contact,/3.1 s old/);assert.match(v.owner,/COMET/)});
check('PBT layer hides stale COMET control and interventions',()=>{const v=view(history,2200,'PBT:Cheating',2000);assert.equal(v.owner,'PBT');assert.equal(v.title,'Cheater behavior');assert.equal(v.badge,false);assert.equal(v.score,null);assert.equal(v.interventions.length,0)});
check('release clears observed badge',()=>assert.equal(view(history,4100,'COMET:Hold',3900).badge,false));
for(const [time,decision,sample,expected] of [[2200,'COMET:Hold',2000,true],[4100,'COMET:Hold',3900,false],[800,'SAIN:Search',750,false],[2200,'COMET:Hold',2000,true]])check('seek '+time,()=>assert.equal(view(history,time,decision,sample).badge,expected));
check('ghost clears cue badge destination',()=>{const v=view(history,2200,'COMET:Hold',2000,true);assert.equal(v.owner,'Ghost');assert.equal(v.badge,false);assert.equal(v.signal,null);assert.equal(v.destination,null)});
check('ORBIT sample beats old accepted action',()=>{const v=view(history,2400,'Orbit:ContainerLoot',2300);assert.equal(v.badge,false);assert.equal(v.owner,'ORBIT');assert.equal(marker(v),'')});
for(const decision of ['Orbit:ChoosingObjective','Orbit:ActionUnavailable'])check('ORBIT transition retains ownership '+decision,()=>{const v=view(history,2400,decision,2300);assert.equal(v.badge,false);assert.equal(v.owner,'ORBIT');assert.equal(marker(v),'');assert.match(tip(v),/ORBIT/)});
check('ORBIT control diagnostic alone is not COMET ownership',()=>{const r=ready([control(1,1000,'orbit')]);assert.equal(state(r,1100,'SAIN:Search',900).active,true);const v=view(r,1100,'SAIN:Search',900);assert.equal(v.badge,false);assert.equal(v.owner,'ORBIT');assert.equal(v.destination,null)});
for(const owner of ['orbit','questing','looting','extraction','other'])check('handoff cancels COMET '+owner,()=>assert.equal(view(ready([row(1,900),control(2,1000,owner)]),1100,'COMET:Hold',900).badge,false));
check('renewed observed combat after handoff',()=>assert.equal(view(ready([control(1,1000,'orbit'),row(2,1200)]),1300,'COMET:Hold',1200).badge,true));
const reload=fixture('w01-reload-timing').reloadTiming;
const reloadRow=(id,t,change={})=>row(id,t,'evaluated','ReloadTiming',{feature:'W01',detail:{botInstance:'one',reloadTiming:{...reload,...change}}});
check('auxiliary observed reload gets an action cue without owning SAIN',()=>{const v=view(ready([reloadRow(1,1000)]),1100,'SAIN:Reload',900);assert.equal(v.badge,true);assert.equal(v.owner,'SAIN');assert.equal(v.symbol,'reload');assert.equal(v.title,'Reloading')});
check('queued reload does not get an observed cue',()=>assert.equal(view(ready([reloadRow(1,1000,{state:'requested',started:false})]),1100,'SAIN:Reload',900).badge,false));
check('auxiliary expiry',()=>assert.equal(view(ready([reloadRow(1,1000)]),1700,'SAIN:Reload',900).badge,false));
check('new ORBIT sample clears old auxiliary action',()=>assert.equal(view(ready([reloadRow(1,1000)]),1100,'Orbit:ContainerLoot',1050).badge,false));
check('new ORBIT handoff clears old auxiliary action',()=>assert.equal(view(ready([reloadRow(1,1000),control(2,1050,'orbit')]),1100,'SAIN:Reload',900).badge,false));
check('new instance cannot inherit auxiliary action',()=>assert.equal(view(ready([reloadRow(1,1000),row(2,1050,'selected','Hold',{detail:{botInstance:'two'}})]),1100,'SAIN:Reload',900).badge,false));
const movement=fixture('m01-combat-step').combatStep;
const moveRow=(id,t,change={})=>row(id,t,'evaluated','CombatStep',{feature:'M01',detail:{botInstance:'one',combatStep:{...movement,...change}}});
check('destination is the recorded goal, not remembered contact',()=>{const r=ready([moveRow(1,1000)]),v=view(r,1100,'SAIN:StandAndShoot',900);assert.ok(v.badge);assert.equal(v.destination.x,movement.goalX);assert.equal(v.destination.z,movement.goalZ)});
check('request alone does not draw a destination',()=>assert.equal(view(ready([moveRow(1,1000,{movementObserved:false})]),1100,'SAIN:StandAndShoot',900).destination,null));
check('unavailable record never invents details',()=>{const v=view({status:'unavailable',events:[]},1000,'SAIN:Search',1000);assert.equal(v.badge,false);assert.equal(v.score,null);assert.equal(v.destination,null)});
check('sampled COMET still works for old recordings',()=>{const v=view(undefined,1000,'COMET:Hold',1000);assert.equal(v.badge,true);assert.equal(v.score,null)});
check('HTML is escaped in marker and short tooltip',()=>{const v={...view(history,2200,'COMET:Hold',2000),title:'<img src=x onerror=x>',reason:'<script>bad</script>',owner:'<b>bad'};assert.ok(!tip(v).includes('<img'));assert.ok(!tip(v).includes('<script>'));assert.ok(!marker(v).includes('<img'));assert.ok(marker(v).includes('&lt;img'))});
check('readable history groups repeats but preserves interruption and another instance',()=>{const r=ready([row(1,1000),row(2,1200),control(3,1300,'orbit'),row(4,1500),row(5,1800,'accepted','Hold',{detail:{botInstance:'two'}})]);const e=episodes(r);assert.equal(e.length,4);assert.equal(e[0].count,2);assert.equal(e[1].title,'Control handed over');assert.equal(e[3].count,1)});
check('readable history omits diagnostic-only events',()=>assert.equal(episodes(ready([reloadRow(1,1000,{state:'requested',started:false})])).length,0));
const closeRow=(id,time,change={})=>row(id,time,'evaluated','CloseDetection',{feature:'P05',detail:{botInstance:'one',closeDetection:{state:'acquired',target:'enemy',reason:'close-native-visual-acquired',visualAcquired:true,...change}}});
const heardRow=(id,time,outcome='heard')=>row(id,time,'evaluated','MovementHearing',{feature:'P01',detail:{botInstance:'one',hearing:{signal:id,source:'enemy',kind:'Sprint',outcome,age:.3,distance:14,range:70,volume:.5,x:1,y:2,z:3}}});
const attentionRow=(visible=true,stage='accepted')=>row(1,1000,stage,'SelectTarget',{feature:'A07',detail:{botInstance:'one',threat:{previous:'enemy-a',selected:'enemy-b',reason:'threat-recent-attacker',candidates:[{target:'enemy-b',visible,eligible:true,source:visible?'seen':'heard',age:0,score:80}]}}});
check('visual cue requires confirmed acquisition and does not claim control',()=>{const v=view(ready([closeRow(1,1000)]),1200,'SAIN:Search',1100);assert.equal(v.signal.glyph,'!');assert.equal(v.owner,'SAIN');assert.equal(v.badge,false)});
check('attention adjustment alone is not visual acquisition',()=>assert.equal(view(ready([closeRow(1,1000,{state:'adjusted',visualAcquired:false})]),1200,'SAIN:Search',1100).signal,null));
check('visual cue lasts two replay seconds, including after seeking backwards',()=>{const r=ready([closeRow(1,1000)]);for(const [t,yes] of [[1200,true],[3100,false],[900,false],[1200,true]])assert.equal(!!view(r,t,'SAIN:Search',900).signal,yes)});
check('new instance cannot inherit a visual cue',()=>assert.equal(view(ready([closeRow(1,1000),row(2,1100,'selected','Hold',{detail:{botInstance:'two'}})]),1200,'SAIN:Search',1100).signal,null));
check('heard cue does not imply visual detection',()=>assert.equal(view(ready([heardRow(1,1000)]),1200,'SAIN:Search',1100).signal.glyph,'?'));
check('rejected sound is not displayed as heard',()=>assert.equal(view(ready([heardRow(1,1000,'ignored')]),1200,'SAIN:Search',1100).signal,null));
check('heard cue expires',()=>assert.equal(view(ready([heardRow(1,1000)]),3100,'SAIN:Search',1100).signal,null));
check('ghost has no contact cue',()=>assert.equal(view(ready([heardRow(1,1000)]),1200,'SAIN:Search',1100,true).signal,null));
check('target switch cue requires accepted visible target',()=>{assert.equal(view(ready([attentionRow()]),1200,'SAIN:Search',1100).signal.glyph,'!');assert.equal(view(ready([attentionRow(false)]),1200,'SAIN:Search',1100).signal,null);assert.equal(view(ready([attentionRow(true,'evaluated')]),1200,'SAIN:Search',1100).signal,null)});
check('invalid destination never produces a map line',()=>assert.equal(view(ready([moveRow(1,1000,{goalX:NaN})]),1100,'SAIN:StandAndShoot',900).destination,null));
console.log(checks+' COMET presentation checks passed.');
check('pending exposure keeps accepted action and readable reason',()=>{
 const kept=row(2,1200,'evaluated','Shoot',{feature:'A13',reason:'plan-kept-pending-exposure',detail:{botInstance:'one',handoff:{state:'kept',kind:'continuity',reason:'plan-kept-pending-exposure',fromFeature:'A02',fromAction:'Shoot'}}});
 const r=ready([row(1,1100,'accepted','Shoot',{feature:'A02'}),kept]);
 assert.equal(view(r,1300,'COMET:Shoot',1250).badge,true);
 assert.equal(episodes(r).at(-1).title,'Plan retained');
});
check('self action pause is not shown as returned control',()=>{
 const r=ready([row(1,1100),row(2,1200,'released','Hold',{reason:'comet-service-pause'}),
  row(3,1201,'evaluated','',{feature:'A13',reason:'comet-service-Surgery',detail:{botInstance:'one',handoff:{state:'service-paused',kind:'continuity',reason:'comet-service-Surgery',fromFeature:'A01',fromAction:'Hold',nativeSelf:'Surgery'}}})]);
 assert.equal(view(r,1250,'COMET:Hold',1150).badge,false);
 const active=view(r,1400,'COMET:Surgery',1300);assert.equal(active.badge,true);assert.equal(active.title,'Surgery');assert.equal(active.symbol,'medical');
 assert.equal(episodes(r).at(-1).title,'Plan paused');assert.ok(!episodes(r).some(e=>e.title==='Returned control'));
 assert.equal(view(r,1400,'Orbit:Loot',1300).badge,false);
 assert.equal(view(r,1400,'COMET:Surgery',1300,true).badge,false);
 assert.equal(view(r,1100,'COMET:Hold',1100).badge,true);
});
check('reevaluation after service does not authorize a stale plan',()=>{
 const r=ready([row(1,1100,'released','Hold',{reason:'comet-service-pause'}),row(2,1200,'evaluated','',{feature:'A13',reason:'comet-service-ended-revalidate-plan',detail:{botInstance:'one',handoff:{state:'service-revalidate',reason:'comet-service-ended-revalidate-plan',fromFeature:'A01',fromAction:'Hold'}}})]);
 assert.equal(view(r,1300,'SAIN:Search',1250).badge,false);assert.equal(episodes(r).at(-1).title,'Plan reevaluation');
});
console.log(`Continuity and service presentation checks included: ${checks}`);

const {cometFeatureNames,cometFeatureLabel}=load('../Private/src/helpers/cometFeatureLabels.ts');
check('full coverage catalog and safe unknown feature fallback',()=>{
 assert.equal(Object.keys(cometFeatureNames).length,132);
 for(const [id,name] of Object.entries(cometFeatureNames)){assert.match(id,/^[A-Z]\d{2}$/);assert.ok(name.length>5);assert.equal(cometFeatureLabel(id),name)}
 for(const key of ['Z99','toString','__proto__','',undefined])assert.equal(cometFeatureLabel(key),'');
});
const lean=fixture('m04-combat-lean').combatLean;
const shootRow=()=>row(1,1000,'accepted','Shoot',{feature:'A02',detail:{botInstance:'one',candidates:[{decision:'Shoot',eligible:true,score:70},{decision:'Push',eligible:false},{decision:'Hold',eligible:true,score:60}]}});
const leanRow=(change={})=>row(2,1100,'evaluated','CombatLean',{feature:'M04',detail:{botInstance:'one',combatLean:{...lean,...change}}});
const detailedAction=ready([shootRow(),leanRow()]);
check('observed intervention is not hidden by a generic plan and retains the plan score',()=>{
 const v=view(detailedAction,1150,'COMET:Shoot',1050);
 assert.equal(v.title,'Leaning to evade shots');assert.equal(v.featureTitle,'Head movement in combat');assert.equal(v.plan,'Shoot');assert.equal(v.symbol,'move');
 assert.equal(v.score,70);assert.equal(v.alternatives.length,2);assert.equal(v.event.feature,'A02');
 assert.match(tip(v),/Head movement in combat: Leaning to evade shots/);assert.match(tip(v),/Plan: Shoot/);assert.match(tip(v),/Plan score: 70.0/);
 assert.match(marker(v),/Head movement in combat/);
});
check('queued refused or expired work cannot replace the tactical plan',()=>{
 const pending=ready([shootRow(),leanRow({tiltObserved:false,headMotionObserved:false})]);
 assert.equal(view(pending,1150,'COMET:Shoot',1050).title,'Shoot');
 const expired=view(detailedAction,1800,'COMET:Shoot',1700);
 assert.equal(expired.title,'Shoot');assert.equal(expired.featureTitle,'Visible enemy decisions');assert.equal(expired.plan,'');
 assert.equal(episodes(pending).length,1);
});
check('Ghost and ORBIT never inherit feature names from stale COMET actions',()=>{
 for(const v of [view(detailedAction,1150,'Orbit:ContainerLoot',1120),view(detailedAction,1150,'COMET:Shoot',1050,true)]){
  assert.equal(v.featureTitle,'');assert.equal(v.plan,'');assert.equal(v.badge,false);
 }
});
check('specific readable history remains factual and deterministic on reverse seek',()=>{
 const e=episodes(detailedAction);assert.equal(e[1].featureTitle,'Head movement in combat');assert.equal(e[1].title,'Leaning to evade shots');assert.equal(e[1].status,'Observed intervention');
 const before=view(detailedAction,1150,'COMET:Shoot',1050);view(detailedAction,5000,'Orbit:Loot',4000);
 assert.deepEqual(view(detailedAction,1150,'COMET:Shoot',1050),before);
});
check('recordings without event details keep sampled behavior without invented feature names',()=>{
 const v=view(undefined,1000,'COMET:Shoot',1000);assert.equal(v.title,'Shoot');assert.equal(v.featureTitle,'');
});
check('feature labels and plan names remain escaped in all HTML',()=>{
 const v={...view(detailedAction,1150,'COMET:Shoot',1050),featureTitle:'<script>feature</script>',plan:'<img src=x>',title:'action'};
 assert.doesNotMatch(tip(v),/<script>|<img/);assert.doesNotMatch(marker(v),/<script>/);assert.match(tip(v),/&lt;script/);
});
check('squad feature follows the concrete tactic within the shared crossfire context',()=>{
 const source=fixture('s03-squad-maneuver');
 const e=row(1,1000,'evaluated','Crossfire',{feature:'S03',detail:{botInstance:'one',crossfire:source.crossfire}});
 const record=ready([e]);assert.equal(record.events.length,1);
 assert.equal(episodes(record)[0].featureTitle,'Squad support and coordinated flanking');
});
const stealth=fixture('p02-quiet-presentation');
const quietRow=(id,time,change={})=>row(id,time,'evaluated','QuietApproach',{feature:'P02',detail:{botInstance:'one',quiet:{...stealth.quiet,...change}}});
const silentRow=(id,time,change={})=>row(id,time,'evaluated','SilentSearch',{feature:'P08',detail:{botInstance:'one',silentSearch:{...stealth.silentSearch,...change}}});
const searchRow=()=>row(1,900,'accepted','Search',{detail:{botInstance:'one',candidates:[{decision:'Search',eligible:true,score:65}]}});
check('quiet approach is visible without claiming ownership of native Search',()=>{
 const v=view(ready([quietRow(1,1000)]),1100,'SAIN:Search',900);
 assert.equal(v.title,'Quiet approach (crouch requested)');assert.equal(v.symbol,'quiet');assert.equal(v.badge,true);
 assert.equal(v.owner,'SAIN');assert.equal(v.status,'Movement settings applied');assert.match(v.reason,/Heard the enemy looting/);
 assert.equal(v.score,null);assert.equal(v.destination,null);assert.match(marker(v),/⌁/);assert.match(tip(v),/Quiet approach/);
});
check('quiet execution keeps the general plan and its score and is not buried by routine updates',()=>{
 const r=ready([searchRow(),quietRow(2,1000),row(3,1050,'evaluated','TacticalDevices',{feature:'L02',detail:{botInstance:'one',tacticalDevices:{...fixture('l02-tactical-devices').tacticalDevices,action:'Search'}}})]);
 const v=view(r,1100,'COMET:Search',950);
 assert.equal(v.title,'Quiet approach (crouch requested)');assert.equal(v.plan,'Search');assert.equal(v.score,65);
 assert.equal(v.interventions.length,2);assert.ok(r.events[2].tacticalDevices);
 assert.equal(v.featureTitle,'Quiet approach');assert.match(marker(v),/rr-comet-aux.*⌁/);
});
check('walking approach does not claim crouching or guaranteed silence',()=>{
 const v=view(ready([quietRow(1,1000,{state:'walk',lootBonus:false})]),1100,'SAIN:MoveToEngage',900);
 assert.equal(v.title,'Quiet approach (slower movement)');assert.doesNotMatch(v.reason,/looting|inaudible|undetected/);
});
check('quiet intentions and refusals never become an executed action or readable history',()=>{
 for(const q of [{applied:false},{active:false},{state:'normal',applied:false,active:false}]) {
  const r=ready([quietRow(1,1000,q)]);assert.equal(view(r,1100,'SAIN:Search',900).badge,false);assert.equal(episodes(r).length,0);
 }
});
check('quiet approach expires and is cleared by urgent actions Ghost and handoffs',()=>{
 const r=ready([quietRow(1,1000)]);
 for(const [at,decision,sampled,ghost] of [[999,'SAIN:Search',900,false],[2500,'SAIN:Search',900,false],[1100,'SAIN:Reload',1050,false],[1100,'Orbit:Loot',1050,false],[1100,'SAIN:Search',900,true]])
  assert.equal(view(r,at,decision,sampled,ghost).badge,false);
 assert.equal(view(ready([quietRow(1,1000),control(2,1050,'orbit')]),1100,'SAIN:Search',900).badge,false);
 assert.equal(view(ready([quietRow(1,1000),row(2,1050,'selected','Hold',{detail:{botInstance:'two'}})]),1100,'SAIN:Search',900).badge,false);
});
check('quiet history groups repeated caps then records release without inventing success',()=>{
 const r=ready([quietRow(1,1000),quietRow(2,2000),quietRow(3,2200,{state:'normal',active:false,applied:false,reason:'quiet-native-priority'})]);
 const e=episodes(r);assert.equal(e.length,2);assert.equal(e[0].count,2);assert.equal(e[0].status,'Movement settings applied');assert.equal(e[1].status,'Stopped / released');
 assert.equal(view(r,2250,'SAIN:Search',900).badge,false);
 const before=view(r,1100,'SAIN:Search',900);view(r,2400,'SAIN:Reload',2300);assert.deepEqual(view(r,1100,'SAIN:Search',900),before);
});
check('observed search after silence surfaces purpose and walking without inventing a path',()=>{
 const r=ready([silentRow(1,1000)]),v=view(r,1100,'SAIN:Search',1050);
 assert.equal(v.title,'Walking to the last heard position');assert.equal(v.featureTitle,'Search after silence');assert.match(v.reason,/enemy went quiet for 15/);
 assert.equal(v.destination,null);assert.equal(v.owner,'SAIN');assert.equal(episodes(r)[0].title,v.title);
});
check('search callback alone does not claim observed walking',()=>{
 const v=view(ready([silentRow(1,1000,{walking:false,movementObserved:false})]),1100,'SAIN:Search',1050);
 assert.equal(v.title,'Checking the last heard position');
 assert.equal(view(ready([silentRow(1,1000,{walking:false})]),1100,'SAIN:Search',1050).title,'Searching after the enemy went quiet');
});
check('waiting refused and unexecuted searches stay out of Simple',()=>{
 for(const s of [{state:'waiting',accepted:false,actionObserved:false},{state:'accepted',actionObserved:false},{state:'blocked'},{state:'ended'}]) {
  const r=ready([silentRow(1,1000,s)]);assert.equal(view(r,1100,'SAIN:Search',1050).badge,false);assert.equal(episodes(r).length,0);
 }
});
check('stale silent search does not label another action as a stealth approach',()=>{
 const r=ready([silentRow(1,1000)]);
 for(const [at,decision,sampled,ghost] of [[1100,'SAIN:Reload',1050,false],[1100,'COMET:Shoot',1050,false],[1100,'Orbit:Loot',1050,false],[1100,'SAIN:Search',1050,true],[2500,'SAIN:Search',1050,false]])
  assert.equal(view(r,at,decision,sampled,ghost).interventions.length,0);
});
console.log(`${checks} COMET presentation checks with feature names passed.`);

const measured=fixture('t04-observed-movement');
const motionRow=(id,time,change={},journal={})=>row(id,time,'evaluated','ControlJournal',{feature:'T04',detail:{botInstance:'one',controlJournal:{...measured.controlJournal,...journal,motion:{...measured.controlJournal.motion,...change}}}});
check('actual crouch movement remains visible when quiet approach was refused',()=>{
 const r=ready([searchRow(),quietRow(2,1000,{state:'normal',active:false,applied:false,reason:'quiet-too-far'}),motionRow(3,1050)]);
 const v=view(r,1100,'COMET:Search',1000);
 assert.equal(v.title,'Search');assert.equal(v.score,65);assert.equal(v.movement,'Crouch-walking slowly · 0.6 m/s');
 assert.equal(v.interventions.length,0);assert.match(tip(v),/Observed: Crouch-walking/);
});
check('motion alone never grants COMET ownership a badge or an invented intention',()=>{
 const v=view(ready([motionRow(1,1000)]),1100,'SAIN:Search',900);
 assert.equal(v.owner,'SAIN');assert.equal(v.badge,false);assert.equal(v.score,null);assert.equal(v.interventions.length,0);
 assert.match(v.movement,/Crouch-walking/);assert.doesNotMatch(tip(v),/inaudible|undetected|noise|Quiet approach/);
 assert.equal(episodes(ready([motionRow(1,1000)])).length,0);
});
check('motion survives intervening diagnostics but stops at lifecycle ownership and time boundaries',()=>{
 const motion=motionRow(1,1000),later=row(2,1050,'evaluated','QuietApproach',{feature:'P02',detail:{botInstance:'one',quiet:{...stealth.quiet,applied:false}}});
 const r=ready([motion,later]);assert.match(view(r,1100,'SAIN:Search',900).movement,/Crouch/);
 for(const [at,decision,sampled,ghost] of [[999,'SAIN:Search',900,false],[2500,'SAIN:Search',900,false],[1100,'SAIN:Search',900,true],[1100,'Orbit:Loot',1050,false]])assert.equal(view(r,at,decision,sampled,ghost).movement,'');
 assert.equal(view(ready([motion,control(2,1050,'orbit')]),1100,'SAIN:Search',900).movement,'');
 assert.equal(view(ready([motion,motionRow(2,1050,{}, {owner:'recovery',motion:null})]),1100,'SAIN:Search',900).movement,'');
 assert.equal(view(ready([motion,row(2,1050,'selected','Hold',{detail:{botInstance:'two'}})]),1100,'SAIN:Search',900).movement,'');
 const before=view(r,1100,'SAIN:Search',900);view(r,9000);assert.deepEqual(view(r,1100,'SAIN:Search',900),before);
});
console.log(`${checks} COMET presentation checks including observed movement passed.`);
