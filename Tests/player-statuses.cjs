const fs = require('fs'), vm = require('vm');
const ts = require('../Private/node_modules/typescript');
const assert = require('node:assert/strict');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../Private/src/helpers/playerStatuses.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, context);
const { finalPlayerStatuses } = context.exports;
const sample = (profileId, time, status) => ({ profileId, time, status });
let checks = 0;
function check(samples, id, expected, message) {
    assert.equal(finalPlayerStatuses(samples).get(id), expected, message);
    checks++;
}

// Raid 208: both Scavs still had 440 HP at 805497 ms. Other bots' later
// transitions cannot turn their single Alive packet into an extraction.
for (const [id, time] of [['foma', 427467], ['noys', 562980], ['early-spawn', 2380]]) {
    check([sample(id, time, 'Alive'), sample('other', 741390, 'Dead')], id, 'Alive', 'old Alive remains valid');
}
check([sample('bot', 0, 'Alive')], 'bot', 'Alive', 'spawn at time zero');
check([sample('bot', 100, 'Alive'), sample('bot', 200, 'Dead')], 'bot', 'Dead', 'recorded death');
check([sample('bot', 300, 'Unspawned'), sample('bot', 200, 'Dead'), sample('bot', 100, 'Alive')], 'bot', 'Dead', 'removal after death, unsorted packets');
check([sample('bot', 100, 'Unknown'), sample('bot', 200, 'Alive')], 'bot', 'Alive', 'early unknown before spawn');
check([sample('bot', 200, 'Alive'), sample('bot', 100, 'Unknown')], 'bot', 'Alive', 'latest time wins over input order');
check([sample('bot', '100', 'Alive'), sample('bot', '200', 'Unspawned')], 'bot', 'Unspawned', 'real removal and string timestamps');
check([sample('bot', 100, 'Alive'), sample('bot', 200, 'Unknown')], 'bot', 'Unknown', 'preserve legacy terminal status');
check([sample('bot', 100, 'Alive'), sample('bot', NaN, 'Unspawned')], 'bot', 'Alive', 'invalid timestamp is not removal');
for (const [value, expected] of [[0, 'Alive'], [1, 'Dead'], [2, 'Unspawned'], [3, 'Unknown']]) {
    check([sample('bot', 100, value)], 'bot', expected, 'numeric enum');
    check([sample('bot', 100, String(value))], 'bot', expected, 'serialized numeric enum');
}
check([], 'missing', undefined, 'no packet is not evidence of extraction');
assert.equal(finalPlayerStatuses().size, 0); checks++;
const frozen = Object.freeze([Object.freeze(sample('bot', 100, 'Alive'))]);
check(frozen, 'bot', 'Alive', 'recorded data remains unchanged');

// Optional local replay fixture exported read-only from RR; never modifies raids.
if (process.argv[2]) {
    const raids = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
    for (const raid of raids) {
        const result = finalPlayerStatuses(raid.statuses);
        for (const id of raid.falseExtracted) {
            assert.equal(result.get(id), 'Alive', `raid ${raid.id}, living ${id}`); checks++;
        }
        for (const id of raid.dead) {
            assert.equal(result.get(id), 'Dead', `raid ${raid.id}, death ${id}`); checks++;
        }
        for (const id of raid.removed) {
            assert.equal(result.get(id), 'Unspawned', `raid ${raid.id}, removal ${id}`); checks++;
        }
        console.log(`Raid ${raid.id}: ${raid.falseExtracted.length} living bots corrected, ${raid.dead.length} deaths and ${raid.removed.length} removals preserved`);
    }
}
console.log(`${checks} player-status checks passed`);
