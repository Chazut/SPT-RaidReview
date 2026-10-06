const fs = require('fs'), vm = require('vm'), ts = require('../Private/node_modules/typescript');
const source = fs.readFileSync(require.resolve('../Private/src/helpers/switches.ts'), 'utf8');
const ctx = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, ctx);
const { parseSwitches, groupSwitches, switchAt, switchName, switchAppearance } = ctx.exports;
let checks = 0;
function check(value, label) { checks++; if (!value) throw Error(label); }
const row = (time, sequence, state = 'Shut', switchId = 'power') => ({ time, sequence, state, switchId, name: 'Power', x: 1, y: 2, z: 3 });
const events = parseSwitches([row(500, 3, 'Interacting'), row(0, 1), row(500, 4, 'Open'), row(0, 2, 'Locked', 'gate'), row(1000, 5)]);
check(events.length === 5, 'all transitions parsed and sorted');
const groups = groupSwitches(events), power = groups.find(g => g[0].switchId === 'power');
check(groups.length === 2, 'independent switches');
check(switchAt(power, -1) === null, 'no future fallback');
check(switchAt(power, 0).state === 'Shut', 'initial inactive');
check(switchAt(power, 499).state === 'Shut', 'not activated early');
check(switchAt(power, 500).state === 'Open', 'last sequence wins within same millisecond');
check(switchAt(power, 999).state === 'Open', 'activated persists');
check(switchAt(power, 1000).state === 'Shut', 'automatic shutoff represented');
check(switchAt(power, 600).state === 'Open', 'rewind reactivates');
check(switchAt(power, 100).state === 'Shut', 'rewind restores initial');
check(switchAt([], 500) === null, 'old raids');
check(parseSwitches(null).length === 0, 'missing history');
check(parseSwitches([row(0, 1), row(0, 1)]).length === 1, 'duplicate transport deduped');
for (const invalid of [null, {}, {...row(0, 1), x: null}, {...row(0, 1), z: 'NaN'}, row(-1, 1), row(0, 0), row(0, 1.5), {...row(0, 1), state: 1}, {...row(0, 1), switchId: ''}])
    check(parseSwitches([invalid]).length === 0, 'malformed rows ignored');
check(parseSwitches([{ ...row('200', '7'), x: '1' }])[0].time === 200, 'sqlite text numerics');
check(switchName({...row(0, 1), switchId: 'Shopping_Mall_DesignStuff_00055'}) === 'Mall power', 'known switch label');
check(switchName({...row(0, 1), name: '<script>example</script>'}) === '<script>example</script>', 'unknown label kept as plain text for DOM');
for (const state of ['Open', 'Shut', 'Locked', 'Interacting', 'Unknown']) check(!!switchAppearance(state).label, 'state label');
const mallPower = 'Shopping_Mall_DesignStuff_00055';
const basementIds = ['Enable_Panel_Switch_011', 'Basement_reserve_electric_switcher_lever', 'Error_Button_Switch_011'];
const station = parseSwitches([row(0, 1, 'Shut', mallPower), row(500, 2, 'Open', mallPower),
    ...basementIds.map((id, i) => row(0, i + 3, 'Shut', id))]);
