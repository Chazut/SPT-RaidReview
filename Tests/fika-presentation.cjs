const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('node:assert/strict');
const ts = require('../Private/node_modules/typescript');
function load(file) {
    const filename = path.resolve(__dirname, file);
    const context = { exports: {}, require: name => {
        let target = path.resolve(path.dirname(filename), name);
        if (name.endsWith('.json')) return require(target);
        target += fs.existsSync(target + '.ts') ? '.ts' : '.tsx';
        return load(path.relative(__dirname, target));
    }};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        fileName: filename,
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true }
    }).outputText, context);
    return context.exports;
}
const {playerGroupKey} = load('../Private/src/helpers/playerIdentity.ts');
const {buildPmcIndexMap, getPlayerColor} = load('../Private/src/helpers/players.tsx');
const {playerEndTimes} = load('../Private/src/helpers/playerPresence.ts');
let checks = 0;
const check = (actual, expected) => { assert.equal(actual, expected); checks++; };
const ben = {profileId:'ben',type:'HUMAN',team:'Usec',group:0};
const paul = {profileId:'paul',type:'HUMAN',team:'Bear',group:0};
const ai = {profileId:'kiyomi',type:'PMC',team:'Usec',group:0};
const squadmate = {...ai,profileId:'other-ai'};
check(playerGroupKey(ben), playerGroupKey(paul));
check(playerGroupKey(ben) === playerGroupKey(ai), false);
check(playerGroupKey(ai), playerGroupKey(squadmate));
check(playerGroupKey({...paul,type:'PMC',mod_SAIN_brain:'PLAYER'}), 'players');
check(playerGroupKey({...ben,type:'PMC'},'ben'), 'players');
const indexes = buildPmcIndexMap([ben, paul, ai, squadmate]);
check(indexes.ben, 1);check(indexes.paul, 2);check(indexes.kiyomi, 1);check(indexes['other-ai'], 2);
check(getPlayerColor(ben,0),getPlayerColor(paul,1));
check(getPlayerColor(ben,0)===getPlayerColor(ai,2),false);
check(getPlayerColor(ai,2),getPlayerColor(squadmate,3));

// A downed marker remains present through revival; true death/extraction still end it.
const positions = {ben:[{time:0},{time:1500000}],paul:[{time:0},{time:1016885},{time:1017097},{time:1025000},{time:1480000}]};
for(const state of ['Downed',5,'5']) {
    const statuses = [{profileId:'paul',time:1017097,status:state},{profileId:'paul',time:1025000,status:'Alive'},
        {profileId:'paul',time:1480000,status:'Extracted'}];
    check(playerEndTimes(positions,statuses).paul,1480000);
}
check(playerEndTimes(positions,[],[{killedId:'paul',time:1300000}]).paul,1300000);
console.log(`${checks} Fika presentation checks passed`);
