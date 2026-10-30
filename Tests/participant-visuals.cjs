const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('node:assert/strict');
const ts = require('../Private/node_modules/typescript');
const cache = new Map();
function load(filename) {
    filename = path.resolve(__dirname, filename);
    if (cache.has(filename)) return cache.get(filename);
    const context = { exports: {}, require: name => {
        if (!name.startsWith('.')) return require('../Private/node_modules/' + name);
        const target = path.resolve(path.dirname(filename), name);
        if (name.endsWith('.json')) return require(target);
        return load(target + (fs.existsSync(target + '.ts') ? '.ts' : '.tsx'));
    }};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
    }).outputText, context);
    cache.set(filename, context.exports);
    return context.exports;
}
const { createPlayerColorResolver, getParticipantKind, buildPmcIndexMap, getLegendIcon } = load('../Private/src/helpers/players.tsx');
const { participantMarkerHtml } = load('../Private/src/helpers/participantMarkers.ts');
const { PMC_COLORS } = load('../Private/src/helpers/groupColors.ts');
let checks = 0;
function check(name, body) { body(); checks++; }
const pmc = (id, group) => ({ profileId: id, group, type: 'PMC|USEC', team: 'Usec' });
const human = { ...pmc('host', 0), type: 'HUMAN' };
const remote = { ...pmc('remote', 0), mod_SAIN_brain: 'PLAYER' };
const scav = { profileId: 'scav', type: 'SCAV|SCAV', team: 'Savage', group: 0 };
const aiScav = { ...scav, profileId: 'ai-scav', type: 'PLAYER_SCAV|SCAV' };
const boss = { ...pmc('boss', 0), type: 'KNIGHT|GOON', name: 'Knight' };
const roster = [human, remote, pmc('a', 0), pmc('mate', 0), pmc('b', 47), pmc('c', 50000), scav, aiScav, boss];
const original = JSON.stringify(roster);
const color = createPlayerColorResolver(roster, 'host');
check('Palette has no repeated colors', () => assert.equal(new Set(PMC_COLORS).size, PMC_COLORS.length));
check('Same squad shares color', () => assert.equal(color(roster[2], 2), color(roster[3], 3)));
check('Old modulo collision and sparse IDs no longer share colors', () => assert.equal(new Set([2,4,5].map(i => color(roster[i],i))).size, 3));
check('Humans share co-op color, separate from AI group zero', () => {
    assert.equal(color(human,0),color(remote,1)); assert.notEqual(color(human,0),color(roster[2],2));
});
check('Roster sorting and different pages keep assignment stable', () => {
    const reverse = createPlayerColorResolver([...roster].reverse(), 'host');
    roster.forEach((p,i) => assert.equal(color(p,i), reverse(p,roster.length-i-1)));
});
check('No palette wrap after 48 groups', () => {
    const many = Array.from({length:150},(_,i) => pmc('p'+i, 'squad-'+(i*47)));
    const pick = createPlayerColorResolver(many);
    assert.equal(new Set(many.map(pick)).size, many.length);
});
check('Empty raid and unknown participant are safe', () => assert.equal(createPlayerColorResolver([])(undefined,0),'#999'));
check('Color construction does not mutate recordings', () => assert.equal(JSON.stringify(roster),original));
check('Host and legacy Fika human are players', () => [human,remote,{...remote,team:'Savage'}].forEach(p=>assert.equal(getParticipantKind(p),'player')));
check('PMC, Scav and AI player scav remain distinct from humans', () => {
    assert.equal(getParticipantKind(roster[2]),'pmc'); assert.equal(getParticipantKind(scav),'scav'); assert.equal(getParticipantKind(aiScav),'scav');
});
check('Special bots with a PMC side are not numbered as PMCs', () => {
    assert.equal(getParticipantKind(boss),'other'); assert.equal(buildPmcIndexMap(roster).boss,undefined);
});
check('Human numbering remains separate from squad zero', () => {
    const indexes = buildPmcIndexMap(roster); assert.equal(indexes.host,1); assert.equal(indexes.remote,2); assert.equal(indexes.a,1); assert.equal(indexes.mate,2);
});
check('Map and legend use identical accessible role shapes', () => {
    for (const [p,kind] of [[human,'player'],[roster[2],'pmc'],[scav,'scav']]) {
        const html = getLegendIcon(p,color(p,0),1).props.dangerouslySetInnerHTML.__html;
        assert.ok(html.includes('rr-marker-'+kind)); assert.ok(html.includes('aria-label='));
    }
    assert.ok(participantMarkerHtml('player','#D9C48A').includes('M12 2 L22 12'));
    assert.ok(participantMarkerHtml('pmc','#4E9BFF').includes('<circle'));
    assert.ok(participantMarkerHtml('scav','#33FF57').includes('M12 3 L22 21'));
});
check('Health fill and behavior outlines coexist with role shapes', () => {
    const html=participantMarkerHtml('player','#D9C48A','2',24,35,'#FF8800',.4);
    assert.ok(html.includes('inset(65%')); assert.ok(html.includes('stroke="#FF8800"')); assert.ok(html.includes('opacity:0.4'));
    assert.ok(!participantMarkerHtml('pmc','#4E9BFF','1',22,100).includes('clip-path'));
});
check('SVG cannot inject markup via labels or color strings', () => {
    const html=participantMarkerHtml('pmc','" onload="alert(1)','<script>',22);
    assert.ok(!html.includes('<script>')); assert.ok(!html.includes('onload')); assert.ok(html.includes('&lt;script&gt;'));
});
console.log(`${checks} participant presentation checks passed`);

