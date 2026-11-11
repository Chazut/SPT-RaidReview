const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('node:assert/strict');
const modules = path.resolve(__dirname, '../Private/node_modules');
const ts = require(modules + '/typescript'), React = require(modules + '/react');
const { renderToStaticMarkup: render } = require(modules + '/react-dom/server');
const cache = new Map();
function load(file) {
    file = path.resolve(__dirname, file);
    if (cache.has(file)) return cache.get(file);
    const context = { exports: {}, require: name => {
        if (name.endsWith('.css')) return {};
        if (!name.startsWith('.')) return require(path.join(modules, name));
        const base = path.resolve(path.dirname(file), name);
        return load(['.ts', '.tsx'].map(ext => base + ext).find(fs.existsSync));
    }};
    cache.set(file, context.exports);
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 }
    }).outputText, context);
    return context.exports;
}
const { prepareCometMapEvents: prepare } = load('../Private/src/helpers/cometMap.ts');
const { symbolText, cometPresentation } = load('../Private/src/helpers/cometPresentation.ts');
const Panel = load('../Private/src/component/CometReplayPanel.tsx').default;
const Squad = load('../Private/src/component/CometSquadPanel.tsx').default;
const Legend = load('../Private/src/component/CometLegend.tsx').default;
const ready = id => ({ status: 'ready', events: prepare([{
    id: 1, time: 1000, profileId: id, cometSession: 's', sequence: 1, feature: 'A01', stage: 'accepted', decision: 'Hold', reason: 'new-contact',
    detail: { botInstance: 'one', contact: { target: 'enemy', source: 'heard', age: 2, distance: 20 },
        candidates: [{ decision: 'Hold', eligible: true, score: 70, fearDelta: 5 }, { decision: 'Push', eligible: false, reason: 'unsafe-push' }] }
}], id) });
let checks = 0;
function check(name, run) { try { run(); checks++ } catch (e) { e.message = name + ': ' + e.message; throw e } }
const noop = () => {}, record = ready('pmc');
const botProps = { name: 'Test PMC', record, time: 2200, decision: 'COMET:Hold', sampledAt: 2000, ghost: false,
    names: {}, mode: 'simple', setMode: noop, available: true, showDestination: true, setShowDestination: noop,
    onClose: noop, profileId: 'pmc', tab: 'bot', setTab: noop, squad: null, onSeek: noop };
