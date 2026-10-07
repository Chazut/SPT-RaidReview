const fs = require('fs'), vm = require('vm');
const ts = require('../Private/node_modules/typescript');
const source = fs.readFileSync(require.resolve('../Private/src/helpers/mainObjectives.ts'), 'utf8');
const ctx = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, ctx);
const { mainStarted, mainLabel, mainHoldDetail, airdropDetail, findMainSquadEntry: find } = ctx.exports;
let checks = 0;
function check(value, label) { checks++; if (!value) throw new Error(label); }
const main = { type: 'Kills', completed: false };
const drop = { type: 'Airdrop', airdropId: 'crate-1', airdropStage: 'approach', airdropLanded: false, campTargetDuration: 60 };
const entry = (...mains) => ({ squadId: 2, memberProfileIds: ['bot'], mainObjectives: mains });
const data = [
  { time: 0, squads: [entry(main)] },
  { time: 1000, squads: [entry(main, drop)] },
  { time: 2000, squads: [entry(main, { ...drop, airdropStage: 'waiting', campElapsed: 20 })] },
  { time: 3000, squads: [entry(main, { ...drop, airdropStage: 'waiting', airdropLanded: true, campElapsed: 40 })] },
  { time: 4000, squads: [entry(main, { ...drop, airdropStage: 'loot', airdropLanded: true })] },
  { time: 5000, squads: [entry(main)] },
];
const airdrop = time => find(data, 2, time).mainObjectives.find(m => m.type === 'Airdrop');
check(mainLabel(drop) === 'Airdrop' && mainStarted(drop), 'accepted temporary objective is active');
check(!airdrop(999), 'no detour before release decision');
check(airdropDetail(airdrop(1000)) === 'Approach (crate descending)', 'approach before landing');
check(airdropDetail(airdrop(2000)) === 'Waiting for landing (20 / 60s)', 'waiting while airborne');
check(airdropDetail(airdrop(3000)) === 'Waiting (40 / 60s)', 'hold after landing');
check(airdropDetail(airdrop(4000)) === 'Loot', 'looting stage');
check(!airdrop(5000) && !airdrop(9000), 'detour removed after completion');
check(airdropDetail(airdrop(2500)).startsWith('Waiting for landing'), 'rewind restores airborne stage');
check(!airdrop(0), 'rewind hides future detour');
check(find(data.slice(1), 2, 0).mainObjectives.length === 1, 'future fallback excludes temporary objective');
check(!find([], 2, 0), 'old raids without mains');
check(!find(data, 99, 9000), 'unknown squad');
const removed = data.slice(0, 2).concat({ time: 1500, squads: [] });
check(find(removed, 2, 1600).mainObjectives.length === 1, 'squad removal clears detour but preserves ordinary historical goals');
check(find(removed, 2, 1200).mainObjectives.length === 2, 'rewind before removal restores detour');
check(find([{ time: 1000, squads: [entry(drop)] }, { time: 1500, squads: [] }], 2, 1600).mainObjectives.length === 0, 'last squad without ordinary goals clears on empty snapshot');
check(find([{ time: '1000', squads: [entry(drop)] }], 2, 1000).mainObjectives.length === 1, 'database string timestamp');
check(find([...data].reverse(), 2, 3000).mainObjectives[1].airdropLanded, 'snapshot order independent');
check(data[1].squads[0].mainObjectives.length === 2, 'lookup never mutates recorded snapshots');
check(mainLabel(main) === 'Kills' && !mainStarted(main), 'legacy main unchanged');
check(airdropDetail({ ...drop, airdropLanded: true }) === 'Approach', 'landed approach label');
check(mainHoldDetail({ type: 'ExtractCamp', campUntilTimeExtract: true }).includes('Last main'), 'final camp described before approach');
check(mainHoldDetail({ type: 'ExtractCamp', campUntilTimeExtract: true, campStartedAt: 100, campElapsed: 1800 }) === '1800s holding cover; until time-based extraction', 'new camp has no fixed timer');
check(mainHoldDetail({ type: 'ExtractCamp', campTargetDuration: 63 }) === '0 / 63s holding cover', 'historical TiMBo timer preserved');
check(mainHoldDetail({ type: 'Kills', killAmbush: true, killsRoamTargetDuration: 120 }) === '0 / 120s holding cover', 'Kill ambush keeps its budget');
const camp = { type: 'ExtractCamp', campUntilTimeExtract: true, campStartedAt: 1, campElapsed: 30, campHolding: true, campExtractAt: 121000 };
const camps = [{ time: 1000, squads: [entry(camp)] }];
check(mainHoldDetail(find(camps, 2, 21000).mainObjectives[0], 21000) === '50s holding cover; 1:40 until departure', 'timer and holding advance between snapshots');
check(mainHoldDetail(camp, 122000).endsWith('0:00 until departure'), 'deadline clamps at zero');
check(mainHoldDetail({ ...camp, campState: 'paused', campHolding: false }, 61000).includes('Interrupted: Waiting to resume; 1:00'), 'deadline continues during combat');
check(find([{ time: 1000, squads: [entry({ ...camp, campHolding: false })] }], 2, 21000).mainObjectives[0].campElapsed === 30, 'paused holding does not grow');
check(find(camps.concat({ time: 2000, squads: [] }), 2, 21000).mainObjectives[0].campElapsed === 30, 'removed squad does not acquire fictional holding time');
check(find(camps, 2, 500).mainObjectives[0].campElapsed === 30, 'future fallback remains literal');
check(find(camps, 2, 122000).mainObjectives[0].campElapsed === 150, 'hold interpolation ends at departure');
check(camp.campElapsed === 30 && find(camps, 2, 11000).mainObjectives[0].campElapsed === 40, 'rewind is deterministic and snapshots immutable');
check(!mainHoldDetail({ ...camp, completed: true }, 21000).includes('until departure'), 'completed camp has no active countdown');
console.log(`PASS ${checks} main-objective replay checks`);