check('Recorded PMC sides and legacy bare PMC receive numbered markers', () => {
    const variants = ['PMC|USEC','PMC|BEAR','PMC'];
    const rows = variants.map((type,i)=>({...pmc('variant-'+i,11),type,team:i===1?'Bear':'Usec'}));
    const indexes = buildPmcIndexMap(rows);
    rows.forEach((p,i)=>{
        assert.equal(getParticipantKind(p),'pmc');
        assert.equal(indexes[p.profileId],i+1);
        const html=getLegendIcon(p,'#4E9BFF',indexes[p.profileId]).props.dangerouslySetInnerHTML.__html;
        assert.ok(html.includes('rr-marker-pmc'));
        assert.ok(html.includes(`aria-label="PMC ${i+1}"`));
    });
});
check('Special roles retain their type despite USEC or BEAR sides', () => {
    for(const type of ['KNIGHT|GOON','TAGILLA|BOSS','RAIDER|FOLLOWER','UNTAR GUARD|UNTAR','INFECTED PMC|INFECTED'])
    for(const team of ['Bear','Usec']) {
        const p={...pmc(type+team,0),type,team};
        assert.equal(getParticipantKind(p),'other');
        assert.equal(buildPmcIndexMap([p])[p.profileId],undefined);
    }
});
if(process.argv[2]) {
    const recorded=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
    const serialized=JSON.stringify(recorded);
    const indexes=buildPmcIndexMap(recorded), pick=createPlayerColorResolver(recorded);
    const pmcs=recorded.filter(p=>p.type==='PMC|BEAR'||p.type==='PMC|USEC');
    assert.equal(pmcs.length,7);
    for(const p of pmcs) check(`Recorded ${p.name} has a PMC marker and squad number`,()=>{
        assert.equal(getParticipantKind(p),'pmc'); assert.ok(indexes[p.profileId]>=1);
        const html=getLegendIcon(p,pick(p,0),indexes[p.profileId]).props.dangerouslySetInnerHTML.__html;
        assert.ok(html.includes('rr-marker-pmc'));
    });
    check('Recorded squad members share color but have different numbers',()=>{
        const group=pmcs.filter(p=>p.group===6);
        assert.equal(group.length,3);
        assert.equal(new Set(group.map(p=>pick(p,0))).size,1);
        assert.equal(new Set(group.map(p=>indexes[p.profileId])).size,3);
    });
    check('Recorded human, boss and actual scavs keep their roles',()=>{
        assert.equal(getParticipantKind(recorded.find(p=>p.type==='HUMAN')),'player');
        assert.equal(getParticipantKind(recorded.find(p=>p.type==='TAGILLA|BOSS')),'other');
        recorded.filter(p=>p.type==='SCAV|SCAV'||p.type==='PLAYER_SCAV|SCAV').forEach(p=>assert.equal(getParticipantKind(p),'scav'));
    });
    check('Recorded rows are not modified to repair presentation',()=>assert.equal(JSON.stringify(recorded),serialized));
}
console.log(`${checks} participant checks including recorded PMC formats passed`);