check('simple keeps the score and reason visible but folds explanations and history', () => {
    const html = render(React.createElement(Panel, botProps));
    assert.match(html, /Score <strong>70\.0/);
    assert.match(html, /Why this action\?/);
    assert.match(html, /Push/); // Still available inside the disclosure.
    assert.match(html, /Recent COMET actions/);
    assert.doesNotMatch(html, /<details[^>]*\bopen/);
    assert.doesNotMatch(html, /Full diagnostics/);
});
check('debug opens details and retains full diagnostics', () => {
    const html = render(React.createElement(Panel, { ...botProps, mode: 'debug' }));
    assert.ok((html.match(/<details[^>]*\bopen/g) || []).length >= 3);
    assert.match(html, /Full diagnostics/);
});
const members = ['active', 'orbit', 'native', 'pending', 'ghost', 'gone'].map(profileId => ({ profileId, name: profileId, kind: 'pmc', group: 1 }));
const records = Object.fromEntries(members.map(m => [m.profileId, ready(m.profileId)]));
const samples = {
    active: { present: true, time: 2100, decision: 'COMET:Hold' },
    orbit: { present: true, time: 2100, decision: 'Orbit:ContainerLoot' },
    native: { present: true, time: 2100, decision: 'SAIN:Reload' },
    pending: { present: true, time: 900, decision: 'SAIN:Search' },
    ghost: { present: true, time: 2100, decision: 'COMET:Hold', dormant: true },
    gone: { present: false, time: 2100, decision: 'COMET:Hold' },
};
const squadProps = { members, records, roles: [], samples, time: 2200, names: {}, mode: 'simple', onSeek: noop, onSelect: noop, selectedProfileId: 'active' };
check('squad shows every current action with the same ownership as the Bot panel', () => {
    const html = render(React.createElement(Squad, squadProps));
    const buttons = html.match(/<button[^>]*aria-pressed[^>]*>[\s\S]*?<\/button>/g).slice(0, members.length);
    for (let i = 0; i < 4; i++) {
        const id = members[i].profileId, sample = samples[id];
        const expected = cometPresentation(records[id], 2200, sample.decision, sample.time, false, {});
        assert.ok(buttons[i].includes(expected.title), id + ': action missing');
        assert.ok(buttons[i].includes(expected.owner), id + ': wrong owner');
    }
    assert.match(buttons[1], /ORBIT/);
    assert.match(buttons[3], /execution not yet observed/);
    assert.match(buttons[4], /Ghost/); assert.doesNotMatch(buttons[4], /Hold|COMET/);
    assert.match(buttons[5], /Not present/); assert.doesNotMatch(buttons[5], /Hold|COMET/);
    assert.doesNotMatch(html, /<details[^>]*\bopen/);
});
check('squad still shows recorded native behavior when COMET data is unavailable', () => {
    const html = render(React.createElement(Squad, { ...squadProps, members: [members[1]], records: { orbit: { status: 'unavailable', events: [] } } }));
    assert.match(html, /ORBIT/); assert.match(html, /Looking for loot/);
});
check('squad role supplements the action instead of replacing it', () => {
    const html = render(React.createElement(Squad, { ...squadProps, roles: [{ member: members[0], event: {}, title: 'Crossfire', role: 'Support', status: 'Executing', confirmed: true, plan: 'test', target: '', reason: 'Test' }] }));
    assert.match(html, /Support · Executing/); assert.match(html, /rr-comet-member-action">◇ Hold<\/span>/); assert.match(html, /<span>Decisions after losing sight of an enemy<\/span>/);
});
check('legend includes every marker glyph and perception cues', () => {
    const html = render(React.createElement(Legend));
    for (const glyph of [...Object.values(symbolText), '✦', '!', '?']) assert.ok(html.includes('<b>' + glyph + '</b>'), glyph);
    assert.match(html, /Plan/);
});
check('Ghost keeps its sampled ORBIT objective, never stale COMET control', () => {
    for (const decision of ['Orbit:ContainerLoot','Orbit:LooseLoot','Orbit:Exfil','Orbit:Guarding','Orbit:Synthetic']) {
        for (const flag of ['ghost','dormant']) {
            const sample={present:true,time:2100,decision,[flag]:true};
            const view=cometPresentation(records.ghost,2200,decision,2100,true,{});
            const html=render(React.createElement(Squad,{...squadProps,members:[members[4]],samples:{ghost:sample}}));
            assert.match(html,/Ghost \/ ORBIT/);assert.ok(html.includes(view.title));
            assert.notEqual(view.title,'Sleeping');assert.equal(view.badge,false);assert.equal(view.interventions.length,0);
            assert.doesNotMatch(html,/Hold|COMET \/ SAIN/);
        }
    }
});
console.log(`${checks} COMET panel checks passed.`);

check('specific intervention leads the panel while the score stays attached to its tactical plan', () => {
    const lean = JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/m04-combat-lean.json'),'utf8')).combatLean;
    const base = { id:1,time:1000,profileId:'pmc',cometSession:'s',sequence:1,feature:'A02',stage:'accepted',decision:'Shoot',reason:'new-contact',detail:{botInstance:'one',candidates:[{decision:'Shoot',eligible:true,score:70}]} };
    const record = {status:'ready',events:prepare([base,{...base,id:2,time:2100,feature:'M04',stage:'evaluated',decision:'CombatLean',detail:{botInstance:'one',combatLean:lean}}],'pmc')};
    const html = render(React.createElement(Panel,{...botProps,record,decision:'COMET:Shoot'}));
    assert.match(html, /<h4>.*Leaning to evade shots<\/h4>/);
    assert.match(html, /rr-comet-action-detail">Head movement in combat/);
    assert.match(html, /Plan: Shoot/); assert.match(html, /Plan score <strong>70\.0/);
    assert.match(html, /Why this plan \(Shoot\)\?/);
    assert.doesNotMatch(html, /<details[^>]*\bopen/);
    const squad = render(React.createElement(Squad,{...squadProps,members:[{profileId:'pmc',name:'Test PMC',kind:'pmc',group:1}],records:{pmc:record},samples:{pmc:{present:true,time:2000,decision:'COMET:Shoot'}}}));
    assert.match(squad,/Head movement in combat/); assert.match(squad, /Leaning to evade shots/); assert.match(squad,/Plan: Shoot/);
});
console.log(`${checks} COMET panel checks with feature names passed.`);
const quietFixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/p02-quiet-presentation.json'),'utf8'));
const motionFixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/t04-observed-movement.json'),'utf8'));
const quietEvent={id:2,time:2100,profileId:'pmc',cometSession:'s',sequence:2,feature:'P02',stage:'evaluated',decision:'QuietApproach',detail:{botInstance:'one',quiet:quietFixture.quiet}};
const motionEvent={...quietEvent,id:3,sequence:3,feature:'T04',decision:'ControlJournal',detail:{botInstance:'one',controlJournal:motionFixture.controlJournal}};
check('quiet approach and actual native crouch motion render in Simple and squad with readable labels',()=>{
 const record={status:'ready',events:prepare([quietEvent,motionEvent],'pmc')};
 const html=render(React.createElement(Panel,{...botProps,record,decision:'SAIN:Search',sampledAt:2000}));
 assert.match(html,/<h4>.*Quiet approach \(crouch requested\)/);assert.match(html,/Observed: Crouch-walking slowly/);
 assert.doesNotMatch(html,/<details[^>]*\bopen|Full diagnostics|poseCap|nativePose/);
 const squad=render(React.createElement(Squad,{...squadProps,members:[{profileId:'pmc',name:'Test PMC',kind:'pmc',group:1}],records:{pmc:record},samples:{pmc:{present:true,time:2000,decision:'SAIN:Search'}}}));
 assert.match(squad,/Quiet approach/);assert.match(squad,/Observed: Crouch-walking slowly/);
});
check('old records without locomotion do not invent crouched movement',()=>{
 const html=render(React.createElement(Panel,{...botProps,record:{status:'ready',events:prepare([quietEvent],'pmc')},decision:'SAIN:Search'}));
 assert.doesNotMatch(html,/Observed: Crouch|0\.6 m\/s/);assert.match(html,/crouch requested/);
});
console.log(`${checks} COMET panel checks including locomotion passed.`);
