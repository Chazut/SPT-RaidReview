const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const ts=require('../Private/node_modules/typescript'),cache=new Map();
function load(file){file=path.resolve(__dirname,file);if(cache.has(file))return cache.get(file);
 const context={exports:{},require:name=>load(path.resolve(path.dirname(file),name)+'.ts')};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,context);
 cache.set(file,context.exports);return context.exports;}
const cf=load('../Private/src/helpers/cometCrossfire.ts'),cs=load('../Private/src/helpers/cometCoverScan.ts');
const {prepareCometMapEvents:prepare}=load('../Private/src/helpers/cometMap.ts');
const {cometEpisodes:episodes}=load('../Private/src/helpers/cometPresentation.ts');
const fixture=name=>JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures',name+'.json'),'utf8'));
let checks=0;function check(test,label){assert.ok(test,label);checks++;}
for(const n of [28,29,36,37,72])check(cf.parseCometCrossfire({...fixture('s01-crossfire').crossfire,candidates:n}),`candidate count ${n}`);
for(const n of [-1,73,Infinity,1.5])check(!cf.parseCometCrossfire({...fixture('s01-crossfire').crossfire,candidates:n}),`invalid count ${n}`);
const trace={...fixture('s03-squad-maneuver').crossfire,state:'ended',applied:false,reserved:false,validFor:0,outcome:'engaged-from-new-angle',sightPose:'crouched',searchPass:'smaller-useful-angle',revalidations:2,revalidation:'route-still-useful'};
trace.maneuver={...trace.maneuver,state:'converging'};
check(cf.parseCometCrossfire(trace),'completed flanker with other squad members still moving');
check(cf.cometCrossfireSummary(trace).some(x=>x.includes('not a confirmed hit')),'positioning outcome is not a claimed kill');
for(const change of [{revalidations:-1},{revalidations:NaN},{sightPose:7},{outcome:'x'.repeat(513)}])check(!cf.parseCometCrossfire({...trace,...change}),'invalid optional fields');
const record={status:'ready',events:prepare([{id:1,time:1000,profileId:'pmc',cometSession:'s',sequence:1,feature:'S03',stage:'evaluated',decision:'Crossfire',reason:'crossfire-angle-engaged',detail:{botInstance:'one',crossfire:trace}}],'pmc')};
check(episodes(record).some(x=>x.status==='Firing angle reached · engaging'),'history labels acquired angle as engagement');
for(const filename of ['s01-adapter-events','s03-adapter-events','cover-fallback-events']){
 const file=path.resolve(__dirname,'../../COMET/artifacts',filename+'.jsonl');
 check(fs.existsSync(file),`production-adapter output exists: ${filename}`);
 const events=fs.readFileSync(file,'utf8').trim().split(/\r?\n/).map(JSON.parse);
 for(const e of events){if(e.crossfire)check(cf.parseCometCrossfire(e.crossfire),JSON.stringify(e));if(e.coverScan)check(cs.parseCometCoverScan(e.coverScan),JSON.stringify(e));}
}
console.log(`${checks} flank continuity and cover fallback replay checks passed`);
