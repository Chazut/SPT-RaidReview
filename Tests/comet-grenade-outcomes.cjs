const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../Private/node_modules/typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('Private/src/helpers/cometGrenadeJudgment.ts','utf8'),
    {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const {parseCometGrenadeJudgment:parse,cometGrenadeJudgmentSummary:summary}=context.exports;
const base={target:'enemy',source:'seen',state:'accepted',reason:'grenade-native-accepted',item:'rgo',
    episode:1,count:1,samples:1,age:0,x:1,y:1,z:1,campSeconds:1,baseChance:50,campBonus:0,roomBonus:0,
    vulnerableBonus:0,lastPenalty:0,fade:1,chance:50,retryRemaining:0,validFor:1,roll:10,
    requested:true,accepted:true,released:false,alternatives:[]};
assert.ok(parse(base),'old recordings still parse');
for(const state of ['unconfirmed','interrupted']) {
    const entry={...base,state,nativeStarted:state==='interrupted',nativePhase:'ready',hands:'FirearmController'};
    assert.ok(parse(entry),'native outcome is retained');
    assert.ok(summary(parse(entry)).some(x=>x.includes('Projectile observed: no')),'acceptance is not release');
    assert.ok(summary(parse(entry)).some(x=>x.includes('FirearmController')),'native phase can be inspected');
    assert.equal(parse({...entry,released:true}),null,'cannot call interrupted event a confirmed projectile');
    assert.equal(parse({...entry,accepted:false}),null,'unconfirmed native return requires acceptance');
}
assert.ok(parse({...base,state:'released',released:true}),'physical confirmation still parses');
console.log('Grenade outcome presentation: 12 checks passed.');