const visibleStation = groupSwitches(station, 'Interchange');
check(visibleStation.length === 1 && visibleStation[0][0].switchId === mallPower, 'only Mall power visible at station');
check(switchAt(visibleStation[0], 500).state === 'Open', 'Mall power transitions preserved');
check(groupSwitches(station, 'rezervbase').length === 4, 'same IDs not hidden on other locations');
check(station.length === 5, 'recorded data preserved');
check(groupSwitches(parseSwitches([row(0, 1, 'Shut', 'Shopping_Mall_DesignStuff_00059')]), 'interchange').length === 1, 'KIBA alarm stays visible');
// Actual IDs from historical raids and installed map scenes, with provenance.
const recorded = require('./fixtures/map-switches-20261005.json');
const expectedCounts = { bigmap: 1, lighthouse: 2, rezervbase: 3, interchange: 6, laboratory: 14, labyrinth: 12 };
for (const [map, count] of Object.entries(expectedCounts)) {
    const fixture = recorded.filter(e => e.location.toLowerCase() === map)
        .map((e, i) => ({ ...row(0, i + 1, 'Shut', e.switchId), name: e.name }));
    check(fixture.length >= count, `${map} fixture has all expected controls`);
    const snapshot = JSON.stringify(fixture);
    const filtered = groupSwitches(parseSwitches(fixture), map);
    check(filtered.length === count, `${map} visible count matches useful controls`);
    check(JSON.stringify(fixture) === snapshot, `${map} raw recording stays intact`);
    check(groupSwitches(parseSwitches(fixture), map.toUpperCase()).length === count, `${map} case-insensitive map`);
    check(groupSwitches(parseSwitches(fixture), 'modded-map').length === fixture.length, `${map} exclusions stay map-scoped`);
    const newControl = row(0, fixture.length + 1, 'Locked', 'custom-mod-power');
    check(groupSwitches(parseSwitches([...fixture, newControl]), map).length === count + 1, `${map} unknown mod controls retained`);
}
const warehouse = 'custom_DesignStuff_00034';
const customs = parseSwitches([row(0, 1, 'Shut', warehouse), row(500, 2, 'Open', warehouse),
    row(0, 3, 'Shut', 'switch_custom_Light_00000'), row(200, 4, 'Open', 'switch_custom_Light_00000')]);
const customsVisible = groupSwitches(customs, 'Customs');
check(customsVisible.length === 1, 'Customs alias filters all light transitions');
check(switchAt(customsVisible[0], 700).state === 'Open', 'ZB-013 activation preserved');
check(switchAt(customsVisible[0], 100).state === 'Shut', 'ZB-013 rewind preserved');
check(groupSwitches([row(0, 1, 'Shut', '00455')], 'Reserve').length === 0, 'Reserve alias filters timer');
for (const id of ['autoId_00000_D2_LEVER', '00453', 'autoId_00632_EXFIL'])
    check(groupSwitches([row(0, 1, 'Shut', id)], 'rezervbase').length === 1, `${id} Reserve player control retained`);
for (const id of ['Use', 'set_valve_01', 'disable_traps_01', 'switch_Labyrinth_DesignStaff_00006'])
    for (const map of ['laboratory', 'labyrinth', 'factory4_day', 'factory4_night', 'shoreline', 'woods', 'tarkovstreets', 'sandbox', 'sandbox_high'])
        check(groupSwitches([row(0, 1, 'Locked', id)], map).length === 1, `${map} ${id} controls remain visible even when locked`);
check(groupSwitches([row(0, 1, 'Shut', 'switch_custom_Light_99999')], 'bigmap').length === 1, 'unverified ID is not hidden by a broad prefix');
check(switchName({...row(0, 1), switchId: 'Shopping_Mall_DesignStuff_00058'}) === 'Mall alarm control', 'second useful alarm console labelled');
for (const id of ['inner_buffer_trigger', 'outside_buffer_trigger'])
    check(groupSwitches([row(0, 1, 'Shut', id)], 'lighthouse').length === 1, 'Lighthouse gate player controls retained');
check(switchName(row(0, 1, 'Shut', 'autoId_00632_EXFIL'), 'laboratory') === 'Hangar gate button', 'Labs does not reuse the Reserve lever label');
check(switchName(row(0, 1, 'Shut', 'autoId_00632_EXFIL'), 'Reserve') === 'Hermetic door lever', 'Reserve label preserved');
check(groupSwitches([row(0, 1)], 'constructor').length === 1, 'unknown map name cannot resolve an inherited property');
console.log(`PASS ${checks} switch replay checks`);
