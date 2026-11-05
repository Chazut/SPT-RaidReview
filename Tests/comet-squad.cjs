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

const {cometSquadMembers:members,currentSquadRoles:roles,buildSquadHistory:build,recentSquadHistory:recent}=load('../Private/src/helpers/cometSquad.ts');
const {cometActionMatches:matches}=load('../Private/src/helpers/cometActionMatch.ts');
const roster=[{profileId:'pmc',name:'Alpha',kind:'pmc',group:0},{profileId:'b',name:'Bravo',kind:'pmc',group:0},{profileId:'h',kind:'player',group:0},{profileId:'s',kind:'scav',group:0},{profileId:'c',kind:'pmc',group:2},{profileId:'missing',kind:'pmc'},{profileId:'missing2',kind:'pmc'}];
const squad=members(roster,'pmc');
check('AI squad zero never includes human or scav',()=>assert.deepEqual(Array.from(squad,x=>x.profileId),['pmc','b']));
check('humans never inherit bot squad',()=>assert.equal(members(roster,'h').length,1));
check('unknown groups remain solo',()=>assert.equal(members(roster,'missing').length,1));
check('missing selection',()=>assert.equal(members(roster,'absent').length,0));
check('string group matches numeric group',()=>assert.equal(members([...roster,{profileId:'d',kind:'pmc',group:'0'}],'pmc').length,3));
for(const [sample,native] of [['COMET:Search','Search'],['COMET:Hold','Freeze'],['COMET:Shoot','StandAndShoot'],['COMET:FallBack','Retreat'],['COMET:Flank','ShiftCover'],['COMET:CrossfireManeuverMoving','Freeze'],['SAIN:Reload','Reload']])check('native action matches '+sample,()=>assert.ok(matches(sample,native)));
for(const [sample,native] of [['Orbit:Search','Search'],['COMET:Search','Freeze'],['COMET:Flank','Search'],['',''],['Vanilla:Search','Search']])check('unrelated actions not matched '+sample,()=>assert.equal(matches(sample,native),false));
const cf=fixture('s03-squad-maneuver').crossfire;
const cross=(id,time,change={},pid='pmc')=>row(id,time,'evaluated','Crossfire',{profileId:pid,feature:change.storm?'S06':change.trade?'S05':change.coverMate?'S04':change.entrance?'S02':change.maneuver===null?'S01':'S03',detail:{botInstance:'one',crossfire:{...cf,...change}}});
const record=ready([cross(1,1000)]);
const samples={pmc:{present:true,decision:'COMET:CrossfireManeuverMoving',time:1000},b:{present:true,decision:'SAIN:Search',time:1000}};
check('confirmed flank role belongs only to actor with execution evidence',()=>{const r=roles(squad,{pmc:record},samples,1100);assert.equal(r.length,1);assert.equal(r[0].role,'Flank');assert.equal(r[0].confirmed,true);assert.equal(r[0].title,'Support and flanking')});
for(const t of [999,2000,8000])check('no future or stale squad role '+t,()=>assert.equal(roles(squad,{pmc:record},samples,t).length,0));
for(const sample of [{present:false},{present:true,ghost:true},{present:true,dormant:true},{present:true,decision:'Orbit:ContainerLoot',time:1050},{present:true,decision:'SAIN:Reload',time:1050}])check('presence or new behavior cancels squad role '+JSON.stringify(sample),()=>assert.equal(roles(squad,{pmc:record},{pmc:sample},1100).length,0));
const planned={...cf,state:'planning',applied:false,reserved:false,validFor:0,maneuver:{...cf.maneuver,confirmed:false}};
const planning=ready([cross(1,1000,planned)]);
check('plan is never presented as executed',()=>{const r=roles(squad,{pmc:planning},samples,1100);assert.equal(r[0].confirmed,false);assert.match(r[0].status,/not confirmed/)});
const stopped={...planned,state:'ended',reason:'crossfire-contact-changed',maneuver:{...planned.maneuver,state:'ended'}};
const stopRecord=ready([cross(1,1000),cross(2,1200,stopped)]);
check('ending cancels squad immediately',()=>assert.equal(roles(squad,{pmc:stopRecord},samples,1200).length,0));
check('nested ended plan never claims execution in history',()=>{const r=ready([cross(1,1000),cross(2,1200,{...planned,maneuver:{...planned.maneuver,state:'ended'}})]);assert.ok(r.events[1].crossfire);assert.equal(roles(squad,{pmc:r},samples,1200).length,0);assert.equal(episodes(r)[1].status,'Ended / interrupted')});
check('history retains stopped reason and does not invent success',()=>{const h=build(squad,{pmc:stopRecord});assert.equal(h.length,2);assert.match(h[1].status,/interrupted/);assert.equal(h[1].event.crossfire.reason,'crossfire-contact-changed')});
check('independent teammate does not appear as flank',()=>assert.equal(roles(squad,{pmc:record},samples,1100).some(r=>r.member.profileId==='b'),false));
check('handoff immediately cancels role',()=>{const r=ready([cross(1,1000),control(2,1050,'orbit')]);assert.equal(roles(squad,{pmc:r},samples,1100).length,0)});
check('instance switch cannot inherit role',()=>{const r=ready([cross(1,1000),row(2,1050,'selected','Hold',{detail:{botInstance:'two'}})]);assert.equal(roles(squad,{pmc:r},samples,1100).length,0)});
const support=ready([cross(1,1000,{state:'holding',maneuver:{...cf.maneuver,role:'support',state:'active'}})]);
check('support has explicit role in bot view and history',()=>{assert.match(view(support,1100,'COMET:CrossfireManeuverSupporting',1000).title,/support$/);assert.match(episodes(support)[0].title,/support$/)});
const rear=ready([cross(1,1000,{state:'holding',maneuver:{...cf.maneuver,role:'rear',state:'active'}})]);
check('rear guard distinct from flanker',()=>assert.equal(roles(squad,{pmc:rear},samples,1100)[0].role,'Rear guard'));
const storm=ready([cross(1,1000,fixture('s06-squad-storm').crossfire)]);
check('coordinated assault is explicitly named',()=>assert.equal(roles(squad,{pmc:storm},samples,1100)[0].title,'Rush a vulnerable enemy'));
for(const name of ['s01-crossfire','s02-secondary-entrance','s04-cover-mate','s05-squad-trade'])check('other squad tactic '+name,()=>{const r=ready([cross(1,1000,{...fixture(name).crossfire,maneuver:null})]);assert.equal(roles(squad,{pmc:r},samples,1100).length,1)});
const h=build(squad,{pmc:ready([cross(1,1000),cross(2,1100),cross(3,1200,stopped)])});
for(const [t,n] of [[999,0],[1000,1],[1150,1],[1200,2],[1000,1]])check('history replay seek '+t,()=>assert.equal(recent(h,t).length,n));
check('grouping does not expose a future update',()=>assert.equal(recent(h,1000)[0].event.time,1000));
check('history remains bounded',()=>assert.equal(recent(Array.from({length:1000},(_,i)=>({...h[0],start:i})),999).length,12));
const devices=fixture('l02-tactical-devices').tacticalDevices;
const light=(id,t,changes={})=>row(id,t,'evaluated','TacticalDevices',{feature:'L02',detail:{botInstance:'one',tacticalDevices:{...devices,...changes}}});
check('COMET Hold keeps confirmed device change with human names',()=>{const v=view(ready([light(1,1000)]),1100,'COMET:Hold',900);assert.ok(v.interventions.some(a=>/SureFire X400.*ON/.test(a.title)));assert.ok(tip(v).includes('ON'))});
check('COMET Search keeps confirmed OFF command',()=>{const c={...devices,target:false,activeDevices:0,action:'Search',accessories:devices.accessories.map(a=>({...a,active:false}))};const r=ready([light(1,1000,c)]);assert.match(view(r,1100,'COMET:Search',900).interventions[0].title,/OFF/);assert.match(episodes(r)[0].title,/OFF/)});
check('device snapshots are not repeated commands',()=>assert.equal(episodes(ready([light(1,1000,{requested:false,accepted:false})])).length,0));
check('unrelated action still hides device command',()=>assert.equal(view(ready([light(1,1000)]),1100,'SAIN:Search',900).badge,false));
const weave=fixture('m11-retreat-weave').retreatWeave;
const weaveRow=(id,t,c={})=>row(id,t,'evaluated','RetreatWeave',{feature:'M11',detail:{botInstance:'one',retreatWeave:{...weave,...c}}});
check('evasive retreat commands visible in replay and history',()=>{const r=ready([weaveRow(1,1000)]),v=view(r,1050,'COMET:FallBack',1000);assert.ok(v.interventions.some(a=>a.title==='Evading while retreating'));assert.match(v.interventions[0].reason,/52/);assert.match(episodes(r)[0].status,/commands applied/)});
check('native or unrequested weave is not an executed tactic',()=>{const r=ready([weaveRow(1,1000,{state:'native',validFor:0,yaw:0,pitch:0,moveRequested:false,gazeRequested:false})]);assert.equal(episodes(r).length,0);assert.equal(view(r,1050,'SAIN:Retreat',1000).badge,false)});
check('role markup escapes display strings',()=>assert.ok(marker(view(record,1100,'COMET:CrossfireManeuverMoving',1000),'<img>').includes('&lt;img&gt;')));
check('auxiliary glyph does not replace core action glyph',()=>{const v=view(ready([row(1,900),light(2,1000)]),1100,'COMET:Hold',900);assert.ok(marker(v).includes('rr-comet-aux'));assert.ok(marker(v).includes('rr-comet-action'))});
console.log(checks+' COMET squad replay checks passed.');
