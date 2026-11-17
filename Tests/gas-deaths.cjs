const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ts=require('../Private/node_modules/typescript');
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../Private/src/helpers/deathEvents.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,context);
const {legacyGasKills,deathIcon,isGasDeath}=context.exports;
const deaths=['DUSHEN2023','Hua-Qiang-Mai-G'].map(profileId=>({profileId,time:1014659,type:'HotGases'}));
const positions=Object.fromEntries(deaths.map(d=>[d.profileId,[{time:1015000,x:99,y:2,z:99},{time:1014400,x:195,y:1.7,z:-106}]]));
const kills=legacyGasKills(deaths,positions,[]);
assert.equal(kills.length,2);assert.equal(kills[0].time,kills[1].time);
for(const kill of kills){assert.equal(kill.profileId,kill.killedId);assert.equal(JSON.parse(kill.positionKilled).x,195);assert.equal(deathIcon(kill),'/explosion.svg');}
assert.equal(legacyGasKills(deaths,positions,[kills[0]]).length,1);
assert.equal(legacyGasKills([...deaths,...deaths],positions,[]).length,2);
assert.equal(legacyGasKills(deaths,{},[]).length,0);
assert.equal(legacyGasKills([{...deaths[0],type:'Bullet'}],positions,[]).length,0);
assert.equal(legacyGasKills([{...deaths[0],time:NaN}],positions,[]).length,0);
assert.equal(isGasDeath({type:'Bullet'}),false);assert.equal(deathIcon({}),'/skull.png');
console.log('Gas death presentation: map/timeline cause, paired victims, deduplication and missing position checks passed.');
