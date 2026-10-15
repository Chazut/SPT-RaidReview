const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../Private/node_modules/typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../Private/src/helpers/playerStatuses.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, context);
const { finalPlayerStatuses, peakActiveBots } = context.exports;
let checks = 0;
const check = (actual, expected) => { assert.equal(actual, expected); checks++; };
const samples = [
    { profileId: 'survivor', time: 100, status: 'Alive' },
    { profileId: 'survivor', time: 10000, status: 'Unspawned' },
    { profileId: 'dead', time: 300, status: 'Dead' },
    { profileId: 'dead', time: 10000, status: 'Unspawned' },
    { profileId: 'early', time: 100, status: 'Alive' },
    { profileId: 'early', time: 9999, status: 'Unspawned' },
];
check(finalPlayerStatuses(samples, 10000).get('survivor'), 'Alive');
check(finalPlayerStatuses(samples, 10000).get('dead'), 'Dead');
check(finalPlayerStatuses(samples, 10000).get('early'), 'Unspawned');
check(finalPlayerStatuses([...samples].reverse(), 10000).get('survivor'), 'Alive');
check(finalPlayerStatuses(samples).get('survivor'), 'Unspawned');
check(finalPlayerStatuses([{ profileId: 'unknown', time: 10000, status: 'Unspawned' }], 10000).get('unknown'), 'Unspawned');
check(finalPlayerStatuses([{profileId:'bot',time:'1',status:0},{profileId:'bot',time:'10000',status:2}],10000).get('bot'), 'Alive');
check(peakActiveBots([
    {profileId:'human',time:0,status:'Alive'}, {profileId:'a',time:100,status:'Alive'},
    {profileId:'b',time:200,status:'Alive'}, {profileId:'a',time:300,status:'Alive'},
    {profileId:'a',time:400,status:'Dead'}, {profileId:'c',time:500,status:'Alive'},
], ['human']), 2);
check(peakActiveBots(), 0);
if (process.argv[2]) {
    for (const fixture of JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))) {
        if (![274,276].includes(fixture.raid.id)) continue;
        const end = Number(fixture.raid.timeInRaid);
        const result = finalPlayerStatuses(fixture.statuses, end);
        const cleanup = fixture.statuses.filter(s => s.status === 'Unspawned' && Number(s.time) === end);
        for (const sample of cleanup) check(result.get(sample.profileId), 'Alive');
        for (const sample of fixture.statuses.filter(s => s.status === 'Dead')) check(result.get(sample.profileId), 'Dead');
        for (const sample of fixture.statuses.filter(s => s.status === 'Unspawned' && Number(s.time) < end)) check(result.get(sample.profileId), 'Unspawned');
        console.log(`Raid ${fixture.raid.id}: ${cleanup.length} teardown removals no longer shown as extractions`);
    }
}
console.log(`${checks} headless display checks passed`);
