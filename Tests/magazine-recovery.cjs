const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const ts=require('../Private/node_modules/typescript'),cache=new Map();
function load(file){file=path.resolve(__dirname,file);if(cache.has(file))return cache.get(file);const c={exports:{},require:n=>load(path.resolve(path.dirname(file),n)+'.ts')};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,c);cache.set(file,c.exports);return c.exports;}
const {prepareCometMapEvents:prepare,cometMapState:state,cometTooltipHtml:tooltip}=load('../Private/src/helpers/cometMap.ts');
const {cometPresentation:presentation}=load('../Private/src/helpers/cometPresentation.ts');
const {droppedLootAt,parseMagazineRecovery}=load('../Private/src/helpers/cometMagazineRecovery.ts');
let checks=0;function check(name,f){try{f();checks++}catch(e){e.message=name+': '+e.message;throw e;}}
const rows=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/raid454-magazines.json'),'utf8'));
const profile='6afa0405d740f156ec9eacc5';const record={status:'ready',events:prepare(rows,profile)};
check('historical W04 events survive parsing',()=>assert.equal(record.events.length,rows.filter(r=>r.profileId===profile).length));
check('Cisx returning at 18:40',()=>assert.match(presentation(record,1120000,'9000',1119000,false,{}).title,/Returning for a discarded magazine/));
check('Cisx arrival is not a successful pickup',()=>{const v=state(record,1140000,'9000',1139000,false);assert.equal(v.magazineRecovery.state,'arrived');assert.match(tooltip(v),/Preparing to pick up/);assert.doesNotMatch(tooltip(v),/Magazine recovered/)});
check('Cisx destination remains visible',()=>assert.ok(presentation(record,1140000,'9000',1139000,false,{}).destination));
check('failed pickup ends activity',()=>{const v=state(record,1146000,'9000',1146000,false);assert.equal(v.magazineRecovery.active,false);assert.match(tooltip(v),/recovery failed/)});
check('ghost never shows active recovery',()=>assert.equal(state(record,1140000,'9000',1139000,true).magazineRecovery,undefined));
check('no future drop during rewind',()=>assert.equal(droppedLootAt([],rows,0).length,0));
const id='6afa0404d740f156ec9ea588';
check('failed magazine is still in world',()=>assert.ok(droppedLootAt([],rows,1146000).some(x=>x.itemId===id)));
const event=(stage,time,mag='mag',extra={})=>({id:time,time,profileId:'pmc',cometSession:'s',sequence:time,feature:'W04',decision:'RecoverMagazine',stage,reason:'fixture',detail:{botInstance:'b',magazineRecovery:{magazine:mag,pending:1,x:0,y:1,z:0,...extra}}});
check('zero coordinates remain valid',()=>assert.equal(droppedLootAt([],[event('queued',1000)],1000).length,1));
check('later inventory removal retains physical drop position',()=>{const d=droppedLootAt([{itemId:'mag',time:1001,added:'False',x:9,y:9,z:9}],[event('queued',1000)],2000)[0];assert.equal(d.x,0);assert.equal(d.y,1)});
check('pickup then redrop uses latest mutation',()=>{const loot=[{itemId:'mag',added:'True',time:900},{itemId:'mag',added:'False',time:1100,x:3,y:2,z:4}];assert.equal(droppedLootAt(loot,[],1200).length,1);assert.equal(droppedLootAt(loot,[],1000).length,0)});
check('another bot picking it up removes marker',()=>assert.equal(droppedLootAt([{itemId:'mag',added:'True',time:2000}],[event('queued',1000)],3000).length,0));
for(const stage of ['completed','unavailable'])check(stage+' removes marker',()=>assert.equal(droppedLootAt([],[event('queued',1000),event(stage,2000)],3000).length,0));
for(const stage of ['failed','interrupted','pickup-started','pickup-ready'])check(stage+' does not remove marker',()=>assert.equal(droppedLootAt([],[event('queued',1000),event(stage,2000)],3000).length,1));
check('new queued magazine does not hide active recovery',()=>{const r={status:'ready',events:prepare([event('started',1000),event('queued',1500,'other')],'pmc')};assert.equal(state(r,1600,'9000',1000,false).magazineRecovery.magazine,'mag')});
check('HTML escaped in recovery tooltip',()=>{const r={status:'ready',events:prepare([event('arrived',1000,'<svg>',{itemName:'<script>bad</script>'})],'pmc')};assert.doesNotMatch(tooltip(state(r,1100,'9000',900,false)),/<script>|<svg>/)});
check('native state is not inferred for old arrival events',()=>assert.equal(parseMagazineRecovery({magazine:'mag'},'arrived').pickupStateEntered,false));
console.log(`${checks} magazine replay and ground-loot lifecycle checks passed.`);
