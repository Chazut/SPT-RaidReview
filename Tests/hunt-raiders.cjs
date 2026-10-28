const fs = require('fs'), path = require('path'), vm = require('vm');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const ts = require('../Private/node_modules/typescript');
const root = path.resolve(__dirname, '..');
const privateRequire = createRequire(path.join(root, 'Private/package.json'));
const cache = new Map();
function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file);
    const context = { exports: {}, require: name => {
        if (!name.startsWith('.')) return privateRequire(name);
        const next = path.resolve(path.dirname(file), name);
        if (next.endsWith('.json')) return JSON.parse(fs.readFileSync(next, 'utf8'));
        return load(['.ts', '.tsx'].map(ext => next + ext).find(p => fs.existsSync(p)));
    } };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
    }).outputText, context, { filename: file });
    cache.set(file, context.exports);
    return context.exports;
}
const players = load(path.join(root, 'Private/src/helpers/players.tsx'));
function functions(file, names) {
    const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const found = [];
    function visit(node) {
        if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) found.push(node.getText(source));
        if (ts.isVariableDeclaration(node) && names.includes(node.name?.text)) found.push('const ' + node.getText(source) + ';');
        ts.forEachChild(node, visit);
    }
    visit(source);
    assert.equal(found.length, names.length);
    const context = { ...players, ...load(path.join(root, 'Private/src/helpers/playerIdentity.ts')),
        raid: { profileId: 'host' }, getIsbDisplayName: () => '' };
    vm.runInNewContext(ts.transpileModule(found.join('\n'), {
        compilerOptions: { target: ts.ScriptTarget.ES2020 }
    }).outputText, context);
    return context;
}
const map = functions('Private/src/component/MapComponent.tsx', ['classifyPlayer', 'getPlayerBrain', 'getPlayerDifficultyAndBrain']);
const overview = functions('Private/src/pages/V2/RaidOverview.tsx', ['getPlayerBrain', 'getPlayerDifficultyAndBrain',
    'getFactionBadge', 'FACTION_COLORS', 'SIDE_COLORS']);
const charts = functions('Private/src/pages/V2/RaidCharts.tsx', ['getFactionGroup']);
let checks = 0;
function equal(actual, expected) { assert.equal(actual, expected); checks++; }
function bot(type) { return Object.freeze({ type, team: 'Savage', name: 'Test', group: 3, mod_SAIN_brain: 'normal', mod_SAIN_difficulty: 'normal' }); }
function hunter(player) {
    const raw = player.type;
    equal(players.resolveBotType(player), 'RAIDER');
    equal(players.getPlayerFaction(player), 'Raider');
    equal(players.getPlayerColor(player, 0), '#FF00FF');
    equal(players.getMarkerLabel(player), 'Rd');
    equal(players.getFactionRole(player), 'Raider (Hunter)');
    equal(map.classifyPlayer(player), 'SPECIAL');
    equal(map.getPlayerDifficultyAndBrain(player), 'normal - Raider (Hunter)');
    equal(overview.getPlayerBrain(player), 'RAIDER');
    equal(overview.getPlayerDifficultyAndBrain(player), 'normal - Raider (Hunter)');
    equal(charts.getFactionGroup(players.getPlayerFaction(player)), 'Raider/Rogue');
    equal(player.type, raw);
}
hunter(bot('UNTAR HUNTER|UNTAR'));
hunter(bot('RAIDER HUNTER|RAIDER'));
for (const role of ['GUARD', 'SQUAD LEADER', 'MARKSMAN', 'OFFICER']) {
    const player = bot(`UNTAR ${role}|UNTAR`);
    equal(players.isRaiderHunter(player), false);
    equal(players.resolveBotType(player), 'UNTAR');
    equal(players.getPlayerColor(player, 0), '#00BFFF');
    equal(players.getMarkerLabel(player), 'U');
    equal(map.classifyPlayer(player), 'FACTION');
    equal(overview.getPlayerBrain(player), 'UNTAR');
    equal(charts.getFactionGroup(players.getPlayerFaction(player)), 'Factions');
}
const raider = bot('RAIDER|FOLLOWER');
equal(players.isRaiderHunter(raider), false);
equal(map.getPlayerDifficultyAndBrain(raider), 'normal - Raider');
equal(players.getPlayerColor(raider, 0), '#FF00FF');
equal(players.getMarkerLabel(raider), 'Rd');
equal(players.isRaiderHunter(bot('RUAF HUNTER|RUAF')), false);
equal(players.isRaiderHunter(undefined), false);
equal(players.resolveBotType(undefined), 'UNKNOWN');
if (process.argv[2]) {
    const recorded = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
    for (const row of recorded) hunter(Object.freeze({ ...bot(row.type), ...row, mod_SAIN_difficulty: 'normal' }));
    console.log(`${recorded.length} recorded hunt raiders replayed without mutating stored types`);
}
console.log(`${checks} hunt-raider display checks passed`);

// Replay old HUMAN rows with the incorrect PMC/SCAV brain as well as new rows.
for (const team of ['Bear', 'Usec', 'Savage']) {
    for (const mod_SAIN_brain of ['PMC', 'SCAV', 'PLAYER', 'UNKNOWN']) {
        const human = Object.freeze({ ...bot('HUMAN'), profileId: 'remote', team, mod_SAIN_brain });
        equal(overview.getPlayerBrain(human), 'PLAYER');
        equal(overview.getPlayerDifficultyAndBrain(human), 'PLAYER');
        equal(overview.getFactionBadge(human, false).label.toUpperCase(), 'PLAYER');
        equal(map.getPlayerBrain(human), 'PLAYER');
        equal(map.getPlayerDifficultyAndBrain(human), 'PLAYER');
    }
}
equal(overview.getFactionBadge({...bot('BOT'),team:'Bear'},false).label, 'BEAR #3');
equal(overview.getFactionBadge({...bot('BOT'),team:'Usec'},false).label, 'USEC #3');
equal(overview.getFactionBadge({...bot('BOT'),profileId:'host'},true).label.toUpperCase(), 'PLAYER');
equal(overview.getPlayerDifficultyAndBrain({...bot('BOT'),profileId:'host'}), 'PLAYER');
equal(overview.isHumanPlayer({...bot('SCAV|SCAV'),profileId:'ai'}, 'host'), false);
equal(overview.isHumanPlayer({...bot('PLAYER_SCAV'),profileId:'ai'}, 'host'), false);
console.log(`${checks} combined bot and Fika human display checks passed`);
