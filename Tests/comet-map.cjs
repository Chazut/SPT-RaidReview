const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('node:assert/strict');

const ts = require('../Private/node_modules/typescript');

const cache = new Map();

function load(filename) {

    filename = path.resolve(__dirname, filename);

    if (cache.has(filename)) return cache.get(filename);

    const context = { exports: {}, require: name => load(path.resolve(path.dirname(filename), name) + '.ts') };

    vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {

        fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }

    }).outputText, context);

    cache.set(filename, context.exports); return context.exports;

}

const { prepareCometMapEvents: prepare, cometMapState: state, cometTooltipHtml: tooltip } = load('../Private/src/helpers/cometMap.ts');

const { getBehaviorCategory } = load('../Private/src/helpers/botBehavior.ts');

let checks = 0;

function check(name, body) { try { body(); checks++; } catch (e) { e.message = name + ': ' + e.message; throw e; } }

const row = (id, time, stage, decision = 'Hold', extra = {}) => ({

    id, time, profileId: 'pmc-1', cometSession: 'session', sequence: id, feature: 'A01', decision, stage,

    reason: stage === 'selected' ? 'new-contact' : stage === 'accepted' ? 'sain-decision-accepted' : 'enemy-visible',

    detail: { botInstance: 'instance', contact: { target: 'enemy', source: 'heard', age: 2, distance: 18, x: 1, y: 2, z: 3 },

        candidates: [

            { decision: 'Hold', eligible: true, score: 70, reason: 'available' },

            { decision: 'Push', eligible: false, score: 95, reason: 'unsafe-push' },

            { decision: 'Flank', eligible: true, score: 51, reason: 'available' },

            { decision: 'Search', eligible: true, score: 40, reason: 'available' },

            { decision: 'Grenade', eligible: false, score: 30, reason: 'no-grenade' },

        ] }, ...extra,

});

const ready = rows => ({ status: 'ready', events: prepare(rows, 'pmc-1') });

const history = ready([row(4, 6000, 'released'), row(2, 2100, 'accepted'), row(1, 2000, 'selected')]);

check('Unsorted history retains the selection reason on acceptance', () => {

    assert.equal(history.events[1].choiceReason, 'new-contact'); assert.equal(history.events[1].time, 2100);

});

check('No future decision or unaccepted intention on the map', () => {

    assert.equal(state(history, 1999, 'SAIN:Search', 1000, false).active, false);

    assert.equal(state(history, 2050, 'SAIN:Search', 1000, false).active, false);

});

check('Acceptance between position samples is visible', () => {

    const s = state(history, 2500, 'SAIN:Search', 1000, false);

    assert.equal(s.active, true); assert.equal(s.decision, 'COMET:Hold');

});

check('Release ends attribution before the next position sample', () => {

    const s = state(history, 6100, 'COMET:Hold', 5000, false);

    assert.equal(s.active, false); assert.equal(s.decision, '');

});

check('Later native decisions take priority over old acceptance', () => {

    const s = state(history, 5000, 'SAIN:FirstAid', 4900, false);

    assert.equal(s.active, false); assert.equal(s.decision, 'SAIN:FirstAid');

});

check('Ghost never carries COMET ownership or its action color', () => {

    const s = state(history, 5000, 'COMET:Hold', 4900, true);

    assert.equal(s.active, false); assert.equal(s.decision, ''); assert.equal(tooltip(s, history, 5000, {}), '');

});

check('Seeking backward restores the actual decision at that time', () => {

    for (const at of [6100, 4000, 1000, 6000, 2150, 2050]) {

        assert.equal(state(history, at, 'SAIN:Search', 1000, false).active, at >= 2100 && at < 6000);

    }

});

check('Simultaneous events follow sequence rather than database arrival order', () => {

    const r = ready([row(30, 2000, 'selected', 'Hold', { sequence: 1 }), row(10, 2000, 'accepted', 'Hold', { sequence: 2 }),

        row(20, 2000, 'released', 'Hold', { sequence: 3 })]);

    assert.equal(r.events[1].choiceReason, 'new-contact'); assert.equal(state(r, 2000, '', 0, false).active, false);

});

check('Details never leak from another bot or malformed rows', () => {

    assert.equal(prepare([null, {}, row(1, -1, 'accepted'), row(2, NaN, 'accepted'), row(3, 2, 'accepted', 'Hold', { profileId: 'pmc-2' }),

        row(4, 5, 'unknown'), row(5, 10, 'accepted', 'Hold', { detail: '{' })], 'pmc-1').length, 1);

});

check('A02 map shows route estimates and escapes cover identifiers', () => {

    const detail = { contact: { source: 'seen', age: 0, distance: 12 }, visible: { coverRouteRisk: .2, pushRouteRisk: .8, knownThreats: 2, coverId: '<script>x</script>' },

        candidates: [{ decision: 'Shoot', eligible: true, score: 30, reason: 'clear-shot' }, { decision: 'Push', eligible: false, score: 80, reason: 'additional-known-threat' }] };

    const r = ready([row(1, 100, 'selected', 'Cover', { feature: 'A02', reason: 'hurt-seek-cover', detail }),

        row(2, 101, 'accepted', 'Cover', { feature: 'A02', detail })]);

    const html = tooltip(state(r, 200, '', 0, false), r, 200, {});

    assert.ok(html.includes('Take cover') && html.includes('Injured: taking cover') && html.includes('0.20 / 1') && html.includes('Known threats: 2'));

    assert.ok(html.includes('Other known threats') && !html.includes('<script>'));

    assert.ok(html.includes('A02') && html.includes('#0EA5E9'));

});

check('A01 to A02 handoff retains the correct feature even with the same action name', () => {

    const r = ready([row(1, 100, 'selected', 'Push'), row(2, 101, 'accepted', 'Push'), row(3, 200, 'released', 'Push'),

        row(4, 200, 'selected', 'Push', { feature: 'A02', reason: 'reachable-close-contact' }), row(5, 201, 'accepted', 'Push', { feature: 'A02' })]);

    assert.equal(state(r, 150, '', 0, false).event.feature, 'A01');

    assert.equal(state(r, 250, '', 0, false).event.feature, 'A02');

    assert.equal(state(r, 250, '', 0, false).event.choiceReason, 'reachable-close-contact');

});

check('Choice reason cannot cross session, instance, feature or action', () => {

    for (const extra of [{ cometSession: 'another' }, { detail: { botInstance: 'another' } }, { feature: 'A02' }, { decision: 'Search' }]) {

        const r = ready([row(1, 100, 'selected'), row(2, 200, 'accepted', 'Hold', extra)]);

        assert.equal(r.events[1].choiceReason, 'sain-decision-accepted');

    }

});

check('Refusal clears selection context', () => {

    const r = ready([row(1, 100, 'selected'), row(2, 200, 'rejected'), row(3, 300, 'accepted')]);

    assert.equal(r.events[2].choiceReason, 'sain-decision-accepted');

});

check('All six actions retain the existing category colors', () => {

    const colors = { Shoot: '#EF4444', Cover: '#0EA5E9', Push: '#EF4444', Grenade: '#FF6B6B', Hold: '#15803D', Flank: '#0EA5E9', Search: '#F59E0B', FallBack: '#A855F7' };

    for (const [action, color] of Object.entries(colors)) {

        const r = ready([row(1, 1000, 'accepted', action)]);

        assert.equal(getBehaviorCategory('COMET:' + action).color, color);

        assert.ok(tooltip(state(r, 1500, '', 0, false), r, 1500, {}).includes('color:' + color));

    }

});

check('Contact is dated knowledge, not current enemy position', () => {

    const html = tooltip(state(history, 4100, 'COMET:Hold', 4000, false), history, 4100, { enemy: 'Known opponent' });

    for (const value of ['Reacting to a new contact', 'Last heard', '4.0 s ago', '18.0 m at decision', 'Known opponent',

        'Last known position: 1.0, 2.0, 3.0', 'completion not confirmed']) assert.ok(html.includes(value), value);

});

check('Alternatives exclude chosen action, prefer feasible scores and cap at three', () => {

    const html = tooltip(state(history, 3000, '', 0, false), history, 3000, {});

    assert.equal((html.match(/<li>/g) || []).length, 3);

    assert.ok(html.indexOf('Change cover') < html.indexOf('Search'));

    assert.ok(html.indexOf('Search') < html.indexOf('Too risky to push'));

    assert.ok(!html.includes('No grenade available'));

});

check('Old recordings retain badges without inventing context', () => {

    const r = ready([]), s = state(r, 3000, 'COMET:Push', 2000, false);

    assert.equal(s.active, true); assert.ok(tooltip(s, r, 3000, {}).includes('No matching decision details recorded'));

    assert.ok(!tooltip(s, r, 3000, {}).includes('Why:'));

});

check('Loading and errors have honest fallback text', () => {

    const s = state(undefined, 3000, 'COMET:Push', 2000, false);

    assert.ok(tooltip(s, undefined, 3000, {}).includes('Loading'));

    assert.ok(tooltip(s, { status: 'error', events: [] }, 3000, {}).includes('Hover again'));

});

check('No HTML execution from imported diagnostic text', () => {

    const selected = row(1, 1000, 'selected', '<img src=x onerror=alert(1)>', { reason: '<script>x</script>' });

    const accepted = row(2, 1100, 'accepted', selected.decision);

    accepted.detail.candidates[0].decision = '<img src=x>';

    accepted.detail.contact.source = '<svg onload=x>';

    const r = ready([selected, accepted]);

    const html = tooltip(state(r, 1200, '', 0, false), r, 1200, { enemy: '<iframe src=x>' });

    for (const tag of ['<img', '<script', '<svg', '<iframe']) assert.ok(!html.includes(tag));

    assert.ok(html.includes('&lt;script&gt;')); assert.ok(html.includes('&lt;iframe'));

});

check('Invalid optional numbers are never rendered as NaN or Infinity', () => {

    const event = row(1, 1000, 'accepted');

    event.detail.contact = { age: NaN, distance: Infinity, x: '5', y: 3, z: 5 };

    event.detail.candidates[1].score = Infinity;

    const r = ready([event]), html = tooltip(state(r, 1200, '', 0, false), r, 1200, {});

    assert.ok(!html.includes('NaN')); assert.ok(!html.includes('Infinity')); assert.ok(html.includes('age not recorded'));

    assert.ok(!html.includes('Last known position'));

});

check('A03 preserves combat colors and meaningful labels', () => {

    for (const choice of ['KeepAngle','ContinuePush']) assert.equal(getBehaviorCategory('COMET:'+choice).color, getBehaviorCategory('SAIN:StandAndShoot').color);

});

check('A03 countdown, fixed observation and expiry work when replaying both ways', () => {

    const selected = row(1,1000,'selected','KeepAngle',{feature:'A03',reason:'sight-hold-last-seen'});

    const accepted = row(2,1100,'accepted','KeepAngle',{feature:'A03'});

    accepted.detail.continuity = {remaining:.7,lostFor:.1,frozenRoute:false};

    const r=ready([selected,accepted]);

    let s=state(r,1400,'COMET:KeepAngle',1200,false);

    assert.equal(s.active,true);

    const html=tooltip(s,r,1400,{});

    for(const text of ['Keep last seen angle','Brief sight loss','0.40 s','Fixed last seen angle','No blind fire authorized','Last known position: 1.0, 2.0, 3.0']) assert.ok(html.includes(text),text);

    assert.equal(state(r,1800,'COMET:KeepAngle',1200,false).active,false);

    assert.equal(state(r,1200,'SAIN:StandAndShoot',900,false).active,true);

    assert.equal(state(r,1400,'COMET:KeepAngle',1200,true).active,false);

    accepted.detail.continuity.remaining = NaN;

    const damaged=ready([accepted]);

    assert.ok(!tooltip(state(damaged,1400,'',0,false),damaged,1400,{}).includes('NaN'));

});

check('A03 interruption wins over a stale recorded position', () => {

    const accepted=row(1,1000,'accepted','ContinuePush',{feature:'A03'});

    accepted.detail.continuity={remaining:.8,lostFor:0,frozenRoute:true};

    const release=row(2,1200,'released','ContinuePush',{feature:'A03',reason:'sight-other-threat'});

    const r=ready([accepted,release]);

    assert.ok(tooltip(state(r,1100,'',0,false),r,1100,{}).includes('Existing route only'));

    assert.equal(state(r,1200,'COMET:ContinuePush',1100,false).active,false);

});

check('A04 map shows the original draw, probabilities and retained plan without changing combat color', () => {

    const accepted=row(1,1000,'accepted','Shoot',{feature:'A02'});

    accepted.detail.mixing={state:'kept-sight-continuity',trigger:'new-contact',selected:'Shoot',seed:'1234abcd',opportunity:4,drawIndex:2,roll:.7,

        options:[{decision:'Cover',score:80,probability:.67,reason:'in-pool'},{decision:'Shoot',score:76,probability:.24,reason:'in-pool'},

            {decision:'Push',score:72,probability:.09,reason:'in-pool'},{decision:'Search',score:60,probability:0,reason:'outside-score-gap'}]};

    const r=ready([accepted]); const s=state(r,1100,'',0,false);const html=tooltip(s,r,1100,{});

    for(const text of ['Decision variety','no new roll','67.0%','24.0%','9.0%','Roll 0.7000','Choice #4','Probabilities at selection'])assert.ok(html.includes(text),text);

    assert.equal(r.events[0].mixing.seed,'1234abcd');assert.equal(r.events[0].mixing.options[1].probability,.24);

    assert.equal(getBehaviorCategory(s.decision).color,getBehaviorCategory('SAIN:StandAndShoot').color);

    assert.equal(state(r,900,'',0,false).active,false);

});

check('A04 malformed data cannot fabricate probabilities or execute HTML', () => {

    const e=row(1,1000,'accepted');e.detail.mixing={state:'<svg onload=x>',trigger:'<script>x</script>',opportunity:Infinity,roll:NaN,

        options:[{decision:'<img src=x>',score:80,probability:.8},{decision:'Bad',probability:2},null]};

    const r=ready([e]);const html=tooltip(state(r,1100,'',0,false),r,1100,{});

    assert.ok(!html.includes('<svg'));assert.ok(!html.includes('<script'));assert.ok(!html.includes('<img'));

    assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));assert.ok(!html.includes('200.0%'));

    e.detail.mixing=[];assert.equal(ready([e]).events[0].mixing,null);

});

check('A04 emergency selection explicitly reports no draw', () => {

    const e=row(1,1000,'accepted','Cover',{feature:'A02'});

    e.detail.mixing={state:'urgent-best',trigger:'situation-changed',selected:'Cover',roll:null,options:[{decision:'Cover',score:90,probability:1,reason:'in-pool'}]};

    const r=ready([e]);const html=tooltip(state(r,1100,'',0,false),r,1100,{});

    assert.ok(html.includes('Urgent situation'));assert.ok(html.includes('No random draw'));assert.ok(html.includes('100.0%'));

});

check('A05 exposes original and final choices, bounded loss and separate draw on map replay', () => {

    const accepted=row(1,1000,'accepted','Push',{feature:'A02'});

    accepted.detail.mixing={state:'kept-sight-continuity',selected:'Shoot',options:[],mistake:{state:'mistake-selected',best:'Shoot',before:'Shoot',selected:'Push',bestScore:80,selectedScore:66,

        scoreLoss:.175,maxLoss:.2,chance:.05,roll:.02,at:10,nextAllowedAt:20,seed:'abcd',drawIndex:1,options:[{decision:'Push',score:66,probability:.05}]}};

    const r=ready([accepted]);const s=state(r,1100,'',0,false);const html=tooltip(s,r,1100,{});

    for(const t of ['Occasional mistakes','Plausible tactical mistake','80','66','17.5%','20.0%','5.0%','Roll 0.020000','10.0 s','At original selection'])assert.ok(html.includes(t),t);

    assert.equal(r.events[0].mixing.selected,'Shoot');assert.equal(r.events[0].mixing.mistake.selected,'Push');

    assert.equal(getBehaviorCategory(s.decision).color,getBehaviorCategory('COMET:Push').color);

    assert.equal(state(r,900,'',0,false).active,false);

    assert.ok(tooltip(state(r,1050,'',0,false),r,1050,{}).includes('Roll 0.020000'));

});

check('A05 cancellations, old traces and malformed optional fields remain safe', () => {

    const e=row(1,1000,'accepted','Cover',{feature:'A02'});

    for(const why of ['cooldown','urgent','native-retry','a04-already-varied','no-plausible-alternative']) {

        e.detail.mixing={options:[],mistake:{state:why,selected:'Cover',chance:.05}};

        const r=ready([e]);assert.ok(tooltip(state(r,1100,'',0,false),r,1100,{}).includes('No mistake draw'));

        const released=row(2,1200,'released','Cover',{feature:'A02',reason:'sight-urgent-action'});

        assert.equal(state(ready([e,released]),1200,'COMET:Cover',1100,false).active,false);

    }

    e.detail.mixing={mistake:{state:'<svg onload=x>',best:'<img src=x>',selected:'<script>x</script>',bestScore:Infinity,selectedScore:NaN,

        chance:2,scoreLoss:-1,maxLoss:Infinity,roll:NaN,at:Infinity,nextAllowedAt:NaN,options:[null,{decision:'x',probability:3}]} };

    const r=ready([e]);const html=tooltip(state(r,1100,'',0,false),r,1100,{});

    for(const bad of ['<svg','<img','<script','NaN','Infinity','200.0%'])assert.ok(!html.includes(bad),bad);

    for(const absent of [undefined,null,[]]) {e.detail.mixing.mistake=absent;assert.equal(ready([e]).events[0].mixing.mistake,null);}

});

check('A06 context, score deltas, parser safety and replay ownership', () => {

    const e=row(1,1000,'accepted','Cover',{feature:'A02'});

    e.detail.fear={level:.8,target:.9,base:.1,sensitivity:1,multiplier:1,injury:.125,allyDeath:.29,outnumbered:.15,suppression:.1,

        scoreCap:15,knownEnemies:2,availableAllies:0,panic:true,transition:'panic-enter',panicChangedAt:9,at:10,deathAt:9};

    e.detail.candidates=[{decision:'Cover',scoreBeforeFear:60,fearDelta:12,score:72,eligible:true},

        {decision:'Push',scoreBeforeFear:65,fearDelta:-9.6,score:55.4,eligible:true}];

    let r=ready([e]),html=tooltip(state(r,1100,'',0,false),r,1100,{});

    for(const value of ['Fear &amp; panic','80.0%','90.0%','PANIC','12.5%','Known enemies 2','60 → 72','-9.60','1.0 s ago']) assert.ok(html.includes(value),value);

    assert.equal(state(r,1100,'',0,false).decision,'COMET:Cover');

    e.detail.fear={level:Infinity,target:-2,panic:'true',transition:'<img onerror=x>',knownEnemies:NaN,scoreCap:Infinity,at:1,panicChangedAt:0};

    e.detail.candidates=[{decision:'<script>x</script>',score:NaN,scoreBeforeFear:Infinity,fearDelta:Infinity,eligible:true}];

    r=ready([e]);html=tooltip(state(r,1100,'',0,false),r,1100,{});

    for(const bad of ['<img','<script','Infinity','NaN','-200.0%'])assert.ok(!html.includes(bad),bad);

    for(const absent of [undefined,null,[]]) {e.detail.fear=absent;assert.equal(ready([e]).events[0].fear,null);}

    const released=row(2,1200,'released','Cover',{feature:'A02',reason:'sain-priority'});

    assert.equal(state(ready([e,released]),1200,'COMET:Cover',1100,false).active,false);

});

for (let at = 0; at < 7000; at += 11) check('Sequential replay ' + at, () => {

    const s = state(history, at, 'SAIN:Search', 0, false);

    assert.equal(s.active, at >= 2100 && at < 6000);

});

console.log(`${checks} COMET map replay, tooltip and color checks passed`);

// A07 attention is independent of action ownership and must work in both replay directions.

const attentionRow = (id,time,stage,selected='enemy-b',extra={}) => row(id,time,stage,'SelectTarget',{

    feature:'A07',reason:'threat-recent-attacker',detail:{botInstance:'instance',threat:{

        previous:'enemy-a',selected,reason:'threat-recent-attacker',trigger:'new-hit',holdRemaining:2,margin:.2,emergency:true,

        candidates:[{target:selected,eligible:true,source:'heard',age:.1,distance:8,score:125,hit:98,fire:0,sight:5,proximity:22,steps:0,facing:0,reason:'threat-recent-attacker'},

            {target:'enemy-a',eligible:true,source:'seen',age:0,distance:30,score:65,reason:'threat-lower-priority'}]

    }},...extra});

check('A07 target selection preserves native combat behavior and color',()=>{

    const r=ready([attentionRow(1,100,'accepted')]);const s=state(r,150,'SAIN:DogFight',140,false);

    assert.equal(s.active,true);assert.equal(s.actionActive,false);assert.equal(s.decision,'SAIN:DogFight');

    const html=tooltip(s,r,150,{'enemy-b':'Attacker','enemy-a':'Previous opponent'});

    assert.ok(html.includes('Target priority')&&html.includes('Attacker')&&html.includes('Urgent switch')&&html.includes('Hit 98.0'));

    assert.ok(html.includes('color:'+getBehaviorCategory('SAIN:DogFight').color));

    assert.ok(html.startsWith('<div class="rr-comet-context">SAIN <strong'), 'native action keeps its source; COMET badge belongs to target priority');

    assert.ok(!html.includes('Accepted by SAIN; completion'));

});

check('A07 events never steal action acceptance or release action context',()=>{

    const r=ready([row(1,100,'selected','Shoot',{feature:'A02',reason:'clear-shot'}),attentionRow(2,101,'accepted'),

        row(3,102,'accepted','Shoot',{feature:'A02'}),attentionRow(4,110,'released','')]);

    const s=state(r,105,'COMET:Shoot',104,false);assert.equal(s.event.feature,'A02');assert.equal(s.event.choiceReason,'clear-shot');assert.ok(s.attention);

    assert.ok(tooltip(s,r,105,{}).includes('Target priority'));

    const after=state(r,115,'COMET:Shoot',114,false);assert.equal(after.actionActive,true);assert.equal(after.attention,undefined);

});

check('Action release leaves A07 target priority with native behavior',()=>{

    const r=ready([row(1,100,'accepted'),attentionRow(2,110,'accepted'),row(3,120,'released')]);

    const s=state(r,130,'SAIN:DogFight',125,false);assert.equal(s.actionActive,false);assert.ok(s.attention);assert.equal(s.decision,'SAIN:DogFight');

});

check('A07 release, ghosts and replay before selection never show stale attention',()=>{

    const r=ready([attentionRow(1,100,'accepted'),attentionRow(2,200,'released','')]);

    for(const at of [99,100,199,200,150,50])assert.equal(!!state(r,at,'SAIN:Search',0,false).attention,at>=100&&at<200);

    assert.equal(state(r,150,'SAIN:Search',0,true).attention,undefined);

});

check('A07 attention cannot leak across respawn instances or sessions',()=>{

    for(const change of [{cometSession:'next'}, {detail:{botInstance:'new-instance'}}]){

        const r=ready([attentionRow(1,100,'accepted'),row(2,200,'accepted','Search',change)]);

        assert.equal(state(r,210,'COMET:Search',205,false).attention,undefined);

    }

});

check('A07 rejected candidate text and roster names cannot inject HTML',()=>{

    const e=attentionRow(1,100,'accepted','<script>bad</script>');e.detail.threat.candidates[1].reason='<img onerror=x>';

    const r=ready([e]);const html=tooltip(state(r,150,'SAIN:DogFight',140,false),r,150,{'enemy-a':'<svg onload=x>'});

    assert.ok(!html.includes('<script>')&&!html.includes('<svg')&&!html.includes('<img'));

    assert.ok(html.includes('&lt;script&gt;'));

});

check('Malformed A07 detail cannot activate target ownership',()=>{

    for(const threat of [null,[],{},'wrong',{selected:123}]){

        const r=ready([attentionRow(1,100,'accepted','x',{detail:{threat}})]);

        assert.equal(state(r,150,'SAIN:Search',140,false).active,false);

    }

});

console.log(`${checks} COMET map replay, tooltip and color checks passed (including A07)`);



const a08 = {state:'ready',weapon:'MP7 <test>',weaponClass:'smg',profile:'Smg',optic:'dot',ammo:'bullet',idealRange:12,scoreCap:15,

    loadedRounds:28,compatibleMagazines:2,looseRounds:0,grenades:3,medicalItems:1,resourcesKnown:true,canFirstAid:true,canSurgery:false,ready:true,refreshReason:'inventory-changed'};

const equipmentRow=(id,time,stage,extra={})=>row(id,time,stage,'Push',{feature:'A02',detail:{botInstance:'instance',loadout:a08,

    candidates:[{decision:'Push',score:59.75,scoreBeforeLoadout:50,loadoutDelta:9.75,loadoutReason:'loadout-close-weapon-fit',eligible:true},

    {decision:'Cover',score:40,scoreBeforeLoadout:40,loadoutDelta:0,loadoutReason:'loadout-native-refusal-kept',eligible:false,reason:'no-cover'}]},...extra});

check('A08 snapshot appears in accepted map hover without changing behavior colors',()=>{

    const r=ready([equipmentRow(1,100,'selected'),equipmentRow(2,120,'accepted')]);const st=state(r,150,'COMET:Push',120,false);const h=tooltip(st,r,150,{});

    assert.ok(h.includes('Equipment awareness · A08')&&h.includes('Preferred distance 12 m')&&h.includes('+9.75'));

    assert.ok(h.includes('MP7 &lt;test&gt;')&&!h.includes('MP7 <test>'));assert.equal(st.decision,'COMET:Push');

    assert.equal(getBehaviorCategory(st.decision).color,getBehaviorCategory('COMET:Push').color);

    assert.equal(state(r,99,'SAIN:Search',0,false).event,undefined);

    assert.equal(tooltip(state(r,150,'COMET:Push',120,true),r,150,{}),'');

});

check('A08 missing or malformed optional context preserves older raids',()=>{

    for(const loadout of [undefined,null,[],42,'wrong']) {

        const r=ready([equipmentRow(1,100,'accepted',{detail:{loadout}})]);assert.equal(r.events[0].loadout,null);

        assert.ok(!tooltip(state(r,150,'COMET:Push',120,false),r,150,{}).includes('Equipment awareness'));

    }

});

check('A08 invalid numeric supplies are unknown rather than fictional zeros',()=>{

    const r=ready([equipmentRow(1,100,'accepted',{detail:{loadout:{...a08,grenades:-3,idealRange:'70',loadedRounds:NaN,resourcesKnown:false}}})]);

    assert.equal(r.events[0].loadout.grenades,undefined);assert.equal(r.events[0].loadout.idealRange,undefined);

    assert.ok(tooltip(state(r,150,'COMET:Push',120,false),r,150,{}).includes('Supplies unknown'));

});

check('A08 cached equipment never survives release, identity change or reverse playback',()=>{

    const r=ready([equipmentRow(1,100,'accepted'),equipmentRow(2,500,'released')]);

    assert.equal(tooltip(state(r,600,'COMET:Push',100,false),r,600,{}),'');

    assert.ok(tooltip(state(r,200,'COMET:Push',100,false),r,200,{}).includes('Equipment awareness'));

    const newer=ready([equipmentRow(1,100,'accepted'),row(2,200,'accepted','Search',{detail:{botInstance:'two'}})]);

    assert.equal(state(newer,250,'COMET:Search',200,false).event.loadout,null);

});

check('A08 does not replace A07 attention or native action ownership',()=>{

    const r=ready([equipmentRow(1,100,'accepted'),attentionRow(2,150,'accepted','enemy-a')]);

    const st=state(r,160,'COMET:Push',100,false);const h=tooltip(st,r,160,{});

    assert.ok(h.includes('Equipment awareness')&&h.includes('Target priority'));assert.equal(st.decision,'COMET:Push');

});

console.log(`${checks} COMET map checks passed (including A08)`);

check('A08 pending refresh never displays stale ammunition or a fictional empty weapon',()=>{

    const r=ready([equipmentRow(1,100,'accepted',{detail:{loadout:{...a08,state:'refresh-pending',loadedRounds:0,resourcesKnown:false}}})]);

    const h=tooltip(state(r,150,'COMET:Push',120,false),r,150,{});

    assert.ok(h.includes('No equipment adjustment')&&!h.includes('Loaded rounds:')&&!h.includes('Preferred distance'));

});

console.log(`${checks} COMET map checks passed (including A08 pending refresh)`);



const a09={target:'enemy',state:'estimated',scoreCap:10,advantage:-.4,sample:'memory-only',evidence:[

 {kind:'weapon',value:'shotgun',source:'seen-hands',age:2,observedAt:10,confidence:.48,active:true},

 {kind:'injury',value:'possibly-injured',source:'heard-heal',age:3,confidence:0,active:false}]};

const opponentRow=(id,time,stage,extra={})=>row(id,time,stage,'Shoot',{feature:'A02',detail:{botInstance:'instance',opponent:a09,

 candidates:[{decision:'Push',score:46,scoreBeforeOpponent:50,opponentDelta:-4,opponentReason:'perceived-advantage:weapon:shotgun',eligible:true}]},...extra});

check('A09 accepted hover explains dated uncertain observations and effect, colors unchanged',()=>{

 const r=ready([opponentRow(1,100,'selected'),opponentRow(2,120,'accepted')]);const st=state(r,150,'COMET:Shoot',120,false);const h=tooltip(st,r,150,{});

 assert.ok(h.includes('Opponent assessment · A09')&&h.includes('48.0%')&&h.includes('2.0 s old')&&h.includes('-4.00'));

 assert.ok(h.includes('unconfirmed')&&h.includes('(not used)')&&h.includes('not live enemy health'));

 assert.equal(getBehaviorCategory(st.decision).color,getBehaviorCategory('COMET:Shoot').color);

});

check('A09 old, corrupt or malicious optional detail remains safe',()=>{

 for(const opponent of [undefined,null,[],42,'wrong']) {const r=ready([opponentRow(1,100,'accepted',{detail:{opponent}})]);assert.equal(r.events[0].opponent,null);}

 const r=ready([opponentRow(1,100,'accepted',{detail:{opponent:{...a09,evidence:[{kind:'weapon',value:'<img onerror=x>',source:'<script>',confidence:NaN,age:-1}]}}})]);

 const h=tooltip(state(r,150,'COMET:Shoot',120,false),r,150,{});assert.ok(!h.includes('<img')&&!h.includes('<script>'));assert.ok(h.includes('&lt;img'));

 assert.equal(r.events[0].opponent.evidence[0].confidence,undefined);

});

check('A09 follows release, reverse playback, ghosts and instance boundaries',()=>{

 const r=ready([opponentRow(1,100,'accepted'),opponentRow(2,500,'released')]);

 for(const at of [99,200,600,300,50])assert.equal(tooltip(state(r,at,'COMET:Shoot',100,false),r,at,{}).includes('Opponent assessment'),at>=100&&at<500);

 assert.equal(tooltip(state(r,200,'COMET:Shoot',100,true),r,200,{}),'');

 const newer=ready([opponentRow(1,100,'accepted'),row(2,200,'accepted','Search',{detail:{botInstance:'two'}})]);assert.equal(state(newer,250,'COMET:Search',200,false).event.opponent,null);

});

check('A09 does not overwrite simultaneous A07 attention',()=>{

 const r=ready([opponentRow(1,100,'accepted'),attentionRow(2,120,'accepted','enemy-a')]);const st=state(r,150,'COMET:Shoot',100,false);const h=tooltip(st,r,150,{});

 assert.ok(h.includes('Opponent assessment')&&h.includes('Target priority'));assert.equal(st.decision,'COMET:Shoot');

});


const a10={target:'enemy',episode:1,cue:'surgery',state:'usable',reason:'opportunity-arrival-before-estimated-end',heardAt:10,age:2,remaining:10,window:12,pathLength:8,eta:3,travelMode:'walk',bonus:20,scoreCap:20,safetyMargin:.5};
const opportunityRow=(id,time,stage,extra={})=>row(id,time,stage,'Push',{feature:'A01',detail:{botInstance:'instance',opportunity:a10,
 candidates:[{decision:'Push',score:80,scoreBeforeOpportunity:60,opportunityDelta:20,opportunityReason:a10.reason,eligible:true}]},...extra});
check('A10 accepted map hover explains original cue, ETA and bonus without changing action color',()=>{
 const r=ready([opportunityRow(1,100,'selected'),opportunityRow(2,120,'accepted')]);const st=state(r,150,'COMET:Push',120,false);const h=tooltip(st,r,150,{});
 for(const part of ['Heard opportunities · A10','surgery','10.00 s of 12.00','3.00 s + 0.50','+20.00','does not confirm'])assert.ok(h.includes(part),part);
 assert.equal(st.decision,'COMET:Push');assert.ok(h.includes(getBehaviorCategory('COMET:Push').color));
});
check('A10 optional corrupt and hostile data are safe',()=>{
 for(const opportunity of [undefined,null,[],42,'x']){const r=ready([opportunityRow(1,100,'accepted',{detail:{opportunity}})]);assert.equal(r.events[0].opportunity,null);}
 const r=ready([opportunityRow(1,100,'accepted',{detail:{opportunity:{...a10,cue:'<img onerror=x>',reason:'<script>',eta:Infinity,remaining:-1}}})]);
 const h=tooltip(state(r,110,'COMET:Push',100,false),r,110,{});assert.ok(!h.includes('<img')&&!h.includes('<script>'));assert.ok(h.includes('&lt;img'));
 assert.equal(r.events[0].opportunity.eta,undefined);assert.equal(r.events[0].opportunity.remaining,undefined);
});
check('A10 respects reverse playback, release, ghost and new bot instance',()=>{
 const r=ready([opportunityRow(1,100,'accepted'),opportunityRow(2,500,'released')]);
 for(const at of [99,200,600,300,50])assert.equal(tooltip(state(r,at,'COMET:Push',100,false),r,at,{}).includes('Heard opportunities'),at>=100&&at<500);
 assert.equal(tooltip(state(r,200,'COMET:Push',100,true),r,200,{}),'');
 const newer=ready([opportunityRow(1,100,'accepted'),row(2,200,'accepted','Search',{detail:{botInstance:'two'}})]);assert.equal(state(newer,250,'COMET:Search',200,false).event.opportunity,null);
});
check('A10 diagnostic-only evaluation never claims or releases an action',()=>{
 const r=ready([opportunityRow(1,100,'accepted'),opportunityRow(2,150,'evaluated')]);const st=state(r,180,'COMET:Push',100,false);assert.equal(st.event.id,1);assert.equal(st.actionActive,true);
});
check('A10 coexists with A07 and explains interrupted opening on the next normal decision',()=>{
 const r=ready([opportunityRow(1,100,'accepted'),attentionRow(2,120,'accepted','enemy-a')]);const st=state(r,150,'COMET:Push',100,false);const h=tooltip(st,r,150,{});assert.ok(h.includes('Target priority')&&h.includes('Heard opportunities'));
 const c=ready([opportunityRow(1,100,'accepted',{decision:'Hold',detail:{opportunity:{...a10,state:'interrupted',reason:'heard-shot',bonus:0}}})]);assert.ok(tooltip(state(c,150,'COMET:Hold',100,false),c,150,{}).includes('personally heard shot invalidated'));
});


const a11={state:'return-fire',reason:'cover-response-exposed-crossing',target:'enemy',coverId:'wall',pathLength:8,eta:3.4,fastEta:2.1,
 exposedSeconds:3.1,fastExposedSeconds:1.9,knownThreats:1,travelMode:'walk-to-possible-sprint',scoreCap:25};
const coverRow=(id,time,stage,extra={})=>row(id,time,stage,'Shoot',{feature:'A02',detail:{botInstance:'instance',coverResponse:a11,
 candidates:[{decision:'Shoot',score:80,scoreBeforeCoverResponse:60,coverResponseDelta:20,coverResponseReason:a11.reason,eligible:true},
 {decision:'Cover',score:45,scoreBeforeCoverResponse:65,coverResponseDelta:-20,coverResponseReason:a11.reason,eligible:true}]},...extra});
check('A11 accepted map hover displays bounded exposure and score effects',()=>{
 const r=ready([coverRow(1,100,'selected'),coverRow(2,120,'accepted')]);const st=state(r,150,'COMET:Shoot',120,false);const h=tooltip(st,r,150,{});
 for(const part of ['Fight or take cover · A11','8.00 m','1.90–3.10 s','2.10–3.40 s','-20.00','not guaranteed','Returning fire'])assert.ok(h.includes(part),part);
 assert.equal(st.actionActive,true);assert.equal(st.event.decision,'Shoot');
});
check('A11 tolerates old malformed and hostile payloads',()=>{
 for(const coverResponse of [undefined,null,[],42,'x']) {const r=ready([coverRow(1,100,'accepted',{detail:{coverResponse}})]);assert.equal(r.events[0].coverResponse,null);}
 const r=ready([coverRow(1,100,'accepted',{detail:{coverResponse:{...a11,coverId:'<img onerror=x>',reason:'<script>',eta:Infinity,fastExposedSeconds:-1}}})]);
 const h=tooltip(state(r,150,'COMET:Shoot',100,false),r,150,{});assert.ok(!h.includes('<img')&&!h.includes('<script>'));
 assert.equal(r.events[0].coverResponse.eta,undefined);assert.equal(r.events[0].coverResponse.fastExposedSeconds,undefined);
});
check('A11 keeps lifecycle and reverse replay semantics',()=>{
 const r=ready([coverRow(1,100,'accepted'),coverRow(2,200,'evaluated'),coverRow(3,500,'released')]);
 assert.equal(state(r,250,'COMET:Shoot',100,false).event.id,1);
 assert.equal(state(r,600,'COMET:Shoot',100,false).actionActive,false);
 assert.equal(state(r,150,'COMET:Shoot',100,false).event.id,1);
 assert.equal(state(r,150,'COMET:Shoot',100,true).actionActive,false);
 const newer=ready([coverRow(1,100,'accepted'),row(2,200,'accepted','Search',{detail:{botInstance:'two'}})]);
 assert.equal(state(newer,250,'COMET:Search',200,false).event.coverResponse,null);
});
check('A11 coexists with target and opportunity contributions',()=>{
 const e=coverRow(1,100,'accepted');e.detail.opportunity=a10;
 const r=ready([e,attentionRow(2,120,'accepted','enemy-a')]);const h=tooltip(state(r,150,'COMET:Shoot',100,false),r,150,{});
 for(const text of ['Fight or take cover','Heard opportunities','Target priority'])assert.ok(h.includes(text));
});
const a12={state:'holding',reason:'progress-hold-fatigue',action:'Hold',attempt:'wall',intent:'goal',holdSeconds:14,stalledSeconds:0,movementSeconds:0,
 remaining:12,progressMeters:0,retryRemaining:0,failures:0,encounter:1,lastOutcome:'',reconsider:false};
const progressRow=(id,time,stage,extra={})=>row(id,time,stage,'Hold',{detail:{botInstance:'instance',progress:a12,candidates:[
 {decision:'Hold',eligible:true,score:57.5,scoreBeforeProgress:70,progressDelta:-12.5,progressReason:a12.reason},
 {decision:'Search',eligible:false,score:80,progressReason:'progress-attempt-cooldown'}]},...extra});
check('A12 map hover explains shared budgets, progress and exclusions',()=>{
 const r=ready([progressRow(1,100,'accepted')]);const st=state(r,150,'COMET:Hold',100,false);const h=tooltip(st,r,150,{});
 for(const part of ['Plan progress · A12','14.00 s','12.00 m','-12.50 points','temporarily excluded','Requested goal: goal'])assert.ok(h.includes(part),part);
 assert.equal(st.decision,'COMET:Hold');assert.ok(h.includes(getBehaviorCategory('COMET:Hold').color));
});
check('A12 executed observations enrich hover without owning or ending an action',()=>{
 const update=progressRow(2,200,'evaluated',{detail:{botInstance:'instance',progress:{...a12,state:'paused',reason:'progress-hands-pause',holdSeconds:16}}});
 const r=ready([progressRow(1,100,'accepted'),update]);const st=state(r,250,'COMET:Hold',100,false);const h=tooltip(st,r,250,{});
 assert.equal(st.event.id,1);assert.equal(st.actionActive,true);assert.ok(h.includes('16.00 s')&&h.includes('reloading or busy hands'));
 assert.ok(tooltip(state(r,150,'COMET:Hold',100,false),r,150,{}).includes('14.00 s'));
 const lone=ready([update]);assert.equal(state(lone,250,'Patrol',100,false).active,false);
});
check('A12 old, corrupt and hostile payloads stay safe',()=>{
 for(const progress of [undefined,null,[],42,'x']){const r=ready([progressRow(1,100,'accepted',{detail:{progress}})]);assert.equal(r.events[0].progress,null);}
 const r=ready([progressRow(1,100,'accepted',{detail:{progress:{...a12,attempt:'<img onerror=x>',reason:'<script>',remaining:Infinity,holdSeconds:-1}}})]);
 const h=tooltip(state(r,150,'COMET:Hold',100,false),r,150,{});assert.ok(!h.includes('<img')&&!h.includes('<script>')&&h.includes('&lt;img'));
 assert.equal(r.events[0].progress.remaining,undefined);assert.equal(r.events[0].progress.holdSeconds,undefined);
});
check('A12 release ghost instance reset and attention preserve ownership semantics',()=>{
 const r=ready([progressRow(1,100,'accepted'),progressRow(2,200,'evaluated'),attentionRow(3,220,'accepted','enemy-a'),progressRow(4,500,'released')]);
 assert.equal(state(r,250,'COMET:Hold',100,false).event.id,1);assert.ok(tooltip(state(r,250,'COMET:Hold',100,false),r,250,{}).includes('Target priority'));
 assert.equal(state(r,600,'COMET:Hold',100,false).actionActive,false);assert.equal(state(r,150,'COMET:Hold',100,true).actionActive,false);
 const newer=ready([progressRow(1,100,'accepted'),row(2,300,'accepted','Search',{detail:{botInstance:'two'}})]);
 assert.equal(state(newer,350,'COMET:Search',300,false).progress,null);
});
const handoffRow=(id,time,stage='released',stateName='native-pending',patch={})=>row(id,time,stage,'',{
 feature:'A13',detail:{botInstance:'instance',handoff:{state:stateName,reason:'no-feasible-option',kind:'unavailable',fromFeature:'A01',fromAction:'Search',
 nativeCombat:'Retreat',nativeSelf:'None',nativeSquad:'None',nativeObserved:stateName==='native-observed',retryRemaining:.8,graceRemaining:0,...patch}}});
check('A13 pending relay ends attribution without inventing a native result',()=>{
 const r=ready([row(1,100,'accepted','Search'),handoffRow(2,200)]),st=state(r,220,'COMET:Search',100,false);
 assert.equal(st.active,false);assert.equal(st.decision,'');assert.equal(st.handoff.nativeObserved,false);
 const h=tooltip(st,r,220,{});assert.ok(h.includes('has not been observed yet'));assert.ok(!h.includes('rr-comet-badge'));
});
check('A13 observed native decision has its own color and no COMET ownership',()=>{
 const r=ready([row(1,100,'accepted','Search'),handoffRow(2,200),handoffRow(3,240,'evaluated','native-observed')]);
 const st=state(r,250,'COMET:Search',100,false),h=tooltip(st,r,250,{});
 assert.equal(st.active,false);assert.equal(st.decision,'SAIN:Retreat');assert.ok(h.includes('Next SAIN decision observed'));
 assert.ok(h.includes(getBehaviorCategory('SAIN:Retreat').color));assert.ok(!h.includes('rr-comet-badge'));
 assert.equal(state(r,220,'COMET:Search',100,false).handoff.nativeObserved,false);
 assert.equal(state(r,150,'COMET:Search',100,false).handoff,undefined);
 assert.equal(state(r,300,'SAIN:Search',280,false).decision,'SAIN:Search');
 assert.equal(state(r,300,'COMET:Search',280,false).active,false);
 assert.equal(state(r,300,'COMET:Search',280,false).decision,'SAIN:Retreat');
 assert.equal(state(r,300,'SAIN:Search',280,true).handoff,undefined);
});
check('A13 grace is diagnostic and retains original accepted action',()=>{
 const r=ready([row(1,100,'accepted','Search'),handoffRow(2,200,'evaluated','grace',{graceRemaining:.5})]);
 const st=state(r,220,'COMET:Search',100,false);assert.equal(st.event.id,1);assert.equal(st.active,true);
 assert.ok(tooltip(st,r,220,{}).includes('0.50 s'));
});
check('A13 stale context clears on new action or bot instance',()=>{
 const r=ready([handoffRow(1,100),row(2,200,'accepted','Hold')]);assert.equal(state(r,250,'COMET:Hold',200,false).handoff,undefined);
 const e=row(2,200,'evaluated','Hold',{detail:{botInstance:'other',progress:a12}}),r2=ready([handoffRow(1,100),e]);
 assert.equal(state(r2,250,'SAIN:Search',200,false).handoff,undefined);
});
check('A13 independent attention keeps its badge without claiming native combat',()=>{
 const r=ready([handoffRow(1,100),handoffRow(2,120,'evaluated','native-observed'),attentionRow(3,130,'accepted','enemy-a')]);
 const st=state(r,150,'SAIN:Retreat',120,false);assert.equal(st.actionActive,false);assert.equal(st.active,true);
 const h=tooltip(st,r,150,{});assert.ok(h.includes('SAIN handoff')&&h.includes('Target priority'));
});
check('A13 malformed payloads, hostile strings and finite counters',()=>{
 for(const handoff of [undefined,null,[],42,'x',{state:'invented'}]){
  const e=handoffRow(1,100);e.detail.handoff=handoff;assert.equal(ready([e]).events[0].handoff,null);
 }
 const r=ready([handoffRow(1,100,'evaluated','native-observed',{fromAction:'<script>',nativeCombat:'<img onerror=x>',retryRemaining:Infinity})]);
 const h=tooltip(state(r,120,'SAIN:Search',0,false),r,120,{});assert.ok(!h.includes('<script>')&&!h.includes('<img'));
 assert.ok(h.includes('&lt;script&gt;'));assert.ok(!h.includes('Infinity'));
});
console.log(`${checks} COMET map checks passed (including A12)`);

// P01 is perception, never action ownership. Replay and map highlighting stay independent.
const hearingHelpers = load('../Private/src/helpers/cometMap.ts');
const soundRow = (id,time,outcome='heard',extra={}) => row(id,time,'evaluated','MovementHearing',{
 feature:'P01',reason:'movement-personally-heard',detail:{botInstance:'instance',hearing:{signal:id,source:'enemy',kind:'Sprint',outcome,age:.3,distance:14,range:70,volume:.5,x:1,y:2,z:3}},...extra});
const soundRecord = rows => ({status:'ready',events:prepare(rows,'pmc-1')});
check('P01 queued signals do not imply hearing or combat control',()=>{
 const s=state(soundRecord([soundRow(1,1000,'queued')]),1000,'SAIN:Search',999,false);
 assert.equal(s.active,false);assert.equal(s.actionActive,false);assert.equal(s.decision,'SAIN:Search');
});
check('P01 native-refused signals never light up markers',()=>{
 const s=state(soundRecord([soundRow(1,1000,'not-heard')]),1000,'SAIN:Search',999,false);assert.equal(s.active,false);
});
check('P01 actual perception has a badge but leaves native action and color unchanged',()=>{
 const r=soundRecord([soundRow(1,1000)]),s=state(r,1200,'SAIN:Search',1100,false);
 assert.equal(s.active,true);assert.equal(s.actionActive,false);assert.equal(s.decision,'SAIN:Search');
 assert.equal(getBehaviorCategory(s.decision).color,getBehaviorCategory('SAIN:Search').color);
 const html=tooltip(s,r,1200,{enemy:'<img src=x onerror=alert(1)>'});
 assert.match(html,/Personally heard/);assert.match(html,/Perceived position/);assert.doesNotMatch(html,/<img/);
});
check('P01 highlight expires, excludes ghosts and never leaks future events',()=>{
 const r=soundRecord([soundRow(1,1000)]);
 assert.equal(state(r,999,'SAIN:Search',999,false).active,false);
 assert.equal(state(r,5999,'SAIN:Search',999,false).active,true);
 assert.equal(state(r,6000,'SAIN:Search',999,false).active,false);
 assert.equal(state(r,1200,'SAIN:Search',999,true).active,false);
 assert.equal(state(r,1100,'SAIN:Search',999,false).active,true);
});
check('P01 does not release accepted tactics or erase their reason',()=>{
 const r=soundRecord([row(1,900,'selected'),row(2,950,'accepted'),soundRow(3,1000),soundRow(4,1100,'queued')]);
 const s=state(r,1200,'COMET:Hold',950,false);assert.equal(s.actionActive,true);assert.equal(s.event.id,2);assert.equal(s.event.choiceReason,'new-contact');assert.equal(s.hearing.signal,3);
});
check('P01 cannot manufacture an accepted action',()=>{
 assert.equal(prepare([soundRow(1,1000,'heard',{stage:'accepted'})],'pmc-1').length,0);
});
check('P01 context cannot cross bot instances or sessions',()=>{
 const a=soundRow(1,1000),b=row(2,1100,'released','Hold',{cometSession:'new-session'});
 assert.equal(state(soundRecord([a,b]),1200,'SAIN:Search',1200,false).hearing,undefined);
 const c=row(3,1100,'released','Hold',{detail:{botInstance:'new-bot'}});
 assert.equal(state(soundRecord([a,c]),1200,'SAIN:Search',1200,false).hearing,undefined);
});
check('P01 preserves A13 handoffs and uses chronological backward replay',()=>{
 const h=row(1,950,'evaluated','',{feature:'A13',detail:{botInstance:'instance',handoff:{state:'native-observed',nativeObserved:true,nativeCombat:'Retreat',nativeSelf:'None'}}});
 const r=soundRecord([soundRow(2,1000),h]);const s=state(r,1200,'COMET:Hold',900,false);
 assert.equal(s.actionActive,false);assert.equal(s.decision,'SAIN:Retreat');assert.ok(s.handoff);assert.ok(s.hearing);
 assert.equal(state(r,975,'COMET:Hold',900,false).hearing,undefined);
});
check('P01 malformed optional evidence is harmless',()=>{
 for(const x of [null,[],{},'heard',{outcome:'made-up'}])assert.equal(hearingHelpers.parseCometHearing(x),null);
 const h=hearingHelpers.parseCometHearing({outcome:'heard',distance:Infinity,age:NaN});assert.equal(h.distance,undefined);assert.equal(h.age,undefined);
 const lines=hearingHelpers.cometHearingSummary({outcome:'queued',source:'x',kind:'Land',x:12,y:1,z:4});assert.ok(!lines.some(x=>x.includes('Perceived position')));
});


const quietHelpers=load('../Private/src/helpers/cometQuiet.ts');
const quietRow=(id,time,q={},extra={})=>row(id,time,'evaluated','QuietApproach',{feature:'P02',detail:{botInstance:'instance',quiet:{state:'walk',reason:'quiet-approach',action:'Search',target:'enemy',source:'heard',personality:'Normal',age:2,path:20,used:3,remaining:17,chance:.7,roll:.1,applied:true,active:true,validFor:1.5,...q}},...extra});
const quietRecord=rows=>({status:'ready',events:prepare(rows,'pmc-1')});
check('P02 applied overlay keeps SAIN action and color',()=>{
 const r=quietRecord([quietRow(1,1000)]),s=state(r,1200,'SAIN:Search',999,false);
 assert.equal(s.actionActive,false);assert.equal(s.active,true);assert.equal(s.decision,'SAIN:Search');assert.equal(s.quiet.used,3);
 const html=tooltip(s,r,1200,{enemy:'<img onerror=boom>'});assert.match(html,/Quiet approach/);assert.match(html,/17.0 s/);assert.doesNotMatch(html,/<img/);
});
check('P02 leases expire at boundary and cannot leak into ghosts or future',()=>{
 const r=quietRecord([quietRow(1,1000)]);
 for(const [at,ghost] of [[999,false],[2500,false],[1100,true]])assert.equal(state(r,at,'SAIN:Search',999,ghost).quiet,undefined);
 assert.ok(state(r,2499,'SAIN:Search',999,false).quiet);assert.ok(state(r,1200,'SAIN:Search',999,false).quiet);
});
check('P02 evaluated/refused/malformed/normal never means applied',()=>{
 for(const q of [{applied:false},{active:false},{state:'normal'},{validFor:0},{validFor:NaN},{validFor:undefined}])assert.equal(state(quietRecord([quietRow(1,1000,q)]),1001,'SAIN:Search',999,false).quiet,undefined);
 assert.equal(prepare([quietRow(1,1000,{}, {stage:'accepted'})],'pmc-1').length,0);
});
check('P02 release stops badge and rewind restores prior state',()=>{
 const r=quietRecord([quietRow(1,1000),quietRow(2,1300,{applied:false,active:false,state:'normal'})]);
 assert.equal(state(r,1301,'SAIN:Search',1299,false).active,false);assert.equal(state(r,1200,'SAIN:Search',1199,false).active,true);
});
check('P02 yields to Push, medical, visible combat, native cover and ORBIT travel',()=>{
 for(const a of ['COMET:Push','COMET:ContinuePush','SAIN:Shoot','SAIN:Retreat','SAIN:Surgery','SAIN:Cover','ORBIT:Travel'])
 assert.equal(state(quietRecord([quietRow(1,1000)]),1100,a,1050,false).quiet,undefined);
});
check('P02 does not replace accepted COMET Search and its reasons',()=>{
 const r=quietRecord([row(1,900,'selected','Search'),row(2,950,'accepted','Search'),quietRow(3,1000)]),s=state(r,1100,'COMET:Search',950,false);
 assert.ok(s.actionActive&&s.quiet);assert.equal(s.event.id,2);assert.equal(s.event.choiceReason,'new-contact');assert.match(tooltip(s,r,1100,{}),/Quiet approach/);
});
check('P02 cannot cross sessions or bot instances',()=>{
 for(const other of [row(2,1100,'released','Search',{cometSession:'other'}),row(2,1100,'released','Search',{detail:{botInstance:'other'}})])
 assert.equal(state(quietRecord([quietRow(1,1000),other]),1200,'SAIN:Search',1199,false).quiet,undefined);
});
check('P02 parser tolerates malformed optional fields',()=>{
 for(const raw of [null,[],{},'quiet',{state:'unknown'}])assert.equal(quietHelpers.parseCometQuiet(raw),null);
 const q=quietHelpers.parseCometQuiet({state:'walk',path:Infinity,age:NaN});assert.equal(q.path,undefined);assert.equal(q.age,undefined);
});
const gunHelpers=load('../Private/src/helpers/cometGunfire.ts');
const gunRow=(id,time,g={},extra={})=>row(id,time,'evaluated','GunfireReaction',{feature:'P03',detail:{botInstance:'instance',gunfire:{state:'look',reason:'gunfire-look-at-sound',source:'enemy',owner:'SAIN',personality:'Normal',audible:true,applied:true,validFor:1.5,remaining:3,distance:150,x:1,y:2,z:3,...g}},...extra});
const gunRecord=rows=>({status:'ready',events:prepare(rows,'pmc-1')});
check('P03 applied gaze keeps behavior, color and independent attention',()=>{
 const r=gunRecord([gunRow(1,1000)]),s=state(r,1200,'SAIN:Patrol',999,false);
 assert.equal(s.actionActive,false);assert.ok(s.active);assert.equal(s.decision,'SAIN:Patrol');assert.equal(s.gunfire.remaining,2.8);
 assert.equal(getBehaviorCategory(s.decision).color,getBehaviorCategory('SAIN:Patrol').color);
 const html=tooltip(s,r,1200,{enemy:'<img onerror=boom>'});assert.match(html,/Gunfire reaction/);assert.match(html,/2.8 s remaining/);assert.doesNotMatch(html,/<img/);
});
check('P03 intent, ignored shots and search permission never own an action',()=>{
 for(const g of [{applied:false},{state:'ignored'},{state:'search',passToSain:true},{state:'native',passToSain:true},{validFor:0},{validFor:NaN},{remaining:0}]){
  const s=state(gunRecord([gunRow(1,1000,g)]),1100,'SAIN:Patrol',999,false);assert.equal(s.gunfire,undefined);assert.equal(s.actionActive,false);
 }
 assert.equal(prepare([gunRow(1,1000,{}, {stage:'accepted'})],'pmc-1').length,0);
});
check('P03 burst refusal cannot erase a valid applied gaze',()=>{
 const r=gunRecord([gunRow(1,1000),gunRow(2,1100,{state:'ignored',applied:false,reason:'gunfire-look-already-active'})]);
 assert.ok(state(r,1200,'SAIN:Patrol',999,false).gunfire);
});
check('P03 expires without a final event and never leaks across ghost/future',()=>{
 const r=gunRecord([gunRow(1,1000)]);
 for(const [at,ghost] of [[999,false],[2500,false],[1100,true]])assert.equal(state(r,at,'SAIN:Patrol',999,ghost).gunfire,undefined);
 assert.ok(state(r,2499,'SAIN:Patrol',999,false).gunfire);
});
check('P03 release and incoming-fire context stop gaze, rewind restores it',()=>{
 for(const g of [{state:'ended',applied:false},{state:'native',passToSain:true,reason:'gunfire-directed-at-me'}]){
 const r=gunRecord([gunRow(1,1000),gunRow(2,1300,g)]);assert.equal(state(r,1301,'SAIN:Patrol',999,false).gunfire,undefined);assert.ok(state(r,1200,'SAIN:Patrol',999,false).gunfire);
 }
});
check('P03 yields to new combat, medical and native search but keeps ORBIT travel',()=>{
 for(const action of ['COMET:Push','SAIN:Shoot','SAIN:Retreat','SAIN:Surgery','SAIN:Cover','SAIN:Search'])
 assert.equal(state(gunRecord([gunRow(1,1000)]),1100,action,1050,false).gunfire,undefined);
 assert.ok(state(gunRecord([gunRow(1,1000,{owner:'ORBIT'})]),1100,'ORBIT:Travel',1050,false).gunfire);
});
check('P03 cannot cross session or actor identities',()=>{
 for(const other of [row(2,1100,'released','Search',{cometSession:'other'}),row(2,1100,'released','Search',{detail:{botInstance:'other'}})])
 assert.equal(state(gunRecord([gunRow(1,1000),other]),1200,'SAIN:Patrol',1199,false).gunfire,undefined);
});
check('P03 parser handles malformed and nonfinite optional values',()=>{
 for(const raw of [null,[],{},'noise',{state:'unknown'}])assert.equal(gunHelpers.parseCometGunfire(raw),null);
 const g=gunHelpers.parseCometGunfire({state:'look',distance:Infinity,remaining:NaN});assert.equal(g.distance,undefined);assert.equal(g.remaining,undefined);
});
const floorHelpers=load('../Private/src/helpers/cometFloorHearing.ts');
const floorRow=(id,time,f={},extra={})=>row(id,time,'evaluated','FloorHearing',{feature:'P04',detail:{botInstance:'instance',floorHearing:{state:'blocked',reason:'floor-range-cut',source:'enemy',kind:'FootStep',geometry:'floor-one-confirmed',floors:1,nativeAudible:true,allowed:false,nativeRange:40,finalRange:24,distance:30,targetFactor:.6,appliedFactor:.6,environment:1,occlusion:1,...f}},...extra});
const floorRecord=rows=>({status:'ready',events:prepare(rows,'pmc-1')});
check('P04 rejected hearing displays a diagnostic, never action ownership',()=>{
 const r=floorRecord([floorRow(1,1000)]),s=state(r,1200,'SAIN:Patrol',999,false);
 assert.ok(s.active&&s.floorHearing);assert.equal(s.actionActive,false);assert.equal(s.decision,'SAIN:Patrol');
 assert.equal(getBehaviorCategory(s.decision).color,getBehaviorCategory('SAIN:Patrol').color);
 const html=tooltip(s,r,1200,{enemy:'<img onerror=boom>'});assert.match(html,/Hearing between floors/);assert.match(html,/40.0 m/);assert.match(html,/24.0 m/);assert.match(html,/rejected/);assert.doesNotMatch(html,/<img/);
});
check('P04 snapshot expires, rewinds, skips future and ghosts',()=>{
 const r=floorRecord([floorRow(1,1000)]);
 for(const [at,ghost] of [[999,false],[4000,false],[1200,true]])assert.equal(state(r,at,'SAIN:Patrol',999,ghost).floorHearing,undefined);
 assert.ok(state(r,3999,'SAIN:Patrol',999,false).floorHearing);assert.ok(state(r,1200,'SAIN:Patrol',999,false).floorHearing);
});
check('P04 can coexist with gunfire glance without changing it',()=>{
 const r=floorRecord([gunRow(1,900),floorRow(2,1000,{state:'native',allowed:true,reason:'floor-native-already-attenuated'})]);
 const s=state(r,1200,'ORBIT:Travel',999,false);assert.ok(s.gunfire&&s.floorHearing);assert.equal(s.decision,'ORBIT:Travel');
});
check('P04 does not release an accepted combat action',()=>{
 const r=floorRecord([row(1,900,'selected','Push'),row(2,950,'accepted','Push'),floorRow(3,1000)]);
 const s=state(r,1100,'COMET:Push',950,false);assert.ok(s.actionActive&&s.floorHearing);assert.equal(s.event.id,2);
});
check('P04 cannot become accepted or cross session or actor',()=>{
 assert.equal(prepare([floorRow(1,1000,{}, {stage:'accepted'})],'pmc-1').length,0);
 for(const other of [row(2,1100,'released','Search',{cometSession:'other'}),row(2,1100,'released','Search',{detail:{botInstance:'other'}})])
 assert.equal(state(floorRecord([floorRow(1,1000),other]),1200,'SAIN:Patrol',1199,false).floorHearing,undefined);
});
check('P04 parser and summaries handle malformed values without inventing contacts',()=>{
 for(const raw of [null,[],{},'hearing',{state:'unknown'}])assert.equal(floorHelpers.parseCometFloorHearing(raw),null);
 const h=floorHelpers.parseCometFloorHearing({state:'native',nativeRange:Infinity,finalRange:NaN});assert.equal(h.nativeRange,undefined);assert.equal(h.finalRange,undefined);
 const text=floorHelpers.cometFloorHearingSummary(h).join(' ');assert.match(text,/not a combat action or proof of a new contact/);assert.doesNotMatch(text,/NaN|Infinity/);
});


const closeHelpers=load('../Private/src/helpers/cometCloseDetection.ts');
const closeRow=(id,time,c={},extra={})=>row(id,time,'evaluated','CloseDetection',{feature:'P05',detail:{botInstance:'instance',closeDetection:{state:'adjusted',reason:'close-attention-reduced',target:'enemy',distance:4.5,thirdParty:1.5,unknown:1.5,attentionBefore:2.25,attentionAfter:1.625,nativeModifier:9,finalModifier:6.5,reduction:.5,visualAcquired:false,attentionEvaluated:true,...c}},...extra});
const closeRecord=rows=>({status:'ready',events:prepare(rows,'pmc-1')});
check('P05 adjusted calculation preserves native behavior and does not invent contact',()=>{
 const r=closeRecord([closeRow(1,1000)]),s=state(r,1200,'SAIN:Patrol',999,false);
 assert.ok(s.active&&s.closeDetection);assert.equal(s.actionActive,false);assert.equal(s.decision,'SAIN:Patrol');
 assert.equal(getBehaviorCategory(s.decision).color,getBehaviorCategory('SAIN:Patrol').color);
 const html=tooltip(s,r,1200,{enemy:'<img onerror=boom>'});assert.match(html,/Close detection/);assert.match(html,/acquisition not confirmed/);assert.match(html,/2.25/);assert.match(html,/1.63/);assert.doesNotMatch(html,/<img/);
});
check('P05 actual acquisition is distinct, without claiming COMET caused it',()=>{
 const r=closeRecord([closeRow(1,1000),closeRow(2,1300,{state:'acquired',visualAcquired:true,reason:'close-native-visual-acquired',correctionAge:.2})]);
 assert.equal(state(r,1200,'SAIN:Patrol',999,false).closeDetection.visualAcquired,false);
 const s=state(r,1350,'SAIN:Shoot',1300,false);assert.ok(s.closeDetection.visualAcquired);assert.equal(s.actionActive,false);
 assert.match(tooltip(s,r,1350,{}),/does not prove P05 caused/);assert.match(tooltip(s,r,1350,{}),/0.20 s/);
});
check('P05 expires, rewinds, ignores future and ghost',()=>{
 const r=closeRecord([closeRow(1,1000)]);
 for(const [at,ghost] of [[999,false],[4000,false],[1200,true]])assert.equal(state(r,at,'SAIN:Patrol',999,ghost).closeDetection,undefined);
 assert.ok(state(r,3999,'SAIN:Patrol',999,false).closeDetection);
});
check('P05 refusals and action ownership stay independent',()=>{
 const r=closeRecord([row(1,900,'selected','Push'),row(2,950,'accepted','Push'),closeRow(3,1000,{state:'native',reason:'close-outside-fov'})]);
 const s=state(r,1100,'COMET:Push',950,false);assert.ok(s.actionActive&&s.closeDetection);assert.equal(s.event.id,2);assert.match(tooltip(s,r,1100,{}),/Native vision retained/);
});
check('P05 coexists with P04, cannot cross identities or become an accepted action',()=>{
 const s=state(closeRecord([floorRow(1,900),closeRow(2,1000)]),1200,'SAIN:Patrol',999,false);assert.ok(s.floorHearing&&s.closeDetection);
 assert.equal(prepare([closeRow(1,1000,{}, {stage:'accepted'})],'pmc-1').length,0);
 for(const other of [row(2,1100,'released','Search',{cometSession:'other'}),row(2,1100,'released','Search',{detail:{botInstance:'other'}})])
 assert.equal(state(closeRecord([closeRow(1,1000),other]),1200,'SAIN:Patrol',1199,false).closeDetection,undefined);
});
check('P05 malformed values do not claim visual confirmation',()=>{
 for(const raw of [null,[],{},'vision',{state:'unknown'}])assert.equal(closeHelpers.parseCometCloseDetection(raw),null);
 for(const raw of [{state:'acquired'},{state:'adjusted',visualAcquired:true}])assert.equal(closeHelpers.parseCometCloseDetection(raw).visualAcquired,false);
 const c=closeHelpers.parseCometCloseDetection({state:'native',nativeModifier:Infinity,distance:NaN});assert.equal(c.nativeModifier,undefined);assert.equal(c.distance,undefined);
 assert.doesNotMatch(closeHelpers.cometCloseDetectionSummary(c).join(' '),/NaN|Infinity/);
});
console.log(`${checks} COMET map checks passed (including P05)`);

const impactRow=(id,time,impact={},extra={})=>row(id,time,'evaluated','ImpactReaction',{feature:'P07',detail:{botInstance:'instance',impact:{state:'received',reason:'impact-received',evidence:'impact-sector',contact:'',active:true,remaining:3,validFor:1.5,sectorYaw:180,sectorHalfWidth:45,hits:1,probes:0,nativeAccepted:false,actionObserved:false,movementObserved:false,...impact}},...extra});
check('P07 impact/request/acceptance do not invent an executed action',()=>{
 for(const phase of ['received','requested','accepted']){
  const r=ready([impactRow(1,1000,{state:phase,nativeAccepted:phase==='accepted'})]),s=state(r,1100,'SAIN:Patrol',999,false);
  assert.ok(s.impact&&s.active);assert.equal(s.actionActive,false);assert.equal(s.decision,'SAIN:Patrol');
  const h=tooltip(s,r,1100,{});assert.match(h,/P07/);assert.match(h,/Shooter unknown/);assert.ok(!h.includes('Defensive action observed'));
 }
});
check('P07 actual action and motion are separate from native decision acceptance',()=>{
 const r=ready([impactRow(1,1000,{state:'observed',nativeAccepted:true,actionObserved:true,observed:'move-request-accepted'})]);
 const s=state(r,1100,'SAIN:Patrol',999,false);assert.equal(s.decision,'COMET:DefendUnknown');assert.ok(s.actionActive);
 assert.equal(getBehaviorCategory(s.decision).color,getBehaviorCategory('COMET:Cover').color);
 assert.match(tooltip(s,r,1100,{}),/Movement observed: no/);assert.ok(!tooltip(s,r,1100,{}).includes('No matching decision details'));
 const motion=ready([impactRow(1,1000,{state:'observed',nativeAccepted:true,actionObserved:true,movementObserved:true,observed:'moving-to-protection'})]);
 assert.match(tooltip(state(motion,1100,'COMET:DefendUnknown',1000,false),motion,1100,{}),/Movement observed: yes/);
});
check('P07 cannot override a newer native behavior, other COMET action or ghost',()=>{
 const e=impactRow(1,1000,{state:'observed',nativeAccepted:true,actionObserved:true});const r=ready([e]);
 for(const action of ['SAIN:Shoot','SAIN:Surgery','ORBIT:Travel'])assert.equal(state(r,1200,action,1150,false).decision,action);
 const later=ready([e,row(2,1100,'accepted','Push')]);assert.equal(state(later,1200,'SAIN:Patrol',999,false).decision,'COMET:Push');
 assert.equal(state(r,1100,'COMET:DefendUnknown',1000,true).impact,undefined);assert.equal(state(r,1100,'COMET:DefendUnknown',1000,true).actionActive,false);
});
check('P07 terminal event clears action before next position sample; rewind restores it',()=>{
 const r=ready([impactRow(1,1000,{state:'observed',nativeAccepted:true,actionObserved:true}),impactRow(2,1300,{state:'ended',active:false,reason:'impact-native-contact',nativeAccepted:true,actionObserved:true})]);
 assert.ok(state(r,1200,'COMET:DefendUnknown',1100,false).actionActive);
 const end=state(r,1350,'COMET:DefendUnknown',1100,false);assert.equal(end.actionActive,false);assert.match(tooltip(end,r,1350,{}),/Reaction ended/);
 assert.equal(state(r,4300,'COMET:DefendUnknown',1100,false).active,false);
 assert.ok(state(r,1200,'SAIN:Patrol',999,false).actionActive);
});
check('P07 heartbeat expiry and memory lifetime prevent stale anonymous defense',()=>{
 for(const validFor of [0,.5,1.5,20]){
  const r=ready([impactRow(1,1000,{state:'observed',nativeAccepted:true,actionObserved:true,validFor,remaining:1})]);
  assert.equal(state(r,1000+Math.min(1.5,validFor,1)*1000,'COMET:DefendUnknown',1000,false).actionActive,false);
 }
 const r=ready([impactRow(1,1000)]);assert.equal(state(r,999,'SAIN:Patrol',999,false).impact,undefined);
});
check('P07 contact disclosure requires separate evidence; hover escapes malicious names',()=>{
 for(const evidence of ['injury','shared','impact-sector','unlocated']){
  const r=ready([impactRow(1,1000,{contact:'hidden-person',evidence})]);assert.equal(state(r,1100,'SAIN:Patrol',999,false).impact.contact,'');
 }
 const r=ready([impactRow(1,1000,{contact:'known',evidence:'seen',reason:'<script>',coverReason:'<img>'})]);
 const h=tooltip(state(r,1100,'SAIN:Patrol',999,false),r,1100,{known:'<img src=x>'});assert.match(h,/Independently perceived contact/);assert.ok(!h.includes('<img')&&!h.includes('<script>'));
});
check('P07 malformed events cannot claim actions or survive actor/session replacement',()=>{
 for(const raw of [null,[],{}, {state:'nope'}]){
  const r=ready([impactRow(1,1000,{}, {detail:{botInstance:'instance',impact:raw}})]);assert.equal(r.events.length,0);
 }
 const e=impactRow(1,1000,{state:'observed',actionObserved:true,movementObserved:true,nativeAccepted:false});
 assert.equal(state(ready([e]),1100,'SAIN:Patrol',999,false).actionActive,false);
 const other=closeRow(2,1100,{}, {cometSession:'next',detail:{botInstance:'next',closeDetection:{state:'native'}}});
 assert.equal(state(ready([e,other]),1200,'SAIN:Patrol',1199,false).impact,undefined);
 assert.equal(prepare([impactRow(1,1000,{}, {stage:'accepted'})],'pmc-1').length,0);
});
console.log(`${checks} COMET map checks passed (including P07)`);

const silentHelpers=load('../Private/src/helpers/cometSilentSearch.ts');
const silentRow=(id,time,ss={},extra={})=>row(id,time,'evaluated','SilentSearch',{feature:'P08',detail:{botInstance:'instance',silentSearch:{state:'ready',reason:'silent-search-reevaluate',target:'heard',personality:'Normal',silence:15,delay:15,remaining:10,bonus:15,validFor:1.5,x:3,y:2,z:7,eligible:true,reconsider:true,accepted:false,actionObserved:false,movementObserved:false,walking:false,...ss}},...extra});
check('P08 waiting, request and acceptance are not new combat actions',()=>{
 for(const phase of ['waiting','ready','requested','accepted']){
  const r=ready([silentRow(1,1000,{state:phase,accepted:phase==='accepted'})]),s=state(r,1100,'SAIN:Patrol',999,false);
  assert.ok(s.active&&s.silentSearch);assert.equal(s.actionActive,false);assert.equal(s.decision,'SAIN:Patrol');
  assert.equal(getBehaviorCategory(s.decision).color,getBehaviorCategory('SAIN:Patrol').color);
  const html=tooltip(s,r,1100,{});assert.match(html,/P08/);assert.match(html,/15.1 s/);assert.doesNotMatch(html,/Native search callback observed/);
 }
});
check('P08 enriches real A01 Search without replacing its color, alternatives or ownership',()=>{
 const r=ready([row(1,900,'selected','Search'),row(2,950,'accepted','Search'),silentRow(3,1000,{state:'observed',accepted:true,actionObserved:true,walking:true,choice:'Search'})]);
 const s=state(r,1100,'COMET:Search',950,false);assert.ok(s.actionActive&&s.silentSearch.actionObserved);assert.equal(s.event.id,2);
 const html=tooltip(s,r,1100,{});assert.match(html,/Native search callback observed/);assert.match(html,/Movement observed: no/);assert.match(html,/Walking observed: yes/);assert.match(html,/Main alternatives/);
 const next=ready([silentRow(1,1000,{state:'observed',accepted:true,actionObserved:true,movementObserved:true})]);
 assert.match(tooltip(state(next,1100,'SAIN:Search',999,false),next,1100,{}),/Movement observed: yes/);
 for(const action of ['SAIN:Shoot','SAIN:Surgery','ORBIT:Travel'])assert.equal(state(next,1200,action,1150,false).decision,action);
});
check('P08 leases expire at heartbeat/contact boundary and never show future/ghost evidence',()=>{
 for(const [validFor,remaining] of [[0,10],[.5,10],[20,10],[1.5,.1]]){
  const r=ready([silentRow(1,1000,{validFor,remaining})]);const end=1000+Math.min(1.5,validFor,remaining)*1000;
  assert.equal(state(r,end,'SAIN:Patrol',999,false).silentSearch,undefined);
 }
 const r=ready([silentRow(1,1000)]);
 assert.equal(state(r,999,'SAIN:Patrol',999,false).silentSearch,undefined);assert.equal(state(r,1100,'SAIN:Patrol',999,true).silentSearch,undefined);
 assert.ok(state(r,1200,'SAIN:Patrol',999,false).silentSearch);assert.equal(state(r,2500,'SAIN:Patrol',999,false).silentSearch,undefined);assert.ok(state(r,1200,'SAIN:Patrol',999,false).silentSearch);
});
check('P08 end markers stop claiming motion, even when preceding sample remains Search',()=>{
 const r=ready([silentRow(1,1000,{state:'observed',accepted:true,actionObserved:true,movementObserved:true}),silentRow(2,1200,{state:'ended',validFor:0,remaining:0,accepted:true,actionObserved:true,movementObserved:true})]);
 const s=state(r,1250,'SAIN:Search',999,false);assert.equal(s.silentSearch.actionObserved,false);assert.match(tooltip(s,r,1250,{}),/context ended; native behavior may continue/);
 assert.equal(state(r,4200,'SAIN:Search',999,false).silentSearch,undefined);
});
check('P08 input validation, XSS, identity isolation and independent P07 context',()=>{
 const retained=silentHelpers.parseCometSilentSearch({state:'ready',eligible:true,reconsider:false});assert.match(silentHelpers.cometSilentSearchSummary(retained).join(' '),/no new reconsideration recorded/);
 for(const raw of [null,[],{},'search',{state:'nope'}])assert.equal(silentHelpers.parseCometSilentSearch(raw),null);
 const bad=silentHelpers.parseCometSilentSearch({state:'observed',actionObserved:true,movementObserved:true,walking:true,silence:NaN,delay:Infinity});assert.equal(bad.actionObserved,false);assert.equal(bad.walking,false);assert.doesNotMatch(silentHelpers.cometSilentSearchSummary(bad).join(' '),/NaN|Infinity/);
 const r=ready([impactRow(1,900),silentRow(2,1000,{reason:'<script>',searchRefusal:'<img>'})]),s=state(r,1100,'SAIN:Patrol',999,false);assert.ok(s.impact&&s.silentSearch);
 const html=tooltip(s,r,1100,{heard:'<img src=x>'});assert.doesNotMatch(html,/<img|<script>/);assert.match(html,/Not the live enemy position/);
 for(const other of [row(2,1100,'released','Search',{cometSession:'other'}),row(2,1100,'released','Search',{detail:{botInstance:'other'}})])assert.equal(state(ready([silentRow(1,1000),other]),1200,'SAIN:Patrol',1199,false).silentSearch,undefined);
 assert.equal(prepare([silentRow(1,1000,{}, {stage:'accepted'})],'pmc-1').length,0);
});
console.log(`${checks} COMET map checks passed (including P08)`);

const abandonHelpers=load('../Private/src/helpers/cometSearchAbandonment.ts');
const abandonRow=(id,time,a={},extra={})=>row(id,time,'evaluated','SearchAbandonment',{feature:'P09',detail:{botInstance:'instance',searchAbandonment:{state:'checking',reason:'search-check-local-inspection',target:'known',silence:22,requiredSilence:20,inspected:2,requiredInspection:3,distance:2,validFor:1.5,interruptions:0,forgetRequested:false,forgetObserved:false,...a}},...extra});
check('P09 reached/checking/requested/abandoned is context, not combat ownership',()=>{
 for(const phase of ['reached','checking','requested','abandoned','ended']){
  const r=ready([abandonRow(1,1000,{state:phase,forgetRequested:['requested','abandoned'].includes(phase),forgetObserved:phase==='abandoned'})]);
  const s=state(r,1100,'SAIN:Patrol',999,false);assert.ok(s.active&&s.searchAbandonment);assert.equal(s.actionActive,false);assert.equal(s.decision,'SAIN:Patrol');
  const html=tooltip(s,r,1100,{});assert.match(html,/P09/);assert.equal(html.includes('SAIN forgetting confirmed'),phase==='abandoned');
 }
});
check('P09 does not fabricate elapsed inspection or override native action/color',()=>{
 const r=ready([row(1,800,'selected','Search'),row(2,900,'accepted','Search'),abandonRow(3,1000)]);
 const s=state(r,1200,'COMET:Search',900,false);assert.ok(s.actionActive);assert.equal(s.event.id,2);assert.equal(s.searchAbandonment.inspected,2);
 const html=tooltip(s,r,1200,{});assert.match(html,/2.0 \/ 3.0 s/);assert.match(html,/Main alternatives/);
 for(const action of ['SAIN:Shoot','SAIN:Surgery','ORBIT:Travel']){const v=state(ready([abandonRow(1,1000)]),1200,action,1100,false);assert.equal(v.decision,action);assert.equal(getBehaviorCategory(v.decision).color,getBehaviorCategory(action).color);}
});
check('P09 request is never confirmation, including malformed/contradictory data',()=>{
 for(const phase of ['inactive','reached','checking','requested','ended'])assert.equal(abandonHelpers.parseCometSearchAbandonment({state:phase,forgetRequested:true,forgetObserved:true}).forgetObserved,false);
 assert.equal(abandonHelpers.parseCometSearchAbandonment({state:'abandoned',forgetObserved:true}).forgetObserved,false);
 for(const raw of [null,[],{}, {state:'unknown'}])assert.equal(abandonHelpers.parseCometSearchAbandonment(raw),null);
 const t=abandonHelpers.parseCometSearchAbandonment({state:'checking',inspected:Infinity,silence:NaN,distance:-1,validFor:NaN});assert.equal(t.inspected,undefined);assert.equal(t.silence,undefined);assert.equal(t.distance,undefined);
 const r=ready([abandonRow(1,1000,{state:'requested',forgetRequested:true})]);assert.match(tooltip(state(r,1100,'SAIN:Patrol',999,false),r,1100,{}),/not yet confirmed/);
});
check('P09 replay expiry, rewind, actor isolation and ghost safety',()=>{
 for(const phase of ['checking','abandoned','ended']){const r=ready([abandonRow(1,1000,{state:phase})]);const end=1000+(phase==='checking'?1500:3000);
  assert.equal(state(r,999,'SAIN:Patrol',999,false).searchAbandonment,undefined);assert.ok(state(r,1100,'SAIN:Patrol',999,false).searchAbandonment);
  assert.equal(state(r,end,'SAIN:Patrol',999,false).searchAbandonment,undefined);assert.equal(state(r,1100,'SAIN:Patrol',999,true).searchAbandonment,undefined);
  assert.ok(state(r,1100,'SAIN:Patrol',999,false).searchAbandonment);}
 for(const next of [row(2,1100,'released','Search',{cometSession:'new'}),row(2,1100,'released','Search',{detail:{botInstance:'new'}})])assert.equal(state(ready([abandonRow(1,1000),next]),1200,'SAIN:Patrol',1199,false).searchAbandonment,undefined);
 assert.equal(prepare([abandonRow(1,1000,{}, {stage:'accepted'})],'pmc-1').length,0);
});
check('P09 tooltip escapes recorded names and reasons',()=>{
 const r=ready([abandonRow(1,1000,{reason:'<script>alert(1)</script>'})]);const html=tooltip(state(r,1100,'SAIN:Patrol',999,false),r,1100,{known:'<img src=x>'});
 assert.doesNotMatch(html,/<script>|<img/);assert.match(html,/&lt;script/);assert.match(html,/not the entire room/);
});
console.log(`${checks} COMET map checks passed (including P09)`);

const environmentHelpers=load('../Private/src/helpers/cometEnvironment.ts');
const environmentRow=(id,time,e={},extra={})=>row(id,time,'evaluated','EnvironmentContext',{feature:'P10',detail:{botInstance:'instance',environmentContext:{reported:'outdoor',source:'ai-zone+eft-environment',aiIndoorZone:false,eftIndoor:false,conflict:false,age:.1,ceiling:'detected',ceilingHeight:3,ceilingAge:.1,checkedDistance:20,probeReason:'overhead-surface',purpose:'grenade-preparation',influence:'observation-only',validFor:.4,...e}},...extra});
check('P10 context adds badge without changing native action or color',()=>{
 for(const action of ['SAIN:Shoot','SAIN:Surgery','ORBIT:Travel']) {
  const r=ready([environmentRow(1,1000)]),s=state(r,1100,action,999,false);
  assert.ok(s.active&&s.environmentContext);assert.equal(s.actionActive,false);assert.equal(s.decision,action);
  assert.equal(getBehaviorCategory(s.decision).color,getBehaviorCategory(action).color);
  const html=tooltip(s,r,1100,{});assert.match(html,/P10/);assert.match(html,/Reported environment: outdoor/);assert.match(html,/Overhead surface detected/);assert.match(html,/Observation only/);
 }
});
check('P10 uncertainty and finite ray limit remain explicit',()=>{
 for(const ceiling of ['not-checked','uncertain','deferred','clear-to-limit']) {
  const r=ready([environmentRow(1,1000,{ceiling,reported:'unknown',ceilingHeight:null})]);
  const html=tooltip(state(r,1100,'SAIN:Patrol',999,false),r,1100,{});
  assert.doesNotMatch(html,/Overhead surface detected/);if(ceiling==='clear-to-limit')assert.match(html,/open sky is not confirmed/);
 }
 const r=ready([environmentRow(1,1000,{reported:'conflicting',conflict:true,aiIndoorZone:true})]);assert.match(tooltip(state(r,1100,'SAIN:Patrol',999,false),r,1100,{}),/sources disagree/);
});
check('P10 cache expiry, rewind, actor and session isolation',()=>{
 const r=ready([environmentRow(1,1000)]);
 assert.equal(state(r,999,'SAIN:Patrol',999,false).environmentContext,undefined);
 assert.ok(state(r,1399,'SAIN:Patrol',999,false).environmentContext);
 assert.equal(state(r,1400,'SAIN:Patrol',999,false).environmentContext,undefined);
 assert.equal(state(r,1100,'SAIN:Patrol',999,true).environmentContext,undefined);
 assert.ok(state(r,1100,'SAIN:Patrol',999,false).environmentContext);
 for(const other of [row(2,1100,'released','Search',{cometSession:'other'}),row(2,1100,'released','Search',{detail:{botInstance:'other'}})])assert.equal(state(ready([environmentRow(1,1000),other]),1200,'SAIN:Patrol',1199,false).environmentContext,undefined);
 const reset=ready([environmentRow(1,1000),environmentRow(2,1100,{reported:'unknown',validFor:0})]);assert.equal(state(reset,1200,'SAIN:Patrol',999,false).environmentContext,undefined);
 assert.equal(prepare([environmentRow(1,1000,{}, {stage:'accepted'})],'pmc-1').length,0);
});
check('P10 summary never invents action authorization or invalid physical confirmation',()=>{
 for(const raw of [null,[],{},'indoor',{reported:'nonsense'}])assert.equal(environmentHelpers.parseCometEnvironment(raw),null);
 for(const bad of [{ceilingHeight:NaN},{ceilingHeight:Infinity},{ceilingHeight:-1},{ceilingHeight:21},{ceilingAge:null},{checkedDistance:null}]) {
  const parsed=environmentHelpers.parseCometEnvironment({reported:'outdoor',ceiling:'detected',ceilingHeight:3,ceilingAge:.1,checkedDistance:20,...bad});
  assert.equal(parsed.ceiling,'uncertain');assert.doesNotMatch(environmentHelpers.cometEnvironmentSummary(parsed).join(' '),/NaN|Infinity|Overhead surface detected/);
 }
 const forged=environmentHelpers.parseCometEnvironment({reported:'indoor',influence:'grenade-authorized'});assert.doesNotMatch(environmentHelpers.cometEnvironmentSummary(forged).join(' '),/grenade-authorized/);
});
check('P10 tooltip escapes source strings and coexists with accepted actions',()=>{
 const r=ready([row(1,800,'selected','Search'),row(2,900,'accepted','Search'),environmentRow(3,1000,{purpose:'<script>',source:'<img>'})]);
 const s=state(r,1100,'COMET:Search',900,false);assert.ok(s.actionActive&&s.environmentContext);assert.equal(s.event.id,2);
 const html=tooltip(s,r,1100,{});assert.match(html,/Main alternatives/);assert.doesNotMatch(html,/<script>|<img>/);assert.match(html,/&lt;script/);
 assert.equal(s.environmentContext.age,.1); // replay does not invent fresh samples
});
console.log(`${checks} COMET map checks passed (including P10)`);

const doorHelpers=load('../Private/src/helpers/cometDoor.ts');
const doorRow=(id,time,d={},extra={})=>row(id,time,'evaluated','DoorApproach',{feature:'D01',detail:{botInstance:'instance',doorApproach:{state:'approaching',reason:'door-approaching',target:'known',source:'heard',door:'test-door',side:'right',knownX:0,knownY:0,knownZ:3,contactAge:3,x:1.2,y:0,z:-.9,pathLength:4,elapsed:1,remaining:11,requested:true,movementAccepted:true,moved:true,arrived:false,validFor:1.5,candidates:[{door:'nearest',side:'left',eligible:false,reason:'door-point-occupied'},{door:'test-door',side:'right',eligible:true,reason:'door-reachable-protected-frame',pathLength:4,score:4}],...d}},...extra});
check('D01 map shows doorway context while keeping Search behavior colors',()=>{
 const r=ready([row(1,800,'selected','Search'),row(2,900,'accepted','Search'),doorRow(3,1000)]);
 const s=state(r,1100,'COMET:Search',900,false);assert.ok(s.active&&s.actionActive&&s.doorApproach);assert.equal(s.event.id,2);
 const html=tooltip(s,r,1100,{known:'Known enemy'});assert.match(html,/Doorway approach - D01/);assert.match(html,/Known enemy/);assert.match(html,/test-door/);assert.match(html,/point occupied/);assert.match(html,/Movement observed/);assert.match(html,/Main alternatives/);
 for(const action of ['SAIN:Shoot','SAIN:Surgery','ORBIT:Travel']){const v=state(ready([doorRow(1,1000)]),1100,action,999,false);assert.equal(v.decision,action);assert.equal(getBehaviorCategory(v.decision).color,getBehaviorCategory(action).color);assert.equal(v.actionActive,false);}
});
check('D01 request, acceptance, movement and arrival never collapse into one outcome',()=>{
 for(const [d,expected] of [[{state:'planning',requested:false,movementAccepted:false,moved:false},'Comparing doorway'],[{state:'planning',requested:true,movementAccepted:false,moved:false},'Movement requested'],[{moved:false},'Native movement accepted'],[{moved:true},'Movement observed'],[{state:'arrived',arrived:true},'Arrival confirmed'],[{state:'ended',reason:'door-native-priority'},'Preparation ended']]){
  const r=ready([doorRow(1,1000,d)]);assert.ok(tooltip(state(r,1100,'COMET:Search',900,false),r,1100,{}).includes(expected));
 }
 for(const stateName of ['planning','approaching','ended'])assert.equal(doorHelpers.parseCometDoor({state:stateName,requested:true,movementAccepted:true,arrived:true}).arrived,false);
 assert.equal(doorHelpers.parseCometDoor({state:'arrived',requested:false,movementAccepted:true,arrived:true}).arrived,false);
});
check('D01 expiry, rewind, ghost and session/actor boundaries',()=>{
 const r=ready([doorRow(1,1000)]);assert.ok(state(r,1100,'SAIN:Search',900,false).doorApproach);
 assert.equal(state(r,999,'SAIN:Search',900,false).doorApproach,undefined);assert.equal(state(r,2500,'SAIN:Search',900,false).doorApproach,undefined);
 assert.equal(state(r,1100,'SAIN:Search',900,true).doorApproach,undefined);assert.ok(state(r,1100,'SAIN:Search',900,false).doorApproach);
 for(const other of [row(2,1100,'released','Search',{cometSession:'new'}),row(2,1100,'released','Search',{detail:{botInstance:'new'}})])assert.equal(state(ready([doorRow(1,1000),other]),1200,'SAIN:Search',999,false).doorApproach,undefined);
 assert.equal(prepare([doorRow(1,1000,{}, {stage:'accepted'})],'pmc-1').length,0);
});
check('D01 malformed details and HTML remain harmless',()=>{
 for(const raw of [null,[],{},'door',{state:'nonsense'}])assert.equal(doorHelpers.parseCometDoor(raw),null);
 const t=doorHelpers.parseCometDoor({state:'approaching',elapsed:NaN,pathLength:Infinity,remaining:-1,candidates:[null,[],1]});assert.equal(t.elapsed,undefined);assert.equal(t.remaining,undefined);assert.equal(t.candidates.length,0);
 const r=ready([doorRow(1,1000,{door:'<img src=x>',reason:'<script>',candidates:[{door:'<script>',reason:'<img>'}]})]);const html=tooltip(state(r,1100,'SAIN:Search',900,false),r,1100,{});assert.doesNotMatch(html,/<script>|<img/);assert.match(html,/&lt;img/);
 assert.equal(state(ready([doorRow(1,1000)]),1400,'SAIN:Search',900,false).doorApproach.contactAge,3);
});
console.log(`${checks} COMET map checks passed (including D01)`);

const jumpHelpers=load('../Private/src/helpers/cometDoorJump.ts');
const jumpRow=(id,time,j={},extra={})=>row(id,time,'evaluated','DoorJumpPeek',{feature:'D02',detail:{botInstance:'instance',doorJumpPeek:{state:'airborne',reason:'peek-takeoff-observed',door:'test-door',target:'known',source:'heard',personality:'Normal',chance:10,roll:5,knownX:0,knownY:0,knownZ:3,contactAge:3,stamina:50,forwardSpeed:1.4,runUpDistance:.3,elapsed:.5,remaining:3.5,observationElapsed:0,doorOpenObserved:true,movementAccepted:true,jumpRequested:true,takeoffObserved:true,landingObserved:false,visualAcquired:false,returned:false,validFor:1.5,alternatives:['Normal SAIN search remains available.'],...j}},...extra});
check('D02 badge and tooltip show attempt evidence without changing native behavior color',()=>{
 const r=ready([row(1,800,'selected','Search'),row(2,900,'accepted','Search'),jumpRow(3,1000)]);
 const s=state(r,1100,'COMET:Search',900,false);assert.ok(s.active&&s.actionActive&&s.doorJumpPeek);assert.equal(s.event.id,2);
 const html=tooltip(s,r,1100,{known:'Known enemy'});assert.match(html,/Doorway jump peek - D02/);assert.match(html,/Known enemy/);assert.match(html,/Takeoff observed/);assert.match(html,/Landing not confirmed/);assert.match(html,/Main alternatives/);
 for(const action of ['SAIN:Shoot','SAIN:Surgery','ORBIT:Travel']){const v=state(ready([jumpRow(1,1000)]),1100,action,999,false);assert.equal(v.decision,action);assert.equal(v.actionActive,false);assert.equal(getBehaviorCategory(v.decision).color,getBehaviorCategory(action).color);}
});
check('D02 requests never fabricate physical or visual success',()=>{
 for(const phase of ['validating','opening','run-up','jump-requested','airborne','landing','observing','return-pending','returning','return-jump-requested','return-airborne','completed','ended']){
  const parsed=jumpHelpers.parseCometDoorJump({state:phase,movementAccepted:false,jumpRequested:true,takeoffObserved:true,landingObserved:true,returned:true});assert.equal(parsed.takeoffObserved,false);assert.equal(parsed.landingObserved,false);assert.equal(parsed.returned,false);
 }
 const incomplete=jumpHelpers.parseCometDoorJump({state:'completed',movementAccepted:true,jumpRequested:true,takeoffObserved:true,landingObserved:true,returned:true,returnJumpRequested:true,returnTakeoffObserved:false,returnLandingObserved:true});assert.equal(incomplete.returned,false);
 const complete=jumpHelpers.parseCometDoorJump({state:'completed',movementAccepted:true,jumpRequested:true,takeoffObserved:true,landingObserved:true,returned:true});assert.equal(complete.returned,true);assert.equal(complete.visualAcquired,false);
});
check('D02 event isolation, time rewind, expiry, ghosts and replacement instances',()=>{
 const r=ready([jumpRow(1,1000)]);assert.ok(state(r,1100,'SAIN:Search',900,false).doorJumpPeek);
 assert.equal(state(r,999,'SAIN:Search',900,false).doorJumpPeek,undefined);assert.equal(state(r,2500,'SAIN:Search',900,false).doorJumpPeek,undefined);
 assert.equal(state(r,1100,'SAIN:Search',900,true).doorJumpPeek,undefined);
 for(const other of [row(2,1100,'released','Search',{cometSession:'new'}),row(2,1100,'released','Search',{detail:{botInstance:'new'}})])assert.equal(state(ready([jumpRow(1,1000),other]),1200,'SAIN:Search',999,false).doorJumpPeek,undefined);
 assert.equal(prepare([jumpRow(1,1000,{}, {stage:'accepted'})],'pmc-1').length,0);
 assert.equal(state(r,1400,'SAIN:Search',900,false).doorJumpPeek.contactAge,3);
});
check('D02 malformed telemetry and untrusted tooltip strings',()=>{
 for(const raw of [null,[],{},'jump',{state:'nonsense'}])assert.equal(jumpHelpers.parseCometDoorJump(raw),null);
 const t=jumpHelpers.parseCometDoorJump({state:'airborne',elapsed:NaN,stamina:Infinity,remaining:-1,alternatives:[null,1,{}]});assert.equal(t.elapsed,undefined);assert.equal(t.remaining,undefined);assert.equal(t.alternatives.length,0);
 const r=ready([jumpRow(1,1000,{door:'<img src=x>',reason:'<script>',alternatives:['<img>']})]);const html=tooltip(state(r,1100,'SAIN:Search',900,false),r,1100,{});assert.doesNotMatch(html,/<script>|<img/);assert.match(html,/&lt;img/);
});
console.log(`${checks} COMET map checks passed (including D02)`);

const runHelpers=load('../Private/src/helpers/cometDoorRun.ts');
const runRow=(id,time,v={},extra={})=>row(id,time,'evaluated','DoorRunBy',{feature:'D03',detail:{botInstance:'instance',doorRunBy:{...{"state": "across", "reason": "run-by-movement-accepted", "style": "run-by", "door": "test-door", "target": "known", "source": "heard", "personality": "Chad", "chance": 25, "roll": 12, "styleRoll": 20, "preference": 40, "jumpEligible": true, "runEligible": true, "jumpReason": "", "runReason": "", "knownX": 0, "knownY": 0, "knownZ": 4, "contactAge": 3, "stamina": 50, "forwardSpeed": 3, "distanceMoved": 1, "elapsed": 0.5, "remaining": 5.5, "turnElapsed": 0, "watchElapsed": 0, "doorOpenObserved": true, "movementAccepted": true, "sprintObserved": true, "farArrived": false, "sprintExitObserved": false, "returnAccepted": false, "returned": false, "visualAcquired": false, "validFor": 1.5, "alternatives": ["Jump: eligible", "Run-by: eligible", "Normal SAIN search"]},...v}},...extra});
check('D03 shared choice and actual sprint visible while keeping native action colors',()=>{
 const r=ready([row(1,800,'selected','Search'),row(2,900,'accepted','Search'),runRow(3,1000)]);
 const s=state(r,1100,'COMET:Search',900,false);assert.ok(s.active&&s.actionActive&&s.doorRunBy);assert.equal(s.event.id,2);
 const html=tooltip(s,r,1100,{known:'Known enemy'});assert.match(html,/Doorway run-by - D03/);assert.match(html,/Known enemy/);assert.match(html,/Shared opportunity 25/);assert.match(html,/Style roll 20/);assert.match(html,/Outward sprint: observed/);assert.match(html,/Walking return: not requested/);assert.match(html,/Main alternatives/);
 for(const action of ['SAIN:Shoot','SAIN:Surgery','ORBIT:Travel']){const v=state(ready([runRow(1,1000)]),1100,action,999,false);assert.equal(v.decision,action);assert.equal(v.actionActive,false);assert.equal(getBehaviorCategory(v.decision).color,getBehaviorCategory(action).color);}
});
check('D03 requests never fabricate physical success and jump delegation cannot imply a run-by',()=>{
 for(const phase of ['validating','opening','across','turning','return-pending','returning','watching','completed','ended','delegated']){
  const t=runHelpers.parseCometDoorRun({state:phase,style:'run-by',movementAccepted:false,sprintObserved:true,farArrived:true,sprintExitObserved:true,returnAccepted:true,returned:true});assert.equal(t.sprintObserved,false);assert.equal(t.returned,false);
 }
 const t=runHelpers.parseCometDoorRun({state:'delegated',style:'jump',movementAccepted:true,sprintObserved:true,farArrived:true,sprintExitObserved:true,returnAccepted:true,returned:true});assert.equal(t.returned,false);
 const done=runHelpers.parseCometDoorRun({state:'watching',style:'run-by',movementAccepted:true,sprintObserved:true,farArrived:true,sprintExitObserved:true,returnAccepted:true,returned:true});assert.equal(done.returned,true);assert.equal(done.visualAcquired,false);
});
check('D03 expired, ghost, rewound or other-actor observations never leak into current replay',()=>{
 const r=ready([runRow(1,1000)]);assert.ok(state(r,1100,'SAIN:Search',900,false).doorRunBy);
 assert.equal(state(r,999,'SAIN:Search',900,false).doorRunBy,undefined);assert.equal(state(r,2500,'SAIN:Search',900,false).doorRunBy,undefined);
 assert.equal(state(r,1100,'SAIN:Search',900,true).doorRunBy,undefined);
 for(const other of [row(2,1100,'released','Search',{cometSession:'new'}),row(2,1100,'released','Search',{detail:{botInstance:'new'}})])assert.equal(state(ready([runRow(1,1000),other]),1200,'SAIN:Search',999,false).doorRunBy,undefined);
 assert.equal(prepare([runRow(1,1000,{}, {stage:'accepted'})],'pmc-1').length,0);
 assert.equal(state(r,1400,'SAIN:Search',900,false).doorRunBy.contactAge,3);
});
check('D03 malformed telemetry and tooltip strings are handled safely',()=>{
 for(const raw of [null,[],{},'run',{state:'nonsense'}])assert.equal(runHelpers.parseCometDoorRun(raw),null);
 const t=runHelpers.parseCometDoorRun({state:'across',elapsed:NaN,stamina:Infinity,remaining:-1,alternatives:[null,1,{}]});assert.equal(t.elapsed,undefined);assert.equal(t.remaining,undefined);assert.equal(t.alternatives.length,0);
 const r=ready([runRow(1,1000,{door:'<img src=x>',reason:'<script>',alternatives:['<img>']})]);const html=tooltip(state(r,1100,'SAIN:Search',900,false),r,1100,{});assert.doesNotMatch(html,/<script>|<img/);assert.match(html,/&lt;img/);
});
check('D03 replacing a live run-by context updates its final outcome',()=>{
 const r=ready([runRow(1,1000),runRow(2,1200,{state:'ended',reason:'run-by-return-route-invalidated'})]);
 assert.equal(state(r,1150,'SAIN:Search',900,false).doorRunBy.state,'across');
 const t=state(r,1250,'SAIN:Search',900,false).doorRunBy;assert.equal(t.state,'ended');assert.equal(t.returned,false);
 assert.match(tooltip(state(r,1250,'SAIN:Search',900,false),r,1250,{}),/return route invalidated/);
});
console.log(`${checks} COMET map checks passed (including D03)`);

const stepHelpers=load('../Private/src/helpers/cometDoorStep.ts');
const stepRow=(id,time,v={},extra={})=>row(id,time,'evaluated','DoorStepPeek',{feature:'D04',detail:{botInstance:'instance',doorStepPeek:{...{"state": "observing", "reason": "step-arrival-observed", "parent": "D02", "door": "test-door", "target": "known", "source": "heard", "personality": "Chad", "purpose": "check-known-side-of-opening", "chance": 50, "roll": 12, "peek": 1, "completed": 0, "knownX": 0, "knownY": 0, "knownZ": 4, "contactAge": 3, "stackX": -1.2, "stackY": 0, "stackZ": -0.9, "pointX": -0.4, "pointY": 0, "pointZ": -0.9, "lookX": 0.3, "lookY": 1.3, "lookZ": 0.6, "actualX": -0.4, "actualY": 0, "actualZ": -0.9, "pose": 1, "actualPose": 1, "poseObserved": true, "movementAccepted": true, "movementObserved": true, "arrived": true, "returnAccepted": false, "returned": false, "looking": true, "visualAcquired": false, "observation": 0.2, "requiredObservation": 0.6, "rest": 0, "requiredRest": 0.7, "elapsed": 0.6, "remaining": 5.4, "validFor": 1.5, "alternatives": ["Second angle must differ", "Normal SAIN search remains available"]},...v}},...extra});
check('D04 observed peeks shown without replacing native colors',()=>{
 const r=ready([row(1,800,'selected','Search'),row(2,900,'accepted','Search'),stepRow(3,1000)]);
 const s=state(r,1100,'COMET:Search',900,false);assert.ok(s.active&&s.actionActive&&s.doorStepPeek);assert.equal(s.event.id,2);
 const html=tooltip(s,r,1100,{known:'Known enemy'});assert.match(html,/Small doorway peeks - D04/);assert.match(html,/Known enemy/);assert.match(html,/After D02 return/);assert.match(html,/Chance 50/);assert.match(html,/Walking step: observed/);assert.match(html,/Return: not requested/);
 for(const action of ['SAIN:Shoot','SAIN:Surgery','ORBIT:Travel']){const v=state(ready([stepRow(1,1000)]),1100,action,999,false);assert.equal(v.decision,action);assert.equal(v.actionActive,false);assert.equal(getBehaviorCategory(v.decision).color,getBehaviorCategory(action).color);}
});
check('D04 causal proof never promotes requests to completion',()=>{
 for(const phase of ['planning','preparing','outward-pending','outward','observing','return-pending','returning','resting','completed','ended']){
  const t=stepHelpers.parseCometDoorStep({state:phase,parent:'D02',movementAccepted:false,movementObserved:true,arrived:true,returnAccepted:true,returned:true});assert.equal(t.movementObserved,false);assert.equal(t.returned,false);
 }
 const t=stepHelpers.parseCometDoorStep({state:'resting',parent:'D02',movementAccepted:true,movementObserved:true,arrived:true,returnAccepted:true,returned:true});assert.equal(t.returned,true);
 assert.equal(stepHelpers.parseCometDoorStep({state:'observing',parent:'D03'}),null);
});
check('D04 scope, replay rewind, freshness, ghost isolation and replacement',()=>{
 const r=ready([stepRow(1,1000)]);assert.ok(state(r,1100,'SAIN:Search',900,false).doorStepPeek);
 assert.equal(state(r,999,'SAIN:Search',900,false).doorStepPeek,undefined);assert.equal(state(r,2500,'SAIN:Search',900,false).doorStepPeek,undefined);
 assert.equal(state(r,1100,'SAIN:Search',900,true).doorStepPeek,undefined);
 for(const other of [row(2,1100,'released','Search',{cometSession:'new'}),row(2,1100,'released','Search',{detail:{botInstance:'new'}})])assert.equal(state(ready([stepRow(1,1000),other]),1200,'SAIN:Search',999,false).doorStepPeek,undefined);
 assert.equal(prepare([stepRow(1,1000,{}, {stage:'accepted'})],'pmc-1').length,0);
 const replacement=ready([stepRow(1,1000),stepRow(2,1200,{state:'ended',reason:'step-motion-stalled'})]);assert.equal(state(replacement,1250,'SAIN:Search',900,false).doorStepPeek.state,'ended');assert.equal(state(replacement,1150,'SAIN:Search',900,false).doorStepPeek.state,'observing');
});
check('D04 malformed data and escaped tooltip text',()=>{
 for(const raw of [null,[],{},'step',{state:'nonsense',parent:'D02'}])assert.equal(stepHelpers.parseCometDoorStep(raw),null);
 const t=stepHelpers.parseCometDoorStep({state:'observing',parent:'D02',observation:NaN,remaining:-1,pose:2,actualPose:Infinity,peek:3,completed:1.5,alternatives:[null,1,{}]});assert.equal(t.observation,undefined);assert.equal(t.pose,undefined);assert.equal(t.peek,undefined);assert.equal(t.completed,undefined);assert.equal(t.alternatives.length,0);
 const r=ready([stepRow(1,1000,{door:'<img src=x>',reason:'<script>',purpose:'<svg>',alternatives:['<img>']})]);const html=tooltip(state(r,1100,'SAIN:Search',900,false),r,1100,{});assert.doesNotMatch(html,/<script>|<img|<svg/);assert.match(html,/&lt;img/);
});
console.log(`${checks} COMET map checks passed (including D04)`);

const fakeHelpers=load('../Private/src/helpers/cometDoorFake.ts');
const fakeRow=(id,time,v={},extra={})=>row(id,time,'evaluated','DoorFakeGrenade',{feature:'D05',detail:{botInstance:'instance',doorFakeGrenade:{state:'holstering',reason:'fake-holster-accepted',interrupted:'',door:'test-door',target:'known',source:'heard',personality:'Chad',grenade:'nade',weapon:'rifle',reaction:'not-observed',chance:20,roll:12,knownX:0,knownY:0,knownZ:4,contactAge:3,elapsed:.5,coverVerified:true,drawRequested:true,callbackCompleted:true,callbackSucceeded:true,handsObserved:true,holsterRequested:true,holsterAccepted:true,weaponReady:false,guard:true,recoveryFailed:false,holsterAttempts:1,validFor:1.5,alternatives:['Normal SAIN search'],...v}},...extra});
check('D05 map and badge explain real hands evidence while preserving native colors',()=>{
 const r=ready([row(1,800,'selected','Search'),row(2,900,'accepted','Search'),fakeRow(3,1000)]);
 const s=state(r,1100,'COMET:Search',900,false);assert.ok(s.active&&s.actionActive&&s.doorFakeGrenade);assert.equal(s.event.id,2);
 const html=tooltip(s,r,1100,{known:'Known enemy'});assert.match(html,/Fake grenade - D05/);assert.match(html,/Known enemy/);assert.match(html,/grenade observed/);assert.match(html,/accepted; not yet ready/);assert.match(html,/does not prove/);assert.match(html,/temporarily blocked/);
 for(const action of ['SAIN:Shoot','SAIN:Surgery','ORBIT:Travel']){const v=state(ready([fakeRow(1,1000)]),1100,action,999,false);assert.equal(v.decision,action);assert.equal(v.actionActive,false);assert.equal(getBehaviorCategory(v.decision).color,getBehaviorCategory(action).color);}
});
check('D05 never turns a request or callback into successful observed feint',()=>{
 for(const phase of ['validating','drawing','holstering','recovering','suspended','ended']){
  const t=fakeHelpers.parseCometDoorFake({state:phase,drawRequested:false,handsObserved:true,callbackCompleted:true,callbackSucceeded:true,holsterRequested:true,holsterAccepted:true,weaponReady:true});
  for(const k of ['handsObserved','callbackCompleted','callbackSucceeded','holsterRequested','holsterAccepted','weaponReady'])assert.equal(t[k],false);
 }
 const done={state:'completed',drawRequested:true,handsObserved:true,holsterRequested:true,holsterAccepted:true,weaponReady:true};
 assert.ok(fakeHelpers.parseCometDoorFake(done));
 for(const key of ['drawRequested','handsObserved','holsterRequested','holsterAccepted','weaponReady'])assert.equal(fakeHelpers.parseCometDoorFake({...done,[key]:false}),null);
 assert.equal(fakeHelpers.parseCometDoorFake({...done,interrupted:'visible-threat'}),null);
 assert.equal(fakeHelpers.parseCometDoorFake({state:'drawing',drawRequested:true,callbackCompleted:true,callbackSucceeded:true}).handsObserved,false);
});
check('D05 expiry, rewind, ghost isolation and actor/session boundaries',()=>{
 const r=ready([fakeRow(1,1000)]);assert.ok(state(r,1100,'SAIN:Search',900,false).doorFakeGrenade);
 assert.equal(state(r,999,'SAIN:Search',900,false).doorFakeGrenade,undefined);assert.equal(state(r,2500,'SAIN:Search',900,false).doorFakeGrenade,undefined);
 assert.equal(state(r,1100,'SAIN:Search',900,true).doorFakeGrenade,undefined);
 for(const other of [row(2,1100,'released','Search',{cometSession:'new'}),row(2,1100,'released','Search',{detail:{botInstance:'new'}})])assert.equal(state(ready([fakeRow(1,1000),other]),1200,'SAIN:Search',999,false).doorFakeGrenade,undefined);
 assert.equal(prepare([fakeRow(1,1000,{}, {stage:'accepted'})],'pmc-1').length,0);
 const replacement=ready([fakeRow(1,1000),fakeRow(2,1200,{state:'ended',reason:'fake-weapon-recovery-timeout',recoveryFailed:true})]);
 assert.equal(state(replacement,1250,'SAIN:Search',900,false).doorFakeGrenade.state,'ended');assert.equal(state(replacement,1150,'SAIN:Search',900,false).doorFakeGrenade.state,'holstering');
});
check('D05 malformed telemetry and strings cannot break replay or inject HTML',()=>{
 for(const raw of [null,[],{},'fake',{state:'nonsense'}])assert.equal(fakeHelpers.parseCometDoorFake(raw),null);
 const t=fakeHelpers.parseCometDoorFake({state:'drawing',elapsed:NaN,contactAge:Infinity,validFor:-1,alternatives:[null,1,{}]});assert.equal(t.elapsed,undefined);assert.equal(t.validFor,undefined);assert.equal(t.alternatives.length,0);
 const r=ready([fakeRow(1,1000,{door:'<img src=x>',reason:'<script>',reaction:'<svg>',alternatives:['<img>']})]);const html=tooltip(state(r,1100,'SAIN:Search',900,false),r,1100,{});assert.doesNotMatch(html,/<script>|<img|<svg/);assert.match(html,/&lt;img/);
});
console.log(`${checks} COMET map checks passed (including D05)`);

const medicalHelpers=load('../Private/src/helpers/cometDoorMedical.ts');
const medicalTrace={...fakeRow(1,1).detail.doorFakeGrenade,kind:'heal',grenade:'',guard:false,holsterAccepted:false,medicalPreference:50,styleRoll:12,grenadeEligible:true,medicalEligible:'heal',
 medical:{kind:'heal',item:'med-kit',bodyPart:'LeftArm',resourceBefore:100,resourceAfter:100,consumptionObserved:false,consumptionEvidence:'not-observed',nativeStopRequested:true,cooldownRestored:true}};
const medicalRow=(id,time,v={},extra={})=>row(id,time,'evaluated','DoorFakeMedical',{feature:'D06',detail:{botInstance:'instance',doorFakeMedical:{...medicalTrace,...v}},...extra});
check('D06 visible native medical evidence in badge and hover without recoloring behavior',()=>{
 const r=ready([row(1,800,'selected','Search'),row(2,900,'accepted','Search'),medicalRow(3,1000)]),s=state(r,1100,'COMET:Search',900,false);
 assert.ok(s.active&&s.actionActive&&s.doorFakeMedical);assert.equal(s.event.id,2);
 const html=tooltip(s,r,1100,{known:'Known enemy'});for(const text of ['Medical feint - D06','Known enemy','medicine observed','native stop requested; readiness pending','Consumption: not observed','medical preference 50','cooldown restored'])assert.ok(html.includes(text),text);
 assert.doesNotMatch(html,/Fake grenade - D05|temporarily blocked/);
 for(const action of ['SAIN:Shoot','SAIN:Surgery','ORBIT:Travel']){const v=state(ready([medicalRow(1,1000)]),1100,action,999,false);assert.equal(v.decision,action);assert.equal(v.actionActive,false);assert.equal(getBehaviorCategory(v.decision).color,getBehaviorCategory(action).color);}
});
check('D06 complete only with actual draw, cancellation and ready weapon',()=>{
 const done={...medicalTrace,state:'completed',weaponReady:true};const parsed=medicalHelpers.parseCometDoorMedical(done);assert.ok(parsed);assert.equal(parsed.holsterAccepted,false);
 for(const k of ['drawRequested','handsObserved','holsterRequested','weaponReady'])assert.equal(medicalHelpers.parseCometDoorMedical({...done,[k]:false}),null);
 assert.equal(medicalHelpers.parseCometDoorMedical({...done,medical:{...done.medical,nativeStopRequested:false}}),null);
 assert.equal(medicalHelpers.parseCometDoorMedical({...done,medical:{...done.medical,medicalHandoff:true}}),null);
 assert.equal(medicalHelpers.parseCometDoorMedical({...done,medical:{...done.medical,resourceAfter:99,consumptionObserved:true,consumptionEvidence:'resource-decreased'}}),null);
 const cb=medicalHelpers.parseCometDoorMedical({...medicalTrace,medical:{...medicalTrace.medical,useCallbackCompleted:true,useCallbackSucceeded:true,consumptionObserved:true,consumptionEvidence:'native-use-succeeded'}});
 assert.equal(cb.medical.consumptionObserved,false);assert.ok(medicalHelpers.cometDoorMedicalSummary(cb).join(' ').includes('not proof of consumption'));
 const stim=medicalHelpers.parseCometDoorMedical({...medicalTrace,kind:'stim',medical:{kind:'stim',item:'stim',consumptionObserved:true,consumptionEvidence:'native-medical-item-consumed'}});assert.ok(stim.medical.consumptionObserved);
});
check('D06 shares one context with D05 and respects expiry, actors, Ghost and rewind',()=>{
 const r=ready([fakeRow(1,1000),medicalRow(2,1200)]);
 assert.ok(state(r,1100,'SAIN:Search',900,false).doorFakeGrenade);const v=state(r,1250,'SAIN:Search',900,false);assert.ok(v.doorFakeMedical);assert.equal(v.doorFakeGrenade,undefined);
 const reverse=state(ready([medicalRow(1,1000),fakeRow(2,1200)]),1250,'SAIN:Search',900,false);assert.ok(reverse.doorFakeGrenade);assert.equal(reverse.doorFakeMedical,undefined);
 for(const [time,ghost] of [[999,false],[2700,false],[1250,true]])assert.equal(state(r,time,'SAIN:Search',900,ghost).doorFakeMedical,undefined);
 for(const other of [row(3,1300,'released','Search',{cometSession:'new'}),row(3,1300,'released','Search',{detail:{botInstance:'new'}})])assert.equal(state(ready([medicalRow(2,1200),other]),1400,'SAIN:Search',999,false).doorFakeMedical,undefined);
 assert.equal(prepare([medicalRow(1,1000,{}, {stage:'accepted'})],'pmc-1').length,0);
});
check('D06 malformed data and tooltip injection rejected',()=>{
 for(const raw of [null,[],{},'fake',{...medicalTrace,kind:'surgery'},{...medicalTrace,medical:[]},{...medicalTrace,medical:{kind:'stim'}}])assert.equal(medicalHelpers.parseCometDoorMedical(raw),null);
 const t=medicalHelpers.parseCometDoorMedical({...medicalTrace,styleRoll:NaN,medical:{...medicalTrace.medical,resourceBefore:Infinity,resourceAfter:-1}});assert.equal(t.medical.resourceBefore,undefined);assert.equal(t.medical.resourceAfter,undefined);assert.equal(t.styleRoll,undefined);
 const r=ready([medicalRow(1,1000,{door:'<img src=x>',reason:'<script>',medical:{...medicalTrace.medical,item:'<svg>',bodyPart:'<img>',consumptionEvidence:'<img>'}})]);const html=tooltip(state(r,1100,'SAIN:Search',900,false),r,1100,{});assert.doesNotMatch(html,/<script>|<img|<svg/);assert.match(html,/&lt;img/);
});


const clearHelpers=load("../Private/src/helpers/cometDoorClear.ts");
const clearTrace={"state": "completed", "reason": "clear-entry-arrival-confirmed", "door": "door", "target": "enemy", "source": "heard", "personality": "Chad", "chance": 30, "roll": 0, "variantRoll": 0, "variant": "grenade", "contactAge": 1, "knownX": 0, "knownY": 0, "knownZ": 5, "x": 0, "y": 0, "z": 2, "coveredDestination": true, "doorOpenObserved": true, "feintAttempted": false, "feint": "none", "feintOutcome": "not-attempted", "throwRequested": true, "throwAccepted": true, "grenadeItem": "grenade", "projectile": 5, "projectileObserved": true, "explosionConfirmed": true, "grenadeOutcome": "explosion-confirmed", "dangerRadius": 8, "blastPause": 0.5, "fuseEstimate": 3.5, "movementRequested": true, "movementAccepted": true, "movementObserved": true, "thresholdCrossed": true, "arrived": true, "weaponReady": true, "elapsed": 6.099999999999994, "validFor": 1.5, "alternatives": ["Direct entry: eligible", "Grenade entry: eligible", "Resume native combat/search if the selected plan becomes invalid"]};
const clearRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','DoorRoomClear',{feature:'D07',detail:{doorRoomClear:{...clearTrace,...changes}},...extra});
check('D07 displays verified entry without changing native behavior colors',()=>{
 const r=ready([clearRow(1,1000)]),v=state(r,1100,'SAIN:Search',900,false);
 assert.ok(v.doorRoomClear);assert.equal(v.actionActive,false);assert.equal(v.doorRoomClear.arrived,true);
 assert.equal(getBehaviorCategory('SAIN:Search').key,'search');
 const html=tooltip(v,r,1100,{});assert.match(html,/Room entry - D07/);assert.match(html,/arrival confirmed/);assert.match(html,/confirmed for this projectile/);assert.match(html,/Grenade entry: eligible/);
});
check('D07 request, projectile, explosion and arrival remain separate',()=>{
 for(const phase of ['preparing','opening','planning','feint','ready','throw-ready','throwing','waiting-blast','post-blast','entry-ready','entering','completed','ended']){
  const r=ready([clearRow(1,1000,{state:phase})]);assert.equal(state(r,1100,'SAIN:Search',900,false).doorRoomClear.state,phase);
 }
 for(const missing of ['throwRequested','throwAccepted','projectileObserved','explosionConfirmed','movementRequested','movementAccepted','movementObserved','thresholdCrossed','weaponReady','arrived','doorOpenObserved'])assert.equal(clearHelpers.parseCometDoorClear({...clearTrace,[missing]:false}),null);
 assert.ok(clearHelpers.parseCometDoorClear({...clearTrace,projectile:-200}));
 assert.ok(clearHelpers.parseCometDoorClear({...clearTrace,variant:'direct',throwRequested:false,throwAccepted:false,projectileObserved:false,explosionConfirmed:false}));
 const t=clearHelpers.parseCometDoorClear({...clearTrace,state:'ended',reason:'clear-projectile-lost-without-explosion',grenadeOutcome:'unknown',explosionConfirmed:false,movementRequested:false,arrived:false});
 assert.equal(t.arrived,false);assert.equal(t.thresholdCrossed,false);assert.equal(t.explosionConfirmed,false);
 const lines=clearHelpers.cometDoorClearSummary(t).join(' ');assert.match(lines,/Explosion: not confirmed/);assert.doesNotMatch(lines,/arrival confirmed/);
});
check('D07 lease, actors, ghost state, session and rewind',()=>{
 const r=ready([clearRow(1,1000),clearRow(2,1300,{state:'ended',reason:'clear-contact-expired',arrived:false})]);
 assert.equal(state(r,1100,'SAIN:Search',900,false).doorRoomClear.state,'completed');
 assert.equal(state(r,1400,'SAIN:Search',900,false).doorRoomClear.state,'ended');
 assert.equal(state(r,1100,'SAIN:Search',900,false).doorRoomClear.state,'completed');
 for(const [time,ghost] of [[999,false],[2800,false],[1400,true]])assert.equal(state(r,time,'SAIN:Search',900,ghost).doorRoomClear,undefined);
 assert.equal(prepare([clearRow(1,1000)],'other-pmc').length,0);
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new'}}])assert.equal(state(ready([clearRow(1,1000),row(2,1200,'released','Search',extra)]),1300,'SAIN:Search',900,false).doorRoomClear,undefined);
});
check('D07 malformed diagnostics cannot fabricate success or inject markup',()=>{
 for(const raw of [null,[],{},'clear',{...clearTrace,state:'fake'},{...clearTrace,projectile:1.5},{...clearTrace,variant:'unknown'}])assert.equal(clearHelpers.parseCometDoorClear(raw),null);
 const t=clearHelpers.parseCometDoorClear({...clearTrace,knownX:NaN,contactAge:Infinity,dangerRadius:-1});assert.equal(t.knownX,undefined);assert.equal(t.contactAge,undefined);assert.equal(t.dangerRadius,undefined);
 const r=ready([clearRow(1,1000,{door:'<img>',reason:'<script>',alternatives:['<svg>'],target:'<iframe>'})]);
 const html=tooltip(state(r,1100,'SAIN:Search',900,false),r,1100,{});assert.doesNotMatch(html,/<img>|<script>|<svg>|<iframe>/);assert.match(html,/&lt;img&gt;/);
});
console.log(`${checks} COMET map checks passed (including D07)`);

const searchClearFixture=JSON.parse(fs.readFileSync(path.join(__dirname,'Fixtures/d08-door-search.json'),'utf8'));
const searchClearTrace=searchClearFixture.doorRoomClear;
const searchClearRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','DoorSearchClear',{feature:'D08',detail:{botInstance:'instance',doorRoomClear:{...searchClearTrace,...changes}},...extra});
check('D08 recorded fixture explains age, effective chance and known contact without recoloring actions',()=>{
 const r=ready([searchClearRow(1,1000)]),s=state(r,1100,'SAIN:Search',900,false);
 assert.ok(s.doorRoomClear);assert.equal(s.doorRoomClear.mode,'search');assert.equal(s.doorRoomClear.chance,35);
 const html=tooltip(s,r,1100,{enemy:'Known enemy'});
 for(const text of ['Room check while searching - D08','17.5 s old','Base 70.0%','35.0%','Memory limit 25.0 s','Known enemy','No real grenade','arrival confirmed'])assert.ok(html.includes(text),text);
 assert.doesNotMatch(html,/Room entry - D07|Explosion:|Fuse estimate/);
 for(const action of ['SAIN:Shoot','SAIN:Surgery','ORBIT:Travel']){
  const v=state(r,1100,action,999,false);assert.equal(v.decision,action);assert.equal(v.actionActive,false);assert.equal(getBehaviorCategory(v.decision).color,getBehaviorCategory(action).color);
 }
});
check('D08 and D07 replace the same context and respect leases, session, actor, ghost and rewind',()=>{
 const r=ready([clearRow(1,1000),searchClearRow(2,1200)]);
 assert.equal(state(r,1100,'SAIN:Search',900,false).doorRoomClear.mode,'recent');assert.equal(state(r,1300,'SAIN:Search',900,false).doorRoomClear.mode,'search');
 assert.equal(state(r,1100,'SAIN:Search',900,false).doorRoomClear.mode,'recent');
 const d=ready([searchClearRow(1,1000)]);
 for(const [time,ghost] of [[999,false],[2500,false],[1100,true]])assert.equal(state(d,time,'SAIN:Search',900,ghost).doorRoomClear,undefined);
 assert.equal(prepare([searchClearRow(1,1000)],'other-pmc').length,0);
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new'}}])assert.equal(state(ready([searchClearRow(1,1000),row(2,1200,'released','Search',extra)]),1300,'SAIN:Search',900,false).doorRoomClear,undefined);
 assert.equal(prepare([searchClearRow(1,1000,{}, {stage:'accepted'})],'pmc-1').length,0);
});
check('D08 rejects invented grenades, invalid age curves and missing arrival proof',()=>{
 for(const changes of [{mode:'unknown'},{baseChance:101},{baseChance:NaN},{ageFactor:Infinity},{ageFactor:.7},{selectionContactAge:10},{selectionContactAge:25},{contactLimit:26},{fadeUntil:9},{chance:70},{variant:'grenade'},{throwRequested:true},{throwAccepted:true},{projectileObserved:true},{explosionConfirmed:true},{state:'throw-ready'},{state:'waiting-blast'}])assert.equal(clearHelpers.parseCometDoorClear({...searchClearTrace,...changes}),null);
 for(const key of ['baseChance','ageFactor','selectionContactAge','contactLimit','fadeFrom','fadeUntil']){
  const t={...searchClearTrace};delete t[key];assert.equal(clearHelpers.parseCometDoorClear(t),null);
 }
 for(const key of ['movementRequested','movementAccepted','movementObserved','thresholdCrossed','weaponReady','arrived','doorOpenObserved'])assert.equal(clearHelpers.parseCometDoorClear({...searchClearTrace,[key]:false}),null);
 const request=clearHelpers.parseCometDoorClear({...searchClearTrace,state:'entering',movementObserved:false,arrived:false});assert.equal(request.thresholdCrossed,false);assert.equal(request.arrived,false);
 assert.match(clearHelpers.cometDoorClearSummary(request).join(' '),/accepted; movement not confirmed/);
});
check('D08 ended diagnostics preserve the reason and safely escape untrusted strings',()=>{
 const r=ready([searchClearRow(1,1000),searchClearRow(2,1200,{state:'ended',reason:'search-clear-new-evidence-native-review',arrived:false})]);
 const t=state(r,1300,'SAIN:Search',900,false);assert.equal(t.doorRoomClear.arrived,false);assert.match(tooltip(t,r,1300,{}),/new evidence native review/);
 const unsafe=ready([searchClearRow(1,1000,{door:'<img>',reason:'<script>',alternatives:['<svg>'],target:'<iframe>'})]);
 const html=tooltip(state(unsafe,1100,'SAIN:Search',900,false),unsafe,1100,{});assert.doesNotMatch(html,/<img>|<script>|<svg>|<iframe>/);assert.match(html,/&lt;img&gt;/);
});
console.log(`${checks} COMET map checks passed (including D08)`);

const ambushHelpers=load('../Private/src/helpers/cometDoorAmbush.ts');
const ambushTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'Fixtures/d09-door-ambush.json'),'utf8')).doorAmbush;
const ambushRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','DoorAmbush',{feature:'D09',detail:{botInstance:'instance',doorAmbush:{...ambushTrace,...changes}},...extra});
check('D09 map explains observed Hold without changing ownership or colors',()=>{
 const r=ready([ambushRow(1,1000)]),v=state(r,1100,'SAIN:Freeze',900,false);
 assert.equal(v.actionActive,false);assert.equal(v.active,true);assert.equal(v.doorAmbush.arrived,true);
 const html=tooltip(v,r,1100,{enemy:'Known contact'});
 for(const text of ['Doorway ambush - D09','arrival confirmed','eyes and muzzle verified','Known contact','not observed','Shared budget'])assert.ok(html.includes(text),text);
 assert.equal(v.doorAmbush.remaining,14.9);assert.equal(getBehaviorCategory(v.decision).color,getBehaviorCategory('SAIN:Freeze').color);
});
check('D09 context expires, terminates, rewinds and stays isolated',()=>{
 const r=ready([ambushRow(1,1000),ambushRow(2,1400,{state:'ended',reason:'ambush-native-priority',validFor:0})]);
 assert.equal(state(r,900,'SAIN:Freeze',800,false).doorAmbush,undefined);
 assert.ok(state(r,1300,'SAIN:Freeze',900,false).doorAmbush);
 assert.equal(state(r,1450,'SAIN:Freeze',900,false).doorAmbush,undefined);
 assert.ok(state(r,1100,'SAIN:Freeze',900,false).doorAmbush);
 assert.equal(state(r,1100,'SAIN:Freeze',900,true).doorAmbush,undefined);
 assert.equal(state(ready([ambushRow(1,1000)]),2500,'SAIN:Freeze',900,false).doorAmbush,undefined);
 const foreign=ready([ambushRow(1,1000),row(2,1100,'released','Hold',{cometSession:'new',detail:{botInstance:'other'}})]);
 assert.equal(state(foreign,1200,'SAIN:Freeze',900,false).doorAmbush,undefined);
});
check('D09 cannot invent an observed angle from missing evidence',()=>{
 for(const key of ['prepared','movementRequested','movementAccepted','arrived','eyesClear','muzzleClear','angleVerified'])assert.equal(ambushHelpers.parseCometDoorAmbush({...ambushTrace,[key]:false}),null);
 for(const bad of [null,[],{}, {state:'invented'}])assert.equal(ambushHelpers.parseCometDoorAmbush(bad),null);
 const p=ambushHelpers.parseCometDoorAmbush({...ambushTrace,state:'approaching',arrived:false,angleVerified:false,visualContact:false});
 assert.equal(p.arrived,false);assert.equal(p.angleVerified,false);assert.equal(p.visualContact,false);
 const ended=ambushHelpers.parseCometDoorAmbush({...ambushTrace,state:'ended',validFor:999});assert.equal(ended.validFor,0);
});
check('D09 strings are escaped and accepted ownership remains native Hold',()=>{
 const r=ready([ambushRow(1,1000,{door:'<img>',reason:'<script>',alternatives:['<svg>'],target:'<iframe>'})]);
 const html=tooltip(state(r,1100,'SAIN:Freeze',900,false),r,1100,{});assert.doesNotMatch(html,/<img>|<script>|<svg>|<iframe>/);assert.match(html,/&lt;img&gt;/);
 const fakeOwnership=ready([ambushRow(1,1000,{}, {stage:'accepted'})]);assert.equal(fakeOwnership.events.length,0);
});
console.log(`${checks} COMET map checks passed (including D09)`);

const holdHelpers=load('../Private/src/helpers/cometDoorHold.ts');
const holdFixture=JSON.parse(fs.readFileSync(path.join(__dirname,'Fixtures/d10-door-hold.json'),'utf8'));
const holdTrace=holdFixture.doorHold;
const holdRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','DoorHold',{feature:'D10',detail:{botInstance:'instance',doorHold:{...holdTrace,...changes}},...extra});
check('D10 shows retained position without inventing arrival or movement',()=>{
 const t=ambushHelpers.parseCometDoorAmbush(holdFixture.doorAmbush);assert.ok(t);assert.equal(t.retainedPosition,true);assert.equal(t.arrived,false);assert.equal(t.movementAccepted,false);
 assert.match(ambushHelpers.cometDoorAmbushSummary(t).join(' '),/current position retained \(no move\)/);
 for(const key of ['movementRequested','movementAccepted','movementObserved','arrived'])assert.equal(ambushHelpers.parseCometDoorAmbush({...holdFixture.doorAmbush,[key]:true}),null);
 for(const key of ['prepared','eyesClear','muzzleClear','angleVerified'])assert.equal(ambushHelpers.parseCometDoorAmbush({...holdFixture.doorAmbush,[key]:false}),null);
});
check('D10 diagnostic does not take ownership or change action colors',()=>{
 const r=ready([holdRow(1,1000)]),v=state(r,1100,'SAIN:Freeze',900,false);
 assert.equal(v.actionActive,false);assert.equal(v.active,true);assert.equal(v.doorHold.outcome,'stay');
 const html=tooltip(v,r,1100,{});
 for(const x of ['Hold positioning - D10','no move requested','Protection samples','estimated travel','minimum after moving 2.0'])assert.ok(html.includes(x),x);
 assert.equal(getBehaviorCategory(v.decision).color,getBehaviorCategory('SAIN:Freeze').color);
 assert.equal(ready([holdRow(1,1000,{}, {stage:'accepted'})]).events.length,0);
});
check('D10 expires and resets at participant lifetime boundaries',()=>{
 const r=ready([holdRow(1,1000),holdRow(2,1400,{outcome:'reconsider',validFor:0})]);
 assert.ok(state(r,1100,'SAIN:Freeze',900,false).doorHold);
 assert.equal(state(r,1450,'SAIN:Freeze',900,false).doorHold,undefined);
 assert.ok(state(r,1100,'SAIN:Freeze',900,false).doorHold);
 assert.equal(state(r,900,'SAIN:Freeze',800,false).doorHold,undefined);
 assert.equal(state(r,1100,'SAIN:Freeze',900,true).doorHold,undefined);
 assert.equal(state(ready([holdRow(1,1000)]),2500,'SAIN:Freeze',900,false).doorHold,undefined);
 const foreign=ready([holdRow(1,1000),row(2,1100,'released','Hold',{cometSession:'new',detail:{botInstance:'other'}})]);
 assert.equal(state(foreign,1200,'SAIN:Freeze',900,false).doorHold,undefined);
});
check('D10 explains movement estimates and native fallback separately',()=>{
 const moved=holdHelpers.parseCometDoorHold({...holdTrace,outcome:'move',currentAngle:false,pathLength:3,estimatedTravel:3,availableTime:5,usefulWait:2});
 assert.ok(moved);assert.match(holdHelpers.cometDoorHoldSummary(moved).join(' '),/arrival not confirmed/);
 for(const outcome of ['native-hold','reconsider']){
 const v=state(ready([holdRow(1,1000,{outcome})]),1100,'SAIN:Freeze',900,false);assert.equal(v.doorHold.outcome,outcome);assert.equal(v.actionActive,false);
 }
 for(const changes of [{candidateProtection:0},{estimatedTravel:4},{usefulWait:1},{currentProtection:2}])assert.equal(holdHelpers.parseCometDoorHold({...moved,...changes}),null);
});
check('D10 rejects malformed evidence and escapes strings',()=>{
 for(const bad of [null,[],{}, {...holdTrace,currentAngle:false}, {...holdTrace,estimatedTravel:1}, {...holdTrace,pathLength:NaN}, {...holdTrace,availableTime:Infinity}])assert.equal(holdHelpers.parseCometDoorHold(bad),null);
 const r=ready([holdRow(1,1000,{door:'<img>',reason:'<script>',alternatives:['<svg>']})]);
 const html=tooltip(state(r,1100,'SAIN:Freeze',900,false),r,1100,{});assert.doesNotMatch(html,/<img>|<script>|<svg>/);assert.match(html,/&lt;img&gt;/);
});
console.log(`${checks} COMET map checks passed (including D10)`);
const supportHelpers=load('../Private/src/helpers/cometDoorSupport.ts');
const supportTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'Fixtures/d11-door-support.json'),'utf8')).doorSupport;
const supportRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','DoorSupport',{feature:'D11',detail:{botInstance:'instance',doorSupport:{...supportTrace,...changes}},...extra});
check('D11 support context shows roles, leader and real acceptance while preserving native colors',()=>{
 const r=ready([supportRow(1,1000)]),v=state(r,1100,'SAIN:Freeze',900,false);
 assert.equal(v.actionActive,false);assert.ok(v.doorSupport);assert.equal(v.doorSupport.retained,true);assert.equal(v.doorSupport.arrived,false);
 const html=tooltip(v,r,1100,{});
 for(const text of ['Door support - D11','Door overwatch','Initiator: lead','Support: one','current position retained','Actual angle confirmed'])assert.ok(html.includes(text),text);
 assert.equal(getBehaviorCategory(v.decision).color,getBehaviorCategory('SAIN:Freeze').color);
 assert.equal(ready([supportRow(1,1000,{}, {stage:'accepted'})]).events.length,0);
});
check('D11 proposal and movement never claim an actual angle',()=>{
 const proposed={...supportTrace,state:'proposed',accepted:false,retained:false,eyesClear:false,muzzleClear:false,angleVerified:false};
 const p=supportHelpers.parseCometDoorSupport(proposed);assert.ok(p);assert.match(supportHelpers.cometDoorSupportSummary(p).join(' '),/not accepted/);
 const moved=supportHelpers.parseCometDoorSupport({...proposed,state:'moving',accepted:true,movementRequested:true,movementAccepted:true});assert.ok(moved);assert.equal(moved.angleVerified,false);
 for(const changes of [{angleVerified:true},{arrived:true},{retained:true},{movementAccepted:true}])assert.equal(supportHelpers.parseCometDoorSupport({...proposed,...changes}),null);
});
check('D11 context expires, stops, rewinds and never crosses instance or ghost boundary',()=>{
 const r=ready([supportRow(1,1000),supportRow(2,1400,{state:'released',reason:'support-leader-ended',angleVerified:false,remaining:0})]);
 assert.ok(state(r,1100,'SAIN:Freeze',900,false).doorSupport.angleVerified);
 assert.equal(state(r,1450,'SAIN:Freeze',900,false).doorSupport.angleVerified,false);
 assert.equal(state(r,1450,'SAIN:Freeze',900,false).doorSupport.state,'released');
 assert.ok(state(r,1100,'SAIN:Freeze',900,false).doorSupport.angleVerified);
 assert.equal(state(r,900,'SAIN:Freeze',800,false).doorSupport,undefined);
 assert.equal(state(r,1100,'SAIN:Freeze',900,true).doorSupport,undefined);
 assert.equal(state(ready([supportRow(1,1000)]),2500,'SAIN:Freeze',900,false).doorSupport,undefined);
 const foreign=ready([supportRow(1,1000),row(2,1100,'released','Hold',{cometSession:'new',detail:{botInstance:'other'}})]);
 assert.equal(state(foreign,1200,'SAIN:Freeze',900,false).doorSupport,undefined);
});
check('D11 malformed facts rejected and user strings escaped',()=>{
 for(const bad of [null,[],{}, {...supportTrace,x:NaN}, {...supportTrace,remaining:Infinity}, {...supportTrace,leader:'one'}, {...supportTrace,eyesClear:false}, {...supportTrace,movementRequested:true}])assert.equal(supportHelpers.parseCometDoorSupport(bad),null);
 const r=ready([supportRow(1,1000,{leaderName:'<script>',door:'<img>',reason:'<iframe>',alternatives:['<svg>']})]);
 const html=tooltip(state(r,1100,'SAIN:Freeze',900,false),r,1100,{});assert.doesNotMatch(html,/<script>|<img>|<iframe>|<svg>/);assert.match(html,/&lt;script&gt;/);
});
check('D11 rear guard and refusals remain distinct from accepted overwatch',()=>{
 const t=supportHelpers.parseCometDoorSupport({...supportTrace,role:'rear-guard',state:'rejected',accepted:false,retained:false,angleVerified:false,eyesClear:false,muzzleClear:false,reason:'support-no-rear-access-angle'});
 assert.ok(t);assert.match(supportHelpers.cometDoorSupportSummary(t).join(' '),/Rear watch: rejected/);
 const accepted=ready([row(1,900,'selected','Hold',{feature:'D11'}),row(2,950,'accepted','Hold',{feature:'D11'}),supportRow(3,1000)]);
 assert.equal(state(accepted,1100,'COMET:Hold',950,false).actionActive,true);
});
console.log(`${checks} COMET map checks passed (including D11)`);

const interruptionHelpers=load('../Private/src/helpers/cometDoorInterruption.ts');
const interruptionTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'Fixtures/d12-door-interruption.json'),'utf8')).doorInterruption;
const interruptionRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','DoorInterruption',{feature:'D12',detail:{botInstance:'instance',doorInterruption:{...interruptionTrace,...changes}},...extra});
check('D12 resume evidence is independent of native combat colors and ownership',()=>{
 const v=state(ready([interruptionRow(1,1000)]),1100,'SAIN:StandAndShoot',900,false);
 assert.ok(v.doorInterruption);assert.equal(v.actionActive,false);assert.equal(v.doorInterruption.resumes,1);
 const html=tooltip(v,undefined,1100,{});
 for(const text of ['Door interruption - D12','D09 / holding: resumed','incoming fire','unlocated-impact','Resume observed','Original time left','Feint consumed: yes'])assert.ok(html.includes(text),text);
});
check('D12 pending resume cannot impersonate execution',()=>{
 const pending={...interruptionTrace,state:'waiting',resumes:0,nativeAccepted:false,executionObserved:false};
 const p=interruptionHelpers.parseCometDoorInterruption(pending);assert.ok(p);
 assert.match(interruptionHelpers.cometDoorInterruptionSummary(p).join(' '),/Resume not executed/);
 for(const bad of [{...pending,executionObserved:true},{...pending,nativeAccepted:true},{...pending,state:'resumed'}])assert.equal(interruptionHelpers.parseCometDoorInterruption(bad),null);
 const rows=ready([interruptionRow(1,1000,{}, {stage:'accepted'})]);assert.equal(state(rows,1100,'SAIN:Search',900,false).actionActive,false);
});
check('D12 context expires, stops, rewinds and stays inside instance and ghost boundaries',()=>{
 const r=ready([interruptionRow(1,1000),interruptionRow(2,1400,{state:'abandoned',reason:'original-budget-expired',remaining:0})]);
 assert.equal(state(r,1100,'SAIN:Search',900,false).doorInterruption.state,'resumed');
 assert.equal(state(r,1450,'SAIN:Search',900,false).doorInterruption.state,'abandoned');
 assert.equal(state(r,1100,'SAIN:Search',900,false).doorInterruption.state,'resumed');
 assert.equal(state(r,900,'SAIN:Search',800,false).doorInterruption,undefined);
 assert.equal(state(r,1100,'SAIN:Search',900,true).doorInterruption,undefined);
 assert.equal(state(ready([interruptionRow(1,1000)]),2500,'SAIN:Search',900,false).doorInterruption,undefined);
 const foreign=ready([interruptionRow(1,1000),row(2,1100,'released','Search',{detail:{botInstance:'other'}})]);
 assert.equal(state(foreign,1200,'SAIN:Search',900,false).doorInterruption,undefined);
});
check('D12 malformed evidence rejected and strings escaped',()=>{
 for(const bad of [null,[],{}, {...interruptionTrace,remaining:NaN},{...interruptionTrace,quietRemaining:-1},{...interruptionTrace,resumes:2},{...interruptionTrace,resumes:.5},{...interruptionTrace,executionObserved:'yes'}])assert.equal(interruptionHelpers.parseCometDoorInterruption(bad),null);
 const v=state(ready([interruptionRow(1,1000,{threat:'<img src=x onerror=alert(1)>',gates:['<script>evil</script>']})]),1100,'SAIN:Search',900,false);
 const html=tooltip(v,undefined,1100,{});assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;img'));
});
console.log(`${checks} COMET map checks passed (including D12)`);

const emergencyHelpers=load('../Private/src/helpers/cometDoorEmergency.ts');
const emergencyTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'Fixtures/d13-door-emergency.json'),'utf8')).doorEmergency;
const emergencyRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','DoorEmergency',{feature:'D13',detail:{botInstance:'instance',doorEmergency:{...emergencyTrace,...changes}},...extra});
check('D13 visible emergency context preserves action and movement evidence without claiming native ownership',()=>{
 const v=state(ready([emergencyRow(1,1000)]),1100,'SAIN:Retreat',900,false);
 assert.ok(v.doorEmergency);assert.equal(v.actionActive,false);assert.equal(v.doorEmergency.movementObserved,true);assert.equal(v.doorEmergency.arrived,false);
 const html=tooltip(v,undefined,1100,{});
 for(const text of ['Door emergency - D13','D05 / drawing','personal-vision','Action observed','Retreat movement observed','Local cover 1: route-obstacle','Cancelled preparation will not resume'])assert.ok(html.includes(text),text);
});
check('D13 heard warning never implies a visible exit or retreat',()=>{
 const warning={...emergencyTrace,state:'recovering',confirmed:false,evidence:'personal-sound:Sprint',choice:'recover-only',nativeAccepted:false,actionObserved:false,moveAccepted:false,movementObserved:false,arrived:false};
 const t=emergencyHelpers.parseCometDoorEmergency(warning);assert.ok(t);
 const text=emergencyHelpers.cometDoorEmergencySummary(t).join(' ');assert.match(text,/Warning only, exit unconfirmed/);assert.match(text,/Retreat not executed/);
 assert.equal(emergencyHelpers.parseCometDoorEmergency({...warning,choice:'retreat'}),null);
});
check('D13 native acceptance is separate from actual motion and arrival',()=>{
 const t={...emergencyTrace,actionObserved:false,moveAccepted:false,movementObserved:false,arrived:false};
 assert.match(emergencyHelpers.cometDoorEmergencySummary(emergencyHelpers.parseCometDoorEmergency(t)).join(' '),/accepted, execution unconfirmed/);
 for(const bad of [{...t,nativeAccepted:false,actionObserved:true},{...t,moveAccepted:true,movementObserved:true},{...t,arrived:true}])assert.equal(emergencyHelpers.parseCometDoorEmergency(bad),null);
 const owner=ready([row(1,900,'selected','FallBack',{feature:'D13'}),row(2,950,'accepted','FallBack',{feature:'D13'}),emergencyRow(3,1000)]);
 assert.equal(state(owner,1100,'COMET:FallBack',950,false).actionActive,true);
 const pretend=ready([emergencyRow(1,1000,{}, {stage:'accepted'})]);assert.equal(state(pretend,1100,'SAIN:Retreat',900,false).actionActive,false);
});
check('D13 ends, expires, rewinds, and never crosses instance or ghost boundaries',()=>{
 const r=ready([emergencyRow(1,1000),emergencyRow(2,1400,{state:'ended',reason:'weapon-ready-native-combat',remaining:0,weaponReady:true})]);
 assert.equal(state(r,1100,'SAIN:Retreat',900,false).doorEmergency.state,'observed');
 assert.equal(state(r,1450,'SAIN:StandAndShoot',1400,false).doorEmergency.state,'ended');
 assert.equal(state(r,1100,'SAIN:Retreat',900,false).doorEmergency.state,'observed');
 assert.equal(state(r,900,'SAIN:Search',800,false).doorEmergency,undefined);
 assert.equal(state(r,1100,'SAIN:Retreat',900,true).doorEmergency,undefined);
 assert.equal(state(ready([emergencyRow(1,1000)]),2500,'SAIN:Retreat',900,false).doorEmergency,undefined);
 const foreign=ready([emergencyRow(1,1000),row(2,1100,'released','Search',{detail:{botInstance:'other'}})]);
 assert.equal(state(foreign,1200,'SAIN:Search',900,false).doorEmergency,undefined);
});
check('D13 validates telemetry and escapes all untrusted text',()=>{
 for(const bad of [null,[],{}, {...emergencyTrace,remaining:NaN},{...emergencyTrace,evidenceAge:-1},{...emergencyTrace,choice:'fly'},{...emergencyTrace,x:Infinity},{...emergencyTrace,arrived:'yes'}])assert.equal(emergencyHelpers.parseCometDoorEmergency(bad),null);
 const v=state(ready([emergencyRow(1,1000,{target:'<img src=x onerror=alert(1)>',alternatives:['<script>evil</script>']})]),1100,'SAIN:Retreat',900,false);
 const html=tooltip(v,undefined,1100,{});assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;img'));
});
console.log(`${checks} COMET map checks passed (including D13)`);

const reservationHelpers=load('../Private/src/helpers/cometDoorReservation.ts');
const reservationTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'Fixtures/d14-door-reservation.json'),'utf8')).doorReservation;
const reservationRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','DoorReservation',{feature:'D14',detail:{botInstance:'instance',doorReservation:{...reservationTrace,...changes}},...extra});
check('D14 reservation context never takes over native behavior color or ownership',()=>{
 const r=ready([reservationRow(1,1000)]);const v=state(r,1100,'SAIN:Search',900,false);
 assert.ok(v.doorReservation);assert.equal(v.actionActive,false);assert.equal(v.doorReservation.token,42);
 const html=tooltip(v,r,1100,{});
 for(const text of ['Door reservation - D14','Owner: test-pmc','entry:planning','Maneuver callback observed','Original budget: 6.9 s'])assert.ok(html.includes(text),text);
 const owned=ready([row(1,900,'selected','Search'),row(2,950,'accepted','Search'),reservationRow(3,1000)]);
 assert.equal(state(owned,1100,'COMET:Search',950,false).actionActive,true);
 const pretend=ready([reservationRow(1,1000,{}, {stage:'accepted'})]);assert.equal(state(pretend,1100,'SAIN:Search',900,false).actionActive,false);
});
check('D14 acquisition and refusal never imply execution',()=>{
 const acquired=reservationHelpers.parseCometDoorReservation({...reservationTrace,state:'acquired',actionObserved:false});
 assert.ok(acquired);assert.match(reservationHelpers.cometDoorReservationSummary(acquired).join(' '),/execution not yet observed/);
 const busy=reservationHelpers.parseCometDoorReservation({...reservationTrace,state:'refused',reason:'reservation-door-busy',actionObserved:false,retryRemaining:2,alternatives:['D11 support if eligible','another available door']});
 assert.ok(busy);assert.match(reservationHelpers.cometDoorReservationSummary(busy).join(' '),/Busy door retry: 2.0 s/);
 for(const state of ['acquired','refused','released','expired'])assert.equal(reservationHelpers.parseCometDoorReservation({...reservationTrace,state,actionObserved:true}),null);
});
check('D14 expiry, release, rewind, ghost and instance separation',()=>{
 const r=ready([reservationRow(1,1000),reservationRow(2,1400,{state:'released',reason:'door-threat-interruption',remaining:0,actionObserved:false})]);
 assert.equal(state(r,1100,'SAIN:Search',900,false).doorReservation.state,'active');
 assert.equal(state(r,1450,'SAIN:Search',1400,false).doorReservation.state,'released');
 assert.equal(state(r,1100,'SAIN:Search',900,false).doorReservation.state,'active');
 assert.equal(state(r,900,'SAIN:Search',800,false).doorReservation,undefined);
 assert.equal(state(r,1100,'SAIN:Search',900,true).doorReservation,undefined);
 assert.equal(state(ready([reservationRow(1,1000)]),2500,'SAIN:Search',900,false).doorReservation,undefined);
 const foreign=ready([reservationRow(1,1000),row(2,1100,'released','Search',{detail:{botInstance:'other'}})]);
 assert.equal(state(foreign,1200,'SAIN:Search',900,false).doorReservation,undefined);
});
check('D14 malformed telemetry and unsafe text',()=>{
 for(const bad of [null,[],{}, {...reservationTrace,remaining:NaN},{...reservationTrace,retryRemaining:-1},{...reservationTrace,token:0},{...reservationTrace,token:1.2},{...reservationTrace,state:'released'},{...reservationTrace,owner:''},{...reservationTrace,actionObserved:'yes'}])assert.equal(reservationHelpers.parseCometDoorReservation(bad),null);
 const r=ready([reservationRow(1,1000,{owner:'<img src=x>',phase:'<script>',alternatives:['<svg>']})]);
 const html=tooltip(state(r,1100,'SAIN:Search',900,false),r,1100,{});assert.doesNotMatch(html,/<img|<script|<svg/);assert.match(html,/&lt;img/);
});
console.log(`${checks} COMET map checks passed (including D14)`);

const entryHelpers=load('../Private/src/helpers/cometDoorEntry.ts');
const entryTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'Fixtures/d15-door-entry.json'),'utf8')).doorEntry;
const entryRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','DoorEntry',{feature:'D15',detail:{botInstance:'instance',doorEntry:{...entryTrace,...changes}},...extra});
check('D15 observed breach is context, not a claim of crossing or behavior ownership',()=>{
 const r=ready([entryRow(1,1000)]),v=state(r,1100,'SAIN:Search',900,false);
 assert.ok(v.doorEntry);assert.equal(v.actionActive,false);assert.equal(v.doorEntry.crossed,false);
 const html=tooltip(v,r,1100,{});
 for(const text of ['Native door entry - D15','This bot breached','crossing not yet confirmed','Native animation: finished','prepared','known'])assert.ok(html.includes(text),text);
 assert.equal(state(ready([entryRow(1,1000,{}, {stage:'accepted'})]),1100,'SAIN:Search',900,false).actionActive,false);
});
check('D15 expiry, rewind, Ghost and different bot instances',()=>{
 const r=ready([entryRow(1,1000),entryRow(2,1300,{state:'ended',reason:'entry-native-priority',validFor:0})]);
 assert.ok(state(r,1100,'SAIN:Search',900,false).doorEntry);
 assert.equal(state(r,1350,'SAIN:Search',1300,false).doorEntry,undefined);
 assert.ok(state(r,1100,'SAIN:Search',900,false).doorEntry);
 assert.equal(state(r,900,'SAIN:Search',800,false).doorEntry,undefined);
 assert.equal(state(r,1100,'SAIN:Search',900,true).doorEntry,undefined);
 assert.equal(state(ready([entryRow(1,1000)]),2500,'SAIN:Search',900,false).doorEntry,undefined);
 const other=ready([entryRow(1,1000),row(2,1100,'released','Search',{detail:{botInstance:'other'}})]);
 assert.equal(state(other,1200,'SAIN:Search',900,false).doorEntry,undefined);
});
check('D15 malformed data, false success and HTML are handled safely',()=>{
 for(const bad of [null,[],{}, {...entryTrace,remaining:NaN},{...entryTrace,chance:101},{...entryTrace,stamina:-1},{...entryTrace,requested:false},{...entryTrace,state:'completed'},{...entryTrace,arrived:true},{...entryTrace,context:'patrol'},{...entryTrace,animationFinished:false}])assert.equal(entryHelpers.parseCometDoorEntry(bad),null);
 const r=ready([entryRow(1,1000,{network:'<script>',target:'<img>',alternatives:['<svg>']})]);
 const html=tooltip(state(r,1100,'SAIN:Search',900,false),r,1100,{});assert.doesNotMatch(html,/<script|<img|<svg/);assert.match(html,/&lt;script/);
 const otherOpen=entryHelpers.parseCometDoorEntry({...entryTrace,state:'ended',requested:false,breachObserved:false,doorOpenObserved:true,animationFinished:false,reason:'entry-door-opened-by-other'});
 assert.ok(otherOpen);assert.match(entryHelpers.cometDoorEntrySummary(otherOpen).join(' '),/No native kick requested/);
});
console.log(`${checks} COMET map checks passed (including D15)`);

const movementHelpers=load('../Private/src/helpers/cometCombatStep.ts');
const movementTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/m01-combat-step.json'),'utf8')).combatStep;
const movementRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','CombatStep',{feature:'M01',detail:{botInstance:'instance',combatStep:{...movementTrace,...changes}},...extra});
check('M01 movement is context over the actual combat behavior',()=>{
 const r=ready([movementRow(1,1000)]),v=state(r,1100,'SAIN:StandAndShoot',1000,false);
 assert.ok(v.combatStep);assert.equal(v.actionActive,false);assert.equal(v.decision,'SAIN:StandAndShoot');
 assert.equal(getBehaviorCategory('SAIN:StandAndShoot').key,'combat');
 const html=tooltip(v,x=>String(x).replace(/</g,'&lt;'));
 for(const text of ['Move while shooting - M01','0.18 m','Movement observed','personal-vision','known','right','Normal'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('hits confirmed'));
});
check('M01 no future events, stale badges, Ghost movement or replaced behavior',()=>{
 const r=ready([movementRow(1,1000),movementRow(2,1200,{state:'ended',reason:'movement-native-priority',validFor:0,remaining:0,stepRemaining:0})]);
 assert.ok(state(r,1100,'SAIN:DogFight',1000,false).combatStep);
 assert.equal(state(r,1250,'SAIN:DogFight',1000,false).combatStep,undefined);
 assert.ok(state(r,1100,'SAIN:DogFight',1000,false).combatStep);
 assert.equal(state(r,900,'SAIN:DogFight',800,false).combatStep,undefined);
 assert.equal(state(r,1100,'SAIN:DogFight',1000,true).combatStep,undefined);
 assert.equal(state(ready([movementRow(1,1000)]),1401,'SAIN:DogFight',1000,false).combatStep,undefined);
 assert.equal(state(r,1100,'SAIN:Retreat',1000,false).combatStep,undefined);
 assert.equal(state(r,1100,'SAIN:Search',1000,false).combatStep,undefined);
 const other=ready([movementRow(1,1000),row(2,1050,'selected','Hold',{detail:{botInstance:'other'}})]);
 assert.equal(state(other,1100,'SAIN:DogFight',1000,false).combatStep,undefined);
});
check('M01 malformed diagnostics cannot invent movement or inject markup',()=>{
 for(const bad of [null,[],{}, {...movementTrace,validFor:10},{...movementTrace,actualDistance:NaN},{...movementTrace,requests:0},
 {...movementTrace,requested:false},{...movementTrace,chance:101},{...movementTrace,actualDistance:0},
 {...movementTrace,source:'secret-transform'},{...movementTrace,state:'ended'},{...movementTrace,action:'Search'}])assert.equal(movementHelpers.parseCometCombatStep(bad),null);
 const pending={...movementTrace,movementObserved:false,actualDistance:0};
 assert.match(movementHelpers.cometCombatStepSummary(movementHelpers.parseCometCombatStep(pending)).join(' '),/motion not yet confirmed/);
 const injected=state(ready([movementRow(1,1000,{reason:'<script>',alternatives:['<img>']})]),1100,'SAIN:DogFight',1000,false);
 const html=tooltip(injected,x=>String(x).replace(/</g,'&lt;'));assert.ok(!html.includes('<script>')&&!html.includes('<img>'));
 assert.equal(prepare([movementRow(1,1000,{}, {stage:'accepted'})],'pmc-1').length,0);
});
console.log(`${checks} COMET map checks passed (including M01)`);

const pauseHelpers=load('../Private/src/helpers/cometFirePause.ts');
const pauseTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/m02-fire-pause.json'),'utf8')).firePause;
const pauseRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','FirePause',{feature:'M02',detail:{botInstance:'instance',firePause:{...pauseTrace,...changes}},...extra});
check('M02 pause context retains native combat color and shooting observations',()=>{
 const r=ready([movementRow(1,990),pauseRow(2,1000)]),v=state(r,1050,'SAIN:StandAndShoot',1000,false);
 assert.ok(v.firePause&&v.combatStep);assert.equal(v.actionActive,false);assert.equal(v.decision,'SAIN:StandAndShoot');
 assert.equal(getBehaviorCategory(v.decision).key,'combat');
 const html=tooltip(v,x=>String(x).replace(/</g,'&lt;'));
 for(const text of ['Pause to fire - M02','Stop observed','Observed shots: 1','While stationary: 1','No accuracy claim','personal-vision'])assert.ok(html.includes(text),text);
});
check('M02 expiry, interruptions, seeks, ghost and instance isolation',()=>{
 const r=ready([pauseRow(1,1000),pauseRow(2,1070,{state:'ended',validFor:0,remaining:0,reason:'pause-recent-hit'})]);
 assert.ok(state(r,1050,'SAIN:DogFight',1000,false).firePause);
 assert.equal(state(r,1080,'SAIN:DogFight',1000,false).firePause,undefined);
 assert.ok(state(r,1050,'SAIN:DogFight',1000,false).firePause);
 for(const time of [900,1101])assert.equal(state(ready([pauseRow(1,1000)]),time,'SAIN:DogFight',800,false).firePause,undefined);
 assert.equal(state(r,1050,'SAIN:DogFight',1000,true).firePause,undefined);
 for(const action of ['SAIN:Search','SAIN:Retreat','SAIN:Reload','SAIN:ThrowGrenade'])assert.equal(state(r,1050,action,1000,false).firePause,undefined);
 const other=ready([pauseRow(1,1000),row(2,1020,'selected','Hold',{detail:{botInstance:'other'}})]);
 assert.equal(state(other,1050,'SAIN:DogFight',1000,false).firePause,undefined);
 const session=ready([pauseRow(1,1000),row(2,1020,'selected','Hold',{cometSession:'other',detail:{botInstance:'instance'}})]);
 assert.equal(state(session,1050,'SAIN:DogFight',1000,false).firePause,undefined);
});
check('M02 strict evidence parsing and escaped hover',()=>{
 for(const bad of [null,[],{}, {...pauseTrace,speed:NaN},{...pauseTrace,speed:.5},{...pauseTrace,stopObserved:false},
 {...pauseTrace,stopRequested:false},{...pauseTrace,stationaryShots:2},{...pauseTrace,selected:false},{...pauseTrace,roll:100},
 {...pauseTrace,shots:-1},{...pauseTrace,shots:1.5},{...pauseTrace,validFor:.11},{...pauseTrace,state:'ended'},
 {...pauseTrace,source:'hidden-transform'},{...pauseTrace,action:'Search'},{...pauseTrace,knownX:Infinity}])assert.equal(pauseHelpers.parseCometFirePause(bad),null);
 const pending={...pauseTrace,state:'braking',stopObserved:false,shots:0,stationaryShots:0,speed:.8};
 assert.match(pauseHelpers.cometFirePauseSummary(pauseHelpers.parseCometFirePause(pending)).join(' '),/not yet confirmed/);
 const html=tooltip(state(ready([pauseRow(1,1000,{reason:'<script>',alternatives:['<img>']})]),1050,'SAIN:DogFight',1000,false),x=>String(x).replace(/</g,'&lt;'));
 assert.ok(!html.includes('<script>')&&!html.includes('<img>'));
 assert.equal(prepare([pauseRow(1,1000,{}, {stage:'accepted'})],'pmc-1').length,0);
});
console.log(`${checks} COMET map checks passed (including M02)`);

const cornerHelpers=load('../Private/src/helpers/cometCornerPeek.ts');
const cornerTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/m03-corner-peek.json'),'utf8')).cornerPeek;
const cornerRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','CornerPeek',{feature:'M03',detail:{botInstance:'instance',cornerPeek:{...cornerTrace,...changes}},...extra});
check('M03 cover motion context preserves combat color',()=>{
 const r=ready([cornerRow(1,1000)]),v=state(r,1050,'SAIN:StandAndShoot',1000,false);
 assert.ok(v.cornerPeek);assert.equal(v.actionActive,false);assert.equal(v.decision,'SAIN:StandAndShoot');
 assert.equal(getBehaviorCategory(v.decision).key,'combat');
 const html=tooltip(v);for(const text of ['Corner peeks - M03','Cover observed: yes','Observed shots: 1','Completed outward peeks: 1','personal-vision'])assert.ok(html.includes(text),text);
});
check('M03 expiry, interruption, seeking and ghost scope',()=>{
 const r=ready([cornerRow(1,1000),cornerRow(2,1080,{state:'ended',reason:'corner-native-priority',validFor:0,remaining:0,phaseRemaining:0})]);
 assert.ok(state(r,1050,'SAIN:DogFight',1000,false).cornerPeek);
 assert.equal(state(r,1080,'SAIN:DogFight',1000,false).cornerPeek,undefined);
 assert.ok(state(r,1050,'SAIN:DogFight',1000,false).cornerPeek);
 for(const t of [999,1200,1500])assert.equal(state(ready([cornerRow(1,1000)]),t,'SAIN:StandAndShoot',900,false).cornerPeek,undefined);
 assert.equal(state(r,1050,'SAIN:StandAndShoot',1000,true).cornerPeek,undefined);
 for(const action of ['SAIN:Search','SAIN:Retreat','SAIN:Reload','SAIN:ThrowGrenade'])assert.equal(state(r,1050,action,1000,false).cornerPeek,undefined);
 const other=ready([cornerRow(1,1000),row(2,1030,'evaluated','Impact',{feature:'P07',detail:{botInstance:'other'}})]);
 // Use a valid context event to establish a different actor instance/session.
 for(const extra of [{detail:{botInstance:'other',firePause:pauseTrace},feature:'M02',decision:'FirePause'},{cometSession:'other-session',detail:{botInstance:'instance',firePause:pauseTrace},feature:'M02',decision:'FirePause'}]){
  const record=ready([cornerRow(1,1000),row(2,1030,'evaluated','FirePause',extra)]);
  assert.equal(state(record,1050,'SAIN:StandAndShoot',1000,false).cornerPeek,undefined);
 }
});
check('M03 strict finite evidence, phase consistency and escaping',()=>{
 for(const bad of [[],null,{...cornerTrace,validFor:.21},{...cornerTrace,jumps:2},{...cornerTrace,peeks:3},{...cornerTrace,knownX:Infinity},
 {...cornerTrace,source:'hidden-transform'},{...cornerTrace,shots:-1},{...cornerTrace,landedObserved:true,airborneObserved:false},
 {...cornerTrace,state:'ended',validFor:.1},{...cornerTrace,selected:false},{...cornerTrace,arrived:true,requested:false},
 {...cornerTrace,exposedShots:2,shots:1}])assert.equal(cornerHelpers.parseCometCornerPeek(bad),null);
 const record=ready([cornerRow(1,1000,{reason:'<img onerror=alert(1)>',alternatives:['<script>alert(1)</script>']})]);
 const html=tooltip(state(record,1050,'SAIN:StandAndShoot',1000,false));assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
 const fallback=cornerHelpers.parseCometCornerPeek({...cornerTrace,requestedStyle:'jump',style:'step',alternatives:['jump: unsafe ceiling; using lateral step']});
 assert.ok(cornerHelpers.cometCornerPeekSummary(fallback).join(' ').includes('unsafe ceiling'));
});
console.log(`${checks} COMET map checks passed (including M03)`);

const leanHelpers=load('../Private/src/helpers/cometCombatLean.ts');
const leanTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/m04-combat-lean.json'),'utf8')).combatLean;
const leanRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','CombatLean',{feature:'M04',detail:{botInstance:'instance',combatLean:{...leanTrace,...changes}},...extra});
check('M04 native colors with an independent head evasion badge and evidence',()=>{
 const r=ready([leanRow(1,1000)]),v=state(r,1050,'SAIN:StandAndShoot',1000,false);
 assert.ok(v.combatLean);assert.equal(v.actionActive,false);assert.equal(v.decision,'SAIN:StandAndShoot');
 assert.equal(getBehaviorCategory(v.decision),getBehaviorCategory('SAIN:StandAndShoot'));
 const html=tooltip(v);for(const text of ['Head movement - M04','Head evasion','Left lean','Lean input requests: 1','Head movement observed: yes','10.0 cm','personal-vision'])assert.ok(html.includes(text),text);
});
check('M04 expiry, interruption, seeking and Ghost exclusion',()=>{
 const r=ready([leanRow(1,1000),leanRow(2,1080,{state:'ended',reason:'lean-preserve-corner-peek',validFor:0,remaining:0,phaseRemaining:0})]);
 assert.ok(state(r,1050,'SAIN:DogFight',1000,false).combatLean);
 assert.equal(state(r,1080,'SAIN:DogFight',1000,false).combatLean,undefined);
 assert.ok(state(r,1050,'SAIN:DogFight',1000,false).combatLean);
 for(const at of [999,1200,2000])assert.equal(state(ready([leanRow(1,1000)]),at,'SAIN:StandAndShoot',900,false).combatLean,undefined);
 assert.equal(state(r,1050,'SAIN:StandAndShoot',1000,true).combatLean,undefined);
 for(const action of ['SAIN:Search','SAIN:Retreat','SAIN:Reload','SAIN:ThrowGrenade'])assert.equal(state(r,1050,action,1000,false).combatLean,undefined);
});
check('M04 context isolated by bot instance and session',()=>{
 for(const extra of [{detail:{botInstance:'other',cornerPeek:cornerTrace},feature:'M03',decision:'CornerPeek'},
 {cometSession:'other-session',detail:{botInstance:'instance',cornerPeek:cornerTrace},feature:'M03',decision:'CornerPeek'}]){
  const r=ready([leanRow(1,1000),cornerRow(2,1040,{},extra)]);
  assert.equal(state(r,1050,'SAIN:StandAndShoot',1000,false).combatLean,undefined);
 }
});
check('M04 native firing pause retains side and displays why',()=>{
 const r=ready([leanRow(1,1000,{firePause:true,reason:'lean-hold-during-fire-pause'})]);
 assert.ok(tooltip(state(r,1050,'SAIN:StandAndShoot',1000,false)).includes('Holding side during M02 firing pause'));
 const unobserved={...leanTrace,headMotionObserved:false,tiltObserved:false,headTravel:0,smoothedTilt:0};
 assert.ok(leanHelpers.cometCombatLeanSummary(leanHelpers.parseCometCombatLean(unobserved)).join(' ').includes('Head movement observed: no'));
});
check('M04 strict parser refuses fabricated or inconsistent motion and burst evidence',()=>{
 for(const bad of [null,[],{...leanTrace,headTravel:NaN},{...leanTrace,smoothedTilt:Infinity},{...leanTrace,headTravel:-1},
 {...leanTrace,side:2},{...leanTrace,roll:100},{...leanTrace,burstChanges:4},{...leanTrace,burstLimit:4},
 {...leanTrace,burstChanges:1,burstAttempted:false},{...leanTrace,requested:false},{...leanTrace,headTravel:0},
 {...leanTrace,state:'burst',firePause:true},{...leanTrace,state:'ended'},{...leanTrace,source:'shared'},
 {...leanTrace,validFor:.21},{...leanTrace,phaseRemaining:10},{...leanTrace,action:'Search'}])assert.equal(leanHelpers.parseCometCombatLean(bad),null);
 const raw=leanRow(1,1000,{target:'<img src=x>',reason:'<svg/onload=x>',alternatives:['<script>bad</script>']});
 const html=tooltip(state(ready([raw]),1050,'SAIN:StandAndShoot',1000,false));
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;script&gt;'));
 assert.equal(ready([leanRow(1,1000,{burstChanges:4})]).events.length,0);
});
console.log(`${checks} COMET map checks passed (including M04)`);

const chaseHelpers=load('../Private/src/helpers/cometCornerChase.ts');
const chaseTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/m05-corner-chase.json'),'utf8')).cornerChase;
const chaseRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','CornerChase',{feature:'M05',detail:{botInstance:'instance',cornerChase:{...chaseTrace,...changes}},...extra});
check('M05 frozen contact, style and actual jump evidence with native colors',()=>{
 const v=state(ready([chaseRow(1,1000)]),1050,'SAIN:RushEnemy',1000,false);
 assert.ok(v.cornerChase);assert.equal(v.actionActive,false);assert.equal(v.decision,'SAIN:RushEnemy');
 assert.equal(getBehaviorCategory(v.decision),getBehaviorCategory('SAIN:RushEnemy'));
 const html=tooltip(v);for(const text of ['Corner chase - M05','Running jump','Personal vision','Last observed position','Movement requests: 1','Takeoff: observed','Landing: observed','Not an updated enemy position'])assert.ok(html.includes(text),text);
 assert.equal(v.cornerChase.contactAge,chaseTrace.contactAge+.05);
});
check('M05 seeking, end, Ghost and native priority hide the badge',()=>{
 const r=ready([chaseRow(1,1000),chaseRow(2,1080,{state:'ended',reason:'chase-contact-reacquired',validFor:0,remaining:0})]);
 assert.ok(state(r,1050,'SAIN:RushEnemy',1000,false).cornerChase);
 assert.equal(state(r,1080,'SAIN:RushEnemy',1000,false).cornerChase,undefined);
 assert.ok(state(r,1050,'SAIN:RushEnemy',1000,false).cornerChase);
 for(const at of [999,1200,2000])assert.equal(state(ready([chaseRow(1,1000)]),at,'SAIN:RushEnemy',900,false).cornerChase,undefined);
 assert.equal(state(r,1050,'SAIN:RushEnemy',1000,true).cornerChase,undefined);
 for(const action of ['SAIN:Search','SAIN:Retreat','SAIN:StandAndShoot','SAIN:Reload','SAIN:ThrowGrenade','COMET:Hold'])assert.equal(state(r,1050,action,1000,false).cornerChase,undefined);
});
check('M05 no stale context across bot instances or COMET sessions',()=>{
 for(const extra of [{detail:{botInstance:'other',combatLean:leanTrace}}, {cometSession:'other-session',detail:{botInstance:'instance',combatLean:leanTrace}}]){
  const r=ready([chaseRow(1,1000),leanRow(2,1040,{},extra)]);
  assert.equal(state(r,1050,'SAIN:RushEnemy',1000,false).cornerChase,undefined);
 }
});
check('M05 strict parser rejects fabricated jump/route evidence and wrong envelopes',()=>{
 for(const bad of [null,[],{...chaseTrace,speed:Infinity},{...chaseTrace,travel:NaN},{...chaseTrace,pathLength:-1},
 {...chaseTrace,side:2},{...chaseTrace,roll:100},{...chaseTrace,jumps:2},{...chaseTrace,jumpRequested:false},
 {...chaseTrace,jumpAccepted:false},{...chaseTrace,takeoffObserved:false},{...chaseTrace,requested:false},
 {...chaseTrace,travel:0},{...chaseTrace,state:'ended'},{...chaseTrace,source:'shared'},
 {...chaseTrace,validFor:.21},{...chaseTrace,action:'Hold'}])assert.equal(chaseHelpers.parseCometCornerChase(bad),null);
 const raw=chaseRow(1,1000,{target:'<img src=x>',reason:'<svg/onload=x>',alternatives:['<script>bad</script>']});
 const html=tooltip(state(ready([raw]),1050,'SAIN:RushEnemy',1000,false));
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;script&gt;'));
 assert.equal(ready([chaseRow(1,1000,{}, {decision:'FirePause'})]).events.length,0);
 assert.equal(ready([chaseRow(1,1000,{}, {stage:'selected'})]).events.length,0);
});
check('M05 requested jump and walking fallback never imply takeoff',()=>{
 const unobserved={...chaseTrace,style:'lean-in',jumpAccepted:false,jumps:0,takeoffObserved:false,landingObserved:false,movementObserved:false,travel:0,alternatives:['Native jump refused']};
 const text=chaseHelpers.cometCornerChaseSummary(chaseHelpers.parseCometCornerChase(unobserved)).join(' ');
 for(const wanted of ['Lean into corner','Observed: no','Takeoff: not observed','Landing: not observed','Native jump refused'])assert.ok(text.includes(wanted));
});
console.log(`${checks} COMET map checks passed (including M05)`);
const prefireHelpers=load('../Private/src/helpers/cometCornerPrefire.ts');
const prefireTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/m06-corner-prefire.json'),'utf8')).cornerPrefire;
const prefireRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','CornerPrefire',{feature:'M06',detail:{botInstance:'instance',cornerPrefire:{...prefireTrace,...changes}},...extra});
check('M06 request and actual shots use native behavior colors and safe tooltip',()=>{
 const v=state(ready([prefireRow(1,1000)]),1050,'SAIN:RushEnemy',1000,false);
 assert.ok(v.cornerPrefire);assert.equal(v.actionActive,false);assert.equal(v.decision,'SAIN:RushEnemy');
 assert.equal(getBehaviorCategory(v.decision),getBehaviorCategory('SAIN:RushEnemy'));
 const html=tooltip(v);for(const text of ['Corner prefire - M06','Personal vision','Fixed aim point','Fire request: yes','Native acceptance: yes','Actual shots: 1 / 4','Reserve: 9','Muzzle clear: yes','Continue M05 walking approach'])assert.ok(html.includes(text),text);
 assert.equal(v.cornerPrefire.contactAge,prefireTrace.contactAge+.05);
});
check('M06 expiry, end, reverse seeking and native priorities',()=>{
 const r=ready([prefireRow(1,1000),prefireRow(2,1080,{state:'ended',reason:'prefire-round-limit',actualShots:4,validFor:0,remaining:0})]);
 assert.ok(state(r,1050,'SAIN:RushEnemy',1000,false).cornerPrefire);
 assert.equal(state(r,1080,'SAIN:RushEnemy',1000,false).cornerPrefire,undefined);
 assert.ok(state(r,1050,'SAIN:RushEnemy',1000,false).cornerPrefire);
 for(const at of [999,1200,2000])assert.equal(state(ready([prefireRow(1,1000)]),at,'SAIN:RushEnemy',900,false).cornerPrefire,undefined);
 assert.equal(state(r,1050,'SAIN:RushEnemy',1000,true).cornerPrefire,undefined);
 for(const action of ['SAIN:Search','SAIN:Retreat','SAIN:StandAndShoot','SAIN:Reload','SAIN:ThrowGrenade','COMET:Hold'])assert.equal(state(r,1050,action,1000,false).cornerPrefire,undefined);
});
check('M06 independent M05 context and no stale cross-session evidence',()=>{
 const r=ready([chaseRow(1,1000),prefireRow(2,1020)]);const v=state(r,1050,'SAIN:RushEnemy',1000,false);
 assert.ok(v.cornerChase&&v.cornerPrefire);assert.ok(tooltip(v).includes('Corner chase - M05'));
 for(const extra of [{detail:{botInstance:'other',combatLean:leanTrace}}, {cometSession:'other-session',detail:{botInstance:'instance',combatLean:leanTrace}}]){
  assert.equal(state(ready([prefireRow(1,1000),leanRow(2,1040,{},extra)]),1050,'SAIN:RushEnemy',1000,false).cornerPrefire,undefined);
 }
});
check('M06 strict parser, invalid envelopes and HTML escaping',()=>{
 for(const bad of [null,[],{...prefireTrace,ammo:Infinity},{...prefireTrace,actualShots:NaN},{...prefireTrace,quota:0},{...prefireTrace,actualShots:5},
 {...prefireTrace,requested:false},{...prefireTrace,selected:false},{...prefireTrace,validFor:.21},{...prefireTrace,roll:100},
 {...prefireTrace,state:'ended'},{...prefireTrace,state:'waiting'},{...prefireTrace,source:'heard'},{...prefireTrace,action:'Hold'}])assert.equal(prefireHelpers.parseCometCornerPrefire(bad),null);
 const html=tooltip(state(ready([prefireRow(1,1000,{target:'<img src=x>',reason:'<svg/onload=x>',alternatives:['<script>bad</script>']})]),1050,'SAIN:RushEnemy',1000,false));
 for(const unsafe of ['<img','<svg','<script>'])assert.ok(!html.includes(unsafe));assert.ok(html.includes('&lt;img'));
 assert.equal(ready([prefireRow(1,1000,{}, {stage:'accepted'})]).events.length,0);
 assert.equal(ready([prefireRow(1,1000,{}, {decision:'Push'})]).events.length,0);
});
check('M06 waiting, request and synchronous observation are distinct',()=>{
 const waiting={...prefireTrace,state:'waiting',requested:false,accepted:false,actualShots:0,fireElapsed:0,clear:false};
 let text=prefireHelpers.cometCornerPrefireSummary(prefireHelpers.parseCometCornerPrefire(waiting)).join(' ');
 for(const wanted of ['Fire request: no','Native acceptance: not confirmed','Actual shots: 0 / 4','Muzzle clear: no'])assert.ok(text.includes(wanted));
 assert.ok(prefireHelpers.parseCometCornerPrefire({...prefireTrace,accepted:false}),'shot can precede native return');
});


const angleHelpers=load('../Private/src/helpers/cometAngleWatch.ts');
const angleTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/m07-angle-watch.json'),'utf8')).angleWatch;
const angleRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','AngleWatch',{feature:'M07',detail:{botInstance:'instance',angleWatch:{...angleTrace,...changes}},...extra});
check('M07 gaze context preserves native behavior and distinguishes observed alignment',()=>{
 const v=state(ready([angleRow(1,1000)]),1050,'SAIN:Search',1000,false);
 assert.ok(v.angleWatch);assert.equal(v.actionActive,false);assert.equal(v.decision,'SAIN:Search');
 const html=tooltip(v);for(const text of ['Watch useful angle - M07','Personal vision','Chosen opening','Observed alignment: not yet','Pitch requested / observed','No firing or route request','Native SAIN gaze'])assert.ok(html.includes(text),text);
 assert.equal(v.angleWatch.contactAge,1.05);
});
check('M07 ends, expires, seeks back and hides in Ghost or incompatible actions',()=>{
 const r=ready([angleRow(1,1000),angleRow(2,1080,{state:'ended',reason:'angle-native-fire-or-aim',remaining:0,validFor:0})]);
 assert.ok(state(r,1050,'SAIN:Search',1000,false).angleWatch);
 assert.equal(state(r,1080,'SAIN:Search',1000,false).angleWatch,undefined);
 assert.ok(state(r,1050,'SAIN:Search',1000,false).angleWatch);
 for(const at of [999,1200,2000])assert.equal(state(ready([angleRow(1,1000)]),at,'SAIN:Search',900,false).angleWatch,undefined);
 assert.equal(state(r,1050,'SAIN:Search',1000,true).angleWatch,undefined);
 for(const action of ['SAIN:Retreat','SAIN:Reload','SAIN:ThrowGrenade','ORBIT:Patrol'])assert.equal(state(r,1050,action,1000,false).angleWatch,undefined);
});
check('M07 gives map priority to active chase and prefire',()=>{
 const r=ready([angleRow(1,1000),chaseRow(2,1020),prefireRow(3,1030)]);
 const v=state(r,1050,'SAIN:RushEnemy',1000,false);assert.ok(v.cornerChase&&v.cornerPrefire);assert.equal(v.angleWatch,undefined);
});
check('M07 malformed events, wrong stage and wrong identity fail closed',()=>{
 for(const bad of [null,[],{...angleTrace,angleError:NaN},{...angleTrace,observedPitch:91},{...angleTrace,leanSide:2},
 {...angleTrace,state:'ended'},{...angleTrace,source:'shared-heard'},{...angleTrace,validFor:.3},
 {...angleTrace,requested:false},{...angleTrace,aligned:true},{...angleTrace,action:'Retreat'},{...angleTrace,leanSide:0,leanRequested:true}])assert.equal(angleHelpers.parseCometAngleWatch(bad),null);
 assert.equal(ready([angleRow(1,1000,{}, {stage:'accepted'})]).events.length,0);
 assert.equal(ready([angleRow(1,1000,{}, {decision:'Push'})]).events.length,0);
 const html=tooltip(state(ready([angleRow(1,1000,{target:'<img src=x>',alternatives:['<script>bad</script>']})]),1050,'SAIN:Search',1000,false));
 assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;img'));
});
check('M07 personal hearing and justified vertical aim remain understandable',()=>{
 const t=angleHelpers.parseCometAngleWatch({...angleTrace,source:'personal-hearing',elevation:true,requestedPitch:48});assert.ok(t);
 const text=angleHelpers.cometAngleWatchSummary(t).join(' ');assert.ok(text.includes('Personal hearing (watch only)'));assert.ok(text.includes('Elevation evidence: yes'));
});
check('M07 per-bot and recording session boundaries clear older context',()=>{
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',combatLean:leanTrace}}]){
  const r=ready([angleRow(1,1000),leanRow(2,1040,{},extra)]);assert.equal(state(r,1050,'SAIN:Search',1000,false).angleWatch,undefined);
 }
});
console.log(`${checks} COMET map checks passed (including M07)`);

const holdAngleHelpers=load('../Private/src/helpers/cometHoldAngle.ts');
const holdAngleTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/m08-hold-angle.json'),'utf8')).holdAngle;
const holdAngleRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','HoldAngle',{feature:'M08',detail:{botInstance:'instance',holdAngle:{...holdAngleTrace,...changes}},...extra});
check('M08 correction details retain native colors and separate command from observation',()=>{
 const v=state(ready([holdAngleRow(1,1000)]),1050,'SAIN:Freeze',1000,false);
 assert.ok(v.holdAngle);assert.equal(v.actionActive,false);assert.equal(v.decision,'SAIN:Freeze');
 const html=tooltip(v);for(const text of ['Open watched angle - M08','Personal vision','Chosen correction','Posture requested / observed','Movement requested: yes','Correction observed: not yet','Actual muzzle clear: no','Original Hold limit unchanged'])assert.ok(html.includes(text),text);
 assert.equal(v.holdAngle.contactAge,1.25);
});
check('M08 confirmed arrival shows both clear lanes and actual pose',()=>{
 const v=state(ready([holdAngleRow(1,1000,{state:'watching',reason:'hold-angle-open-observed',arrived:true,eyesClear:true,muzzleClear:true,observedPose:.65})]),1050,'COMET:Hold',1000,false);
 assert.ok(v.holdAngle);const html=tooltip(v);assert.ok(html.includes('Correction observed: yes'));assert.ok(html.includes('Actual muzzle clear: yes'));
});
check('M08 end, expiry, rewind, Ghost and incompatible behavior',()=>{
 const r=ready([holdAngleRow(1,1000),holdAngleRow(2,1080,{state:'ended',reason:'hold-angle-opening-lost',validFor:0,remaining:0})]);
 assert.ok(state(r,1050,'SAIN:Freeze',1000,false).holdAngle);
 assert.equal(state(r,1080,'SAIN:Freeze',1000,false).holdAngle,undefined);
 assert.ok(state(r,1050,'SAIN:Freeze',1000,false).holdAngle);
 for(const at of [999,1200,2000])assert.equal(state(ready([holdAngleRow(1,1000)]),at,'SAIN:Freeze',900,false).holdAngle,undefined);
 assert.equal(state(r,1050,'SAIN:Freeze',1000,true).holdAngle,undefined);
 for(const action of ['SAIN:Search','SAIN:Retreat','SAIN:Reload','SAIN:ThrowGrenade','ORBIT:Patrol'])assert.equal(state(r,1050,action,1000,false).holdAngle,undefined);
});
check('M08 malformed or fabricated success telemetry fails closed',()=>{
 for(const bad of [null,[],{...holdAngleTrace,state:'watching'}, {...holdAngleTrace,state:'ended'},
  {...holdAngleTrace,validFor:.3},{...holdAngleTrace,source:'unknown'}, {...holdAngleTrace,state:'planning'},
  {...holdAngleTrace,arrived:true},{...holdAngleTrace,requestedPose:1.1},{...holdAngleTrace,observedPose:NaN},
  {...holdAngleTrace,moveRequested:'yes'}, {...holdAngleTrace,state:'watching',arrived:true,eyesClear:true,muzzleClear:false}])assert.equal(holdAngleHelpers.parseCometHoldAngle(bad),null);
 for(const field of ['knownX','originY','aimZ','x','distance','remaining'])assert.equal(holdAngleHelpers.parseCometHoldAngle({...holdAngleTrace,[field]:Infinity}),null);
 assert.equal(ready([holdAngleRow(1,1000,{}, {stage:'accepted'})]).events.length,0);
 assert.equal(ready([holdAngleRow(1,1000,{}, {decision:'Push'})]).events.length,0);
});
check('M08 HTML safe alternatives and personal hearing',()=>{
 const v=state(ready([holdAngleRow(1,1000,{source:'personal-hearing',target:'<img src=x>',alternatives:['<script>bad</script>']})]),1050,'SAIN:Freeze',1000,false);
 const html=tooltip(v);assert.ok(html.includes('Personal hearing (watch only)'));assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;img'));
});
check('M08 no context leakage across bot instance or recording boundaries',()=>{
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',combatLean:leanTrace}}]){
  const r=ready([holdAngleRow(1,1000),leanRow(2,1040,{},extra)]);assert.equal(state(r,1050,'SAIN:Freeze',1000,false).holdAngle,undefined);
 }
});
console.log(`${checks} COMET map checks passed (including M08)`);
const travelHelpers=load('../Private/src/helpers/cometCoverTravel.ts');
const travelTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/m09-cover-travel.json'),'utf8')).coverTravel;
const travelRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','CoverTravel',{feature:'M09',detail:{botInstance:'instance',coverTravel:{...travelTrace,...changes}},...extra});
check('M09 context preserves native movement color and request vs reality',()=>{
 const v=state(ready([travelRow(1,1000)]),1050,'SAIN:SeekCover',1000,false);
 assert.ok(v.coverTravel);assert.equal(v.actionActive,false);assert.equal(v.decision,'SAIN:SeekCover');
 const html=tooltip(v);for(const text of ['Face threat en route - M09','Personal vision','Actual route: 10.0','Estimated route exposure: 33%','Actual movement: backpedaling','Walk requested: yes','Sprint requested: no','Cover destination'])assert.ok(html.includes(text),text);
 assert.equal(v.coverTravel.contactAge,1.25);
});
check('M09 dash request does not invent observed sprint',()=>{
 const v=state(ready([travelRow(1,1000,{state:'dash',reason:'travel-short-protected-dash',length:7,walkRequested:false,sprintRequested:true,gazeRequested:false,observed:'stationary',speed:0})]),1050,'COMET:Cover',1000,false);
 assert.ok(v.coverTravel);const html=tooltip(v);assert.ok(html.includes('Sprint requested: yes'));assert.ok(html.includes('Actual movement: stationary'));
});
check('M09 short lease, interruption, rewind and Ghost scope',()=>{
 const r=ready([travelRow(1,1000),travelRow(2,1080,{state:'ended',reason:'travel-medical',validFor:0,remaining:0,walkRequested:false,gazeRequested:false})]);
 assert.ok(state(r,1050,'SAIN:SeekCover',1000,false).coverTravel);
 assert.equal(state(r,1080,'SAIN:SeekCover',1000,false).coverTravel,undefined);
 assert.ok(state(r,1050,'SAIN:SeekCover',1000,false).coverTravel);
 for(const at of [999,1200,2000])assert.equal(state(ready([travelRow(1,1000)]),at,'SAIN:SeekCover',900,false).coverTravel,undefined);
 assert.equal(state(r,1050,'SAIN:SeekCover',1000,true).coverTravel,undefined);
 for(const action of ['SAIN:Search','SAIN:Reload','SAIN:ThrowGrenade','ORBIT:Patrol'])assert.equal(state(r,1050,action,1000,false).coverTravel,undefined);
});
check('M09 parser rejects impossible or malformed telemetry',()=>{
 for(const bad of [null,[],{...travelTrace,state:'native'},{...travelTrace,state:'ended'},
  {...travelTrace,validFor:.3},{...travelTrace,source:'personal-hearing'},{...travelTrace,state:'dash'},
  {...travelTrace,walkRequested:'true'},{...travelTrace,sprintRequested:true},{...travelTrace,exposure:1.1},
  {...travelTrace,observed:'teleported'},{...travelTrace,facingDot:2},{...travelTrace,geometry:false}])assert.equal(travelHelpers.parseCometCoverTravel(bad),null);
 for(const field of ['knownX','x','turn','length','remaining'])assert.equal(travelHelpers.parseCometCoverTravel({...travelTrace,[field]:Infinity}),null);
 assert.equal(ready([travelRow(1,1000,{}, {stage:'accepted'})]).events.length,0);
 assert.equal(ready([travelRow(1,1000,{}, {decision:'Push'})]).events.length,0);
});
check('M09 context cannot leak between bot instances or sessions',()=>{
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',combatLean:leanTrace}}]){
  const r=ready([travelRow(1,1000),leanRow(2,1040,{},extra)]);assert.equal(state(r,1050,'SAIN:SeekCover',1000,false).coverTravel,undefined);
 }
});
check('M09 hover escapes contacts and alternatives',()=>{
 const v=state(ready([travelRow(1,1000,{target:'<img src=x>',alternatives:['<script>bad</script>']})]),1050,'SAIN:SeekCover',1000,false);
 const html=tooltip(v);assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;img'));
});
console.log(`${checks} COMET map checks passed (including M09)`);
const adsHelpers=load('../Private/src/helpers/cometAdsTravel.ts');
const adsTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/m10-ads-travel.json'),'utf8')).adsTravel;
const adsRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','AdsTravel',{feature:'M10',detail:{botInstance:'instance',adsTravel:{...adsTrace,...changes}},...extra});
check('M10 map keeps native action color and separates native wish, request, actual ADS',()=>{
 const v=state(ready([adsRow(1,1000)]),1050,'SAIN:SeekCover',1000,false);
 assert.ok(v.adsTravel);assert.equal(v.actionActive,false);assert.equal(v.decision,'SAIN:SeekCover');
 const html=tooltip(v);for(const text of ['Release ADS for travel - M10','SAIN wants ADS: on','ADS release requested: yes','Observed ADS: off','1.20 m/s','Known target: known-enemy'])assert.ok(html.includes(text),text);
 assert.equal(v.adsTravel.sinceShot,.65);
});
check('M10 request is not proof of actual ADS release',()=>{
 const v=state(ready([adsRow(1,1000,{observedADS:true})]),1050,'SAIN:RushEnemy',1000,false);
 assert.ok(v.adsTravel);assert.ok(tooltip(v).includes('Observed ADS: on'));
});
check('M10 lease, native ownership, release, Ghost and reverse playback',()=>{
 const r=ready([adsRow(1,1000),adsRow(2,1080,{state:'released',reason:'ads-fire-preparation',validFor:0,requestedOff:false,observedADS:true})]);
 assert.ok(state(r,1050,'SAIN:SeekCover',1000,false).adsTravel);
 assert.equal(state(r,1080,'SAIN:SeekCover',1000,false).adsTravel,undefined);
 assert.ok(state(r,1050,'SAIN:SeekCover',1000,false).adsTravel);
 for(const at of [999,1200,2000])assert.equal(state(ready([adsRow(1,1000)]),at,'SAIN:SeekCover',900,false).adsTravel,undefined);
 assert.equal(state(r,1050,'SAIN:SeekCover',1000,true).adsTravel,undefined);
 for(const action of ['SAIN:Search','SAIN:StandAndShoot','SAIN:Reload','ORBIT:Patrol'])assert.equal(state(r,1050,action,1000,false).adsTravel,undefined);
 for(const action of ['SAIN:SeekCover','SAIN:Retreat','SAIN:RunAway','SAIN:RushEnemy','COMET:Cover','COMET:FallBack','COMET:Push'])assert.ok(state(r,1050,action,1000,false).adsTravel);
});
check('M10 strict parser rejects contradictions and invalid transport schemas',()=>{
 for(const bad of [null,[],{...adsTrace,state:'native'},{...adsTrace,state:'released'},{...adsTrace,state:'waiting'},
  {...adsTrace,validFor:.5},{...adsTrace,nativeADS:false},{...adsTrace,firing:true},{...adsTrace,preparing:true},
  {...adsTrace,action:'StandAndShoot'},{...adsTrace,requestedOff:false},{...adsTrace,moving:false},{...adsTrace,sprinting:true},{...adsTrace,observedADS:'false'}])assert.equal(adsHelpers.parseCometAdsTravel(bad),null);
 for(const field of ['validFor','sinceShot','speed','retryIn'])for(const bad of [-1,NaN,Infinity])assert.equal(adsHelpers.parseCometAdsTravel({...adsTrace,[field]:bad}),null);
 assert.equal(ready([adsRow(1,1000,{}, {stage:'accepted'})]).events.length,0);
 assert.equal(ready([adsRow(1,1000,{}, {decision:'Push'})]).events.length,0);
});
check('M10 scope does not leak between bot instances or sessions',()=>{
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',combatLean:leanTrace}}]){
  const r=ready([adsRow(1,1000),leanRow(2,1040,{},extra)]);assert.equal(state(r,1050,'SAIN:SeekCover',1000,false).adsTravel,undefined);
 }
});
check('M10 can coexist with M09 but cannot supersede prefire and its text is escaped',()=>{
 const r=ready([travelRow(1,1000),adsRow(2,1000,{target:'<img src=x>',alternatives:['<script>bad</script>']})]);
 const v=state(r,1050,'SAIN:SeekCover',1000,false);assert.ok(v.adsTravel&&v.coverTravel);
 const html=tooltip(v);assert.ok(html.includes('M09'));assert.ok(html.includes('M10'));assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;img'));
});
console.log(`${checks} COMET map checks passed (including M10)`);

const weaveHelpers=load('../Private/src/helpers/cometRetreatWeave.ts');
const weaveTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/m11-retreat-weave.json'),'utf8')).retreatWeave;
const weaveRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','RetreatWeave',{feature:'M11',detail:{botInstance:'instance',retreatWeave:{...weaveTrace,...changes}},...extra});
check('M11 keeps native action and reports requested versus observed movement',()=>{
 const v=state(ready([weaveRow(1,1000)]),1050,'SAIN:Retreat',1000,false);
 assert.ok(v.retreatWeave);assert.equal(v.actionActive,false);assert.equal(v.decision,'SAIN:Retreat');
 const html=tooltip(v);for(const text of ['Evasive retreat - M11','30\u00b0','55\u00b0','25.0\u00b0','52.0\u00b0','1/1/1/1'])assert.ok(html.includes(text),text);
});
check('M11 request and acceptance never invent a jump',()=>{
 const v=state(ready([weaveRow(1,1000,{takeoffs:0,landings:0,jumpOutcome:'accepted-awaiting-takeoff'})]),1050,'SAIN:SeekCover',1000,false);
 assert.ok(v.retreatWeave);assert.ok(tooltip(v).includes('1/1/0/0'));
});
check('M11 expiry, interruption, reverse seeking, ghost and action priority',()=>{
 const r=ready([weaveRow(1,1000),weaveRow(2,1080,{state:'ended',validFor:0,yaw:0,pitch:0,moveRequested:false,gazeRequested:false})]);
 assert.ok(state(r,1050,'SAIN:Retreat',1000,false).retreatWeave);
 assert.equal(state(r,1080,'SAIN:Retreat',1000,false).retreatWeave,undefined);
 assert.ok(state(r,1050,'SAIN:Retreat',1000,false).retreatWeave);
 for(const at of [999,1200,2000])assert.equal(state(ready([weaveRow(1,1000)]),at,'SAIN:Retreat',900,false).retreatWeave,undefined);
 assert.equal(state(r,1050,'SAIN:Retreat',1000,true).retreatWeave,undefined);
 for(const action of ['SAIN:Search','SAIN:StandAndShoot','SAIN:RushEnemy','ORBIT:Patrol'])assert.equal(state(r,1050,action,1000,false).retreatWeave,undefined);
 for(const action of ['SAIN:SeekCover','SAIN:Retreat','SAIN:RunAway','SAIN:AvoidGrenade','COMET:FallBack'])assert.ok(state(r,1050,action,1000,false).retreatWeave);
});
check('M11 strict parser rejects false observations and broken schemas',()=>{
 for(const bad of [null,[],{...weaveTrace,state:'native'},{...weaveTrace,state:'ended'},{...weaveTrace,source:'hidden-transform'},
 {...weaveTrace,landings:2},{...weaveTrace,takeoffs:2},{...weaveTrace,acceptedJumps:2},{...weaveTrace,jumpOutcome:'landed-guaranteed'},
 {...weaveTrace,pitch:90},{...weaveTrace,yaw:60},{...weaveTrace,validFor:.3},{...weaveTrace,grounded:'true'}])assert.equal(weaveHelpers.parseCometRetreatWeave(bad),null);
 for(const field of ['knownX','x','speed','observedYaw','contactAge'])assert.equal(weaveHelpers.parseCometRetreatWeave({...weaveTrace,[field]:Infinity}),null);
 assert.equal(ready([weaveRow(1,1000,{}, {stage:'accepted'})]).events.length,0);
});
check('M11 session and bot instance separation',()=>{
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',combatLean:leanTrace}}]){
  const r=ready([weaveRow(1,1000),leanRow(2,1040,{},extra)]);assert.equal(state(r,1050,'SAIN:Retreat',1000,false).retreatWeave,undefined);
 }
});
check('M11 hover escapes untrusted text',()=>{
 const v=state(ready([weaveRow(1,1000,{target:'<img src=x>',alternatives:['<script>bad</script>']})]),1050,'SAIN:Retreat',1000,false);
 const html=tooltip(v);assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;img'));
});
console.log(`${checks} COMET map checks passed (including M11)`);

const tacticalJumpHelpers=load('../Private/src/helpers/cometTacticalJump.ts');
const tacticalJumpTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/m12-tactical-jump.json'),'utf8')).tacticalJump;
const tacticalJumpRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','TacticalJump',{feature:'M12',detail:{botInstance:'instance',tacticalJump:{...tacticalJumpTrace,...changes}},...extra});
check('M12 preserves native action and color with a separate flight context',()=>{
 const v=state(ready([tacticalJumpRow(1,1000)]),1050,'SAIN:Retreat',1000,false);
 assert.ok(v.tacticalJump);assert.equal(v.actionActive,false);assert.equal(v.decision,'SAIN:Retreat');
 const html=tooltip(v);for(const text of ['Tactical jumps - M12','hold until landing','yes / yes / yes / no','Observed shots, air / ground: 0 / 0'])assert.ok(html.includes(text),text);
});
check('M12 requested, accepted and observed takeoff are distinct',()=>{
 const pending={state:'pending',grounded:true,takeoffObserved:false,fireHeld:false};
 const requested={...pending,state:'requested',accepted:false};
 for(const t of [pending,requested])assert.ok(state(ready([tacticalJumpRow(1,1000,t)]),1050,'SAIN:Search',1000,false).tacticalJump);
 assert.ok(tooltip(state(ready([tacticalJumpRow(1,1000,requested)]),1050,'SAIN:Search',1000,false)).includes('yes / no / no / no'));
});
check('M12 expiry, landing and reverse playback',()=>{
 const r=ready([tacticalJumpRow(1,1000),tacticalJumpRow(2,1080,{state:'landed',grounded:true,landingObserved:true,fireHeld:false,validFor:0})]);
 assert.ok(state(r,1050,'SAIN:Retreat',1000,false).tacticalJump);
 assert.equal(state(r,1080,'SAIN:Retreat',1000,false).tacticalJump,undefined);
 assert.ok(state(r,1050,'SAIN:Retreat',1000,false).tacticalJump);
 for(const at of [999,1250,2000])assert.equal(state(ready([tacticalJumpRow(1,1000)]),at,'SAIN:Retreat',900,false).tacticalJump,undefined);
 assert.equal(state(r,1050,'SAIN:Retreat',1000,true).tacticalJump,undefined);
});
check('M12 stable style and observed shots do not force an action label',()=>{
 const v=state(ready([tacticalJumpRow(1,1000,{styleCached:true,airShotAllowed:true,fireHeld:false,airShots:2,roll:20})]),1050,'SAIN:StandAndShoot',1000,false);
 const html=tooltip(v);assert.ok(html.includes('native aiming still required'));assert.ok(html.includes('Reused style: yes'));assert.ok(html.includes('2 / 0'));
 assert.equal(v.decision,'SAIN:StandAndShoot');
});
check('M12 scope is isolated by session and bot instance',()=>{
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',combatLean:leanTrace}}]) {
  const r=ready([tacticalJumpRow(1,1000),leanRow(2,1040,{},extra)]);assert.equal(state(r,1050,'SAIN:Retreat',1000,false).tacticalJump,undefined);
 }
});
check('M12 can accompany M11 without replacing it and escapes text',()=>{
 const r=ready([weaveRow(1,1000),tacticalJumpRow(2,1000,{target:'<img src=x>',alternatives:['<script>bad</script>']})]);
 const v=state(r,1050,'SAIN:Retreat',1000,false);assert.ok(v.retreatWeave&&v.tacticalJump);
 const html=tooltip(v);assert.ok(html.includes('M11')&&html.includes('M12'));assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;img'));
});
check('M12 strict parser rejects false flight, blocking and malformed metadata',()=>{
 for(const bad of [null,[],{...tacticalJumpTrace,state:'landed'},{...tacticalJumpTrace,state:'refused'},{...tacticalJumpTrace,sourceFeature:'unstuck'},
 {...tacticalJumpTrace,takeoffObserved:false},{...tacticalJumpTrace,accepted:false},{...tacticalJumpTrace,landingObserved:true},
 {...tacticalJumpTrace,grounded:true},{...tacticalJumpTrace,airShotAllowed:true},{...tacticalJumpTrace,fireHeld:false},
 {...tacticalJumpTrace,validFor:.5},{...tacticalJumpTrace,chance:101},{...tacticalJumpTrace,attempt:0},{...tacticalJumpTrace,airShots:-1}])assert.equal(tacticalJumpHelpers.parseCometTacticalJump(bad),null);
 for(const field of ['x','elapsed','speed','stamina','roll'])assert.equal(tacticalJumpHelpers.parseCometTacticalJump({...tacticalJumpTrace,[field]:NaN}),null);
 for(const extra of [{stage:'accepted'},{decision:'Push'}])assert.equal(ready([tacticalJumpRow(1,1000,{},extra)]).events.length,0);
});
const m12Wire=path.resolve(__dirname,'../../COMET/artifacts/m12-wire-traces.json');
if(fs.existsSync(m12Wire))check('M12 actual C# serialized lifecycle is accepted by TypeScript',()=>{
 for(const trace of JSON.parse(fs.readFileSync(m12Wire,'utf8')))assert.ok(tacticalJumpHelpers.parseCometTacticalJump(trace),trace.state);
});
console.log(`${checks} COMET map checks passed (including M12)`);

const relocHelpers=load('../Private/src/helpers/cometOutdoorRelocation.ts');
const relocTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/m13-outdoor-relocation.json'),'utf8')).outdoorRelocation;
const relocRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','OutdoorRelocation',{feature:'M13',detail:{botInstance:'instance',outdoorRelocation:{...relocTrace,...changes}},...extra});
check('M13 native behavior and color remain independent from relocation context',()=>{
 const v=state(ready([relocRow(1,1000)]),1050,'SAIN:SeekCover',1000,false);
 assert.ok(v.outdoorRelocation);assert.equal(v.decision,'SAIN:SeekCover');assert.equal(v.actionActive,false);
 const html=tooltip(v);for(const text of ['Change cover outdoors - M13','Protection 3/3','Route 11.0 m','release observed','yes / yes / yes / no'])assert.ok(html.includes(text),text);
});
check('M13 expiry, arrival, ghost and reverse playback',()=>{
 const r=ready([relocRow(1,1000),relocRow(2,1080,{state:'arrived',arrived:true,validFor:0})]);
 assert.ok(state(r,1050,'SAIN:SeekCover',1000,false).outdoorRelocation);
 assert.equal(state(r,1080,'SAIN:SeekCover',1000,false).outdoorRelocation,undefined);
 assert.ok(state(r,1050,'SAIN:SeekCover',1000,false).outdoorRelocation);
 for(const at of [999,1300,2000])assert.equal(state(ready([relocRow(1,1000)]),at,'SAIN:SeekCover',900,false).outdoorRelocation,undefined);
 assert.equal(state(r,1050,'SAIN:SeekCover',1000,true).outdoorRelocation,undefined);
});
check('M13 session and bot instance isolation',()=>{
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',combatLean:leanTrace}}]) {
  const r=ready([relocRow(1,1000),leanRow(2,1040,{},extra)]);assert.equal(state(r,1050,'SAIN:SeekCover',1000,false).outdoorRelocation,undefined);
 }
});
check('M13 coexists with M09 and escapes all displayed input',()=>{
 const v=state(ready([travelRow(1,1000),relocRow(2,1000,{target:'<img src=x>',alternatives:['<script>bad</script>']})]),1050,'SAIN:SeekCover',1000,false);
 assert.ok(v.coverTravel&&v.outdoorRelocation);const html=tooltip(v);assert.ok(html.includes('M09')&&html.includes('M13'));assert.ok(!html.includes('<img')&&!html.includes('<script>'));assert.ok(html.includes('&lt;img'));
});
check('M13 malformed or impossible observations are rejected',()=>{
 for(const bad of [null,[],{...relocTrace,state:'arrived'},{...relocTrace,arrived:true},{...relocTrace,moveRequested:false},
 {...relocTrace,throwAccepted:false},{...relocTrace,validFor:3},{...relocTrace,protection:4},{...relocTrace,chance:101},
 {...relocTrace,episode:0},{...relocTrace,exposure:2},{...relocTrace,accepted:'true'},{...relocTrace,action:'Unknown'}])assert.equal(relocHelpers.parseCometOutdoorRelocation(bad),null);
 for(const key of ['knownX','speed','pathLength','elapsed','score'])assert.equal(relocHelpers.parseCometOutdoorRelocation({...relocTrace,[key]:NaN}),null);
 for(const extra of [{stage:'accepted'},{decision:'Push'}])assert.equal(ready([relocRow(1,1000,{},extra)]).events.length,0);
});
const m13Wire=path.resolve(__dirname,'../../COMET/artifacts/m13-wire-traces.json');
if(fs.existsSync(m13Wire))check('M13 real C# wire lifecycle agrees with TypeScript',()=>{
 for(const t of JSON.parse(fs.readFileSync(m13Wire,'utf8')))assert.ok(relocHelpers.parseCometOutdoorRelocation(t),t.state);
});
console.log(`${checks} COMET map checks passed (including M13)`);
const feintHelpers=load('../Private/src/helpers/cometCoverFeint.ts');
const feintTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/m14-cover-feint.json'),'utf8')).coverFeint;
const feintRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','CoverFeint',{feature:'M14',detail:{botInstance:'instance',coverFeint:{...feintTrace,...changes}},...extra});
check('M14 adds context without owning or recoloring native Freeze',()=>{
 const v=state(ready([feintRow(1,1000)]),1050,'SAIN:Freeze',1000,false);
 assert.ok(v.coverFeint);assert.equal(v.decision,'SAIN:Freeze');assert.equal(v.actionActive,false);
 const html=tooltip(v);for(const text of ['Cover feint - M14','Personal sighting','Playback submissions: 1','Enemy hearing not confirmed','do not prove the feint caused them'])assert.ok(html.includes(text),text);
});
check('M14 expiry, interruption, ghost and reverse playback',()=>{
 const r=ready([feintRow(1,1000),feintRow(2,1080,{state:'ended',validFor:0})]);
 assert.ok(state(r,1050,'SAIN:Freeze',1000,false).coverFeint);
 assert.equal(state(r,1080,'SAIN:Freeze',1000,false).coverFeint,undefined);
 assert.ok(state(r,1050,'SAIN:Freeze',1000,false).coverFeint);
 for(const at of [999,1300,2000])assert.equal(state(ready([feintRow(1,1000)]),at,'SAIN:Freeze',900,false).coverFeint,undefined);
 assert.equal(state(r,1050,'SAIN:Freeze',1000,true).coverFeint,undefined);
 assert.equal(state(r,1050,'SAIN:DogFight',1000,false).coverFeint,undefined);
});
check('M14 isolation by session and participant instance',()=>{
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',combatLean:leanTrace}}]) {
  const r=ready([feintRow(1,1000),leanRow(2,1040,{},extra)]);assert.equal(state(r,1050,'SAIN:Freeze',1000,false).coverFeint,undefined);
 }
});
check('M14 can accompany M12 and escapes tooltip content',()=>{
 const v=state(ready([tacticalJumpRow(1,1000,{sourceFeature:'M14'}),feintRow(2,1000,{target:'<img src=x>',alternatives:['<script>bad</script>']})]),1050,'SAIN:Freeze',1000,false);
 assert.ok(v.tacticalJump&&v.coverFeint);const html=tooltip(v);assert.ok(html.includes('M12')&&html.includes('M14'));assert.ok(!html.includes('<img')&&!html.includes('<script>'));assert.ok(html.includes('&lt;img'));
});
check('M14 rejects impossible observations and malformed metadata',()=>{
 for(const bad of [null,[],{...feintTrace,state:'oops'},{...feintTrace,state:'ended'},{...feintTrace,weaponReady:false},
 {...feintTrace,magazineAccepted:false},{...feintTrace,animationObserved:false},{...feintTrace,validFor:3},
 {...feintTrace,peekChance:101},{...feintTrace,episode:0},{...feintTrace,accepted:'true'},{...feintTrace,action:'Search'},
 {...feintTrace,kind:'peek'},{...feintTrace,source:'live-hidden'},{...feintTrace,completedPeeks:3},{...feintTrace,returnedObserved:true}])assert.equal(feintHelpers.parseCometCoverFeint(bad),null);
 for(const key of ['knownX','speed','elapsed','hold','peekRoll'])assert.equal(feintHelpers.parseCometCoverFeint({...feintTrace,[key]:NaN}),null);
 for(const extra of [{stage:'accepted'},{decision:'Push'}])assert.equal(ready([feintRow(1,1000,{},extra)]).events.length,0);
});
const m14Wire=path.resolve(__dirname,'../../COMET/artifacts/m14-wire-traces.json');
if(fs.existsSync(m14Wire))check('M14 actual C# wire lifecycle agrees with TypeScript',()=>{
 for(const t of JSON.parse(fs.readFileSync(m14Wire,'utf8')))assert.ok(feintHelpers.parseCometCoverFeint(t),JSON.stringify(t));
});
console.log(`${checks} COMET map checks passed (including M14)`);

const reloadHelpers=load('../Private/src/helpers/cometReloadTiming.ts');
const reloadTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/w01-reload-timing.json'),'utf8')).reloadTiming;
const reloadRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','ReloadTiming',{feature:'W01',detail:{botInstance:'instance',reloadTiming:{...reloadTrace,...changes}},...extra});
check('W01 shows native reload evidence without recoloring it',()=>{
 const v=state(ready([reloadRow(1,1000)]),1100,'SAIN:Reload',1000,false);
 assert.ok(v.reloadTiming);assert.equal(v.decision,'SAIN:Reload');assert.equal(v.actionActive,false);
 for(const text of ['Reload timing - W01','8/31','30 rounds','Requested / accepted / animation / finished','Ammo gain observed: no'])assert.ok(tooltip(v).includes(text),text);
});
check('W01 expiry, action changes, ghost, ended and backwards seek',()=>{
 const r=ready([reloadRow(1,1000),reloadRow(2,1200,{state:'ended',validFor:0})]);
 assert.ok(state(r,1100,'SAIN:Reload',1000,false).reloadTiming);
 assert.equal(state(r,1200,'SAIN:Reload',1000,false).reloadTiming,undefined);
 assert.ok(state(r,1100,'SAIN:Reload',1000,false).reloadTiming);
 for(const at of [999,1500,2000])assert.equal(state(ready([reloadRow(1,1000)]),at,'SAIN:Reload',1000,false).reloadTiming,undefined);
 assert.equal(state(r,1100,'SAIN:Reload',1000,true).reloadTiming,undefined);
 assert.equal(state(r,1100,'SAIN:DogFight',1000,false).reloadTiming,undefined);
});
check('W01 scopes, escaped text and hold semantics',()=>{
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',combatLean:leanTrace}}])assert.equal(state(ready([reloadRow(1,1000),leanRow(2,1050,{},extra)]),1100,'SAIN:Reload',1000,false).reloadTiming,undefined);
 const v=state(ready([reloadRow(1,1000,{target:'<img src=x>',alternatives:['<script>bad</script>']})]),1100,'SAIN:Reload',1000,false);
 assert.ok(!tooltip(v).includes('<img')&&!tooltip(v).includes('<script>'));
 const h=state(ready([reloadRow(1,1000,{state:'choice',choice:'Hold',requested:false,accepted:false,started:false,action:'DogFight'})]),1100,'SAIN:DogFight',1000,false);
 assert.ok(h.reloadTiming);assert.equal(h.decision,'SAIN:DogFight');
});
check('W01 rejects fabricated completion and malformed payloads',()=>{
 for(const bad of [null,[],{...reloadTrace,state:'oops'},{...reloadTrace,state:'ended'},{...reloadTrace,accepted:false},{...reloadTrace,started:false},
 {...reloadTrace,improved:true},{...reloadTrace,finished:true,started:false},{...reloadTrace,validFor:10},{...reloadTrace,loaded:1000},
 {...reloadTrace,source:'live-hidden'},{...reloadTrace,choice:'Hold'},{...reloadTrace,resource:'imaginary'}])assert.equal(reloadHelpers.parseCometReloadTiming(bad),null);
 for(const key of ['ratio','contactAge','reloadScore','elapsed','distance'])assert.equal(reloadHelpers.parseCometReloadTiming({...reloadTrace,[key]:NaN}),null);
 for(const extra of [{stage:'accepted'},{decision:'Push'}])assert.equal(ready([reloadRow(1,1000,{},extra)]).events.length,0);
});
const w01Wire=path.resolve(__dirname,'../../COMET/artifacts/w01-wire-traces.json');
if(fs.existsSync(w01Wire))check('W01 real C# wire lifecycle agrees with RR parser',()=>{
 for(const t of JSON.parse(fs.readFileSync(w01Wire,'utf8')))assert.ok(reloadHelpers.parseCometReloadTiming(t),JSON.stringify(t));
});
console.log(`${checks} COMET map checks passed (including W01)`);
const pistolHelpers=load('../Private/src/helpers/cometPistolSwap.ts');
const pistolTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/w02-pistol-swap.json'),'utf8')).pistolSwap;
const pistolRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','PistolSwap',{feature:'W02',detail:{botInstance:'instance',pistolSwap:{...pistolTrace,...changes}},...extra});
check('W02 native behavior and color retained while presenting actual sidearm evidence',()=>{
 const v=state(ready([pistolRow(1,1000)]),1100,'SAIN:StandAndShoot',1000,false);
 assert.ok(v.pistolSwap);assert.equal(v.decision,'SAIN:StandAndShoot');assert.equal(v.actionActive,false);
 for(const text of ['Pistol swap - W02','1/31','10/16','Requested / accepted / in hands / ready: yes / yes / yes / no','Scores: pistol'])assert.ok(tooltip(v).includes(text),text);
});
check('W02 request, acceptance, drawing, ready remain distinct',()=>{
 for(const [st,accepted,inHands,isReady] of [['requested',false,false,false],['requested',true,false,false],['drawing',true,true,false],['ready',true,true,true]]){
  const v=state(ready([pistolRow(1,1000,{state:st,accepted,inHands,ready:isReady})]),1100,'SAIN:StandAndShoot',1000,false);
  assert.ok(v.pistolSwap);assert.equal(v.pistolSwap.ready,isReady);assert.equal(v.pistolSwap.inHands,inHands);
 }
});
check('W02 expires, clears on end/ghost/action mismatch, supports backwards seek',()=>{
 const r=ready([pistolRow(1,1000),pistolRow(2,1200,{state:'ended',validFor:0})]);
 assert.ok(state(r,1100,'SAIN:StandAndShoot',1000,false).pistolSwap);
 assert.equal(state(r,1200,'SAIN:StandAndShoot',1000,false).pistolSwap,undefined);
 assert.ok(state(r,1100,'SAIN:StandAndShoot',1000,false).pistolSwap);
 for(const at of [999,1500,2000])assert.equal(state(ready([pistolRow(1,1000)]),at,'SAIN:StandAndShoot',1000,false).pistolSwap,undefined);
 assert.equal(state(r,1100,'SAIN:StandAndShoot',1000,true).pistolSwap,undefined);
 assert.equal(state(r,1100,'SAIN:DogFight',1000,false).pistolSwap,undefined);
});
check('W02 scope isolation and escaped metadata',()=>{
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',combatLean:leanTrace}}])assert.equal(state(ready([pistolRow(1,1000),leanRow(2,1050,{},extra)]),1100,'SAIN:StandAndShoot',1000,false).pistolSwap,undefined);
 const v=state(ready([pistolRow(1,1000,{target:'<img src=x>',alternatives:['<script>bad</script>']})]),1100,'SAIN:StandAndShoot',1000,false);
 assert.ok(!tooltip(v).includes('<img')&&!tooltip(v).includes('<script>'));
});
check('W02 rejects fabricated successes and invalid ammo/states',()=>{
 for(const bad of [null,[],{...pistolTrace,state:'oops'},{...pistolTrace,state:'ended'},{...pistolTrace,accepted:false},{...pistolTrace,requested:false},
 {...pistolTrace,inHands:false},{...pistolTrace,ready:true},{...pistolTrace,state:'ready',ready:false},{...pistolTrace,validFor:10},
 {...pistolTrace,pistolLoaded:100},{...pistolTrace,pistolChamber:-1},{...pistolTrace,mainLoaded:100},{...pistolTrace,source:'live-hidden'},
 {...pistolTrace,choice:'Hold'},{...pistolTrace,pistol:''}])assert.equal(pistolHelpers.parseCometPistolSwap(bad),null);
 for(const key of ['contactAge','pistolScore','elapsed','distance'])assert.equal(pistolHelpers.parseCometPistolSwap({...pistolTrace,[key]:NaN}),null);
 for(const extra of [{stage:'accepted'},{decision:'Push'}])assert.equal(ready([pistolRow(1,1000,{},extra)]).events.length,0);
});
const w02Wire=path.resolve(__dirname,'../../COMET/artifacts/w02-wire-traces.json');
if(fs.existsSync(w02Wire))check('W02 actual C# lifecycle agrees with RR parser',()=>{
 for(const t of JSON.parse(fs.readFileSync(w02Wire,'utf8')))assert.ok(pistolHelpers.parseCometPistolSwap(t),JSON.stringify(t));
});
console.log(`${checks} COMET map checks passed (including W02)`);
const returnHelpers=load('../Private/src/helpers/cometWeaponReturn.ts');
const returnTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/w03-weapon-return.json'),'utf8')).weaponReturn;
const returnRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','WeaponReturn',{feature:'W03',detail:{botInstance:'instance',weaponReturn:{...returnTrace,...changes}},...extra});
check('W03 shows weapon ownership, resources and real drawing without changing native behavior',()=>{
 const v=state(ready([returnRow(1,1000)]),1100,'SAIN:StandAndShoot',1000,false);
 assert.ok(v.weaponReturn);assert.equal(v.decision,'SAIN:StandAndShoot');assert.equal(v.actionActive,false);
 for(const text of ['Weapon return - W03','Holster','FirstPrimaryWeapon','25/31','Reserve 30','Requested / accepted / in hands / ready: yes / yes / yes / no','Request source: return-policy'])assert.ok(tooltip(v).includes(text),text);
});
check('W03 displays rejected changes and each native execution stage separately',()=>{
 for(const [st,requested,accepted,inHands,isReady] of [['choice',false,false,false,false],['requested',true,false,false,false],['requested',true,true,false,false],['drawing',true,true,true,false],['ready',true,true,true,true]]){
  const v=state(ready([returnRow(1,1000,{state:st,requested,accepted,inHands,ready:isReady,choice:requested?'Switch':'Keep',reason:requested?'weapon-native-request':'weapon-let-primary-reload'})]),1100,'SAIN:StandAndShoot',1000,false);
  assert.ok(v.weaponReturn);assert.equal(v.weaponReturn.ready,isReady);assert.equal(v.weaponReturn.inHands,inHands);
 }
 const v=state(ready([returnRow(1,1000,{holdRemaining:2,returnRemaining:4,retryRemaining:1})]),1200,'SAIN:StandAndShoot',1000,false);
 assert.equal(v.weaponReturn.returnRemaining,3.8);assert.equal(v.weaponReturn.holdRemaining,1.8);assert.equal(v.weaponReturn.retryRemaining,.8);
});
check('W03 expires, ends, respects ghost/action changes and seeks backwards',()=>{
 const r=ready([returnRow(1,1000),returnRow(2,1200,{state:'ended',validFor:0})]);
 assert.ok(state(r,1100,'SAIN:StandAndShoot',1000,false).weaponReturn);
 assert.equal(state(r,1200,'SAIN:StandAndShoot',1000,false).weaponReturn,undefined);
 assert.ok(state(r,1100,'SAIN:StandAndShoot',1000,false).weaponReturn);
 for(const at of [999,1500,2000])assert.equal(state(ready([returnRow(1,1000)]),at,'SAIN:StandAndShoot',1000,false).weaponReturn,undefined);
 assert.equal(state(r,1100,'SAIN:StandAndShoot',1000,true).weaponReturn,undefined);
 assert.equal(state(r,1100,'SAIN:DogFight',1000,false).weaponReturn,undefined);
});
check('W03 separates bot lifetimes and escapes all weapon/contact text',()=>{
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',combatLean:leanTrace}}])assert.equal(state(ready([returnRow(1,1000),leanRow(2,1050,{},extra)]),1100,'SAIN:StandAndShoot',1000,false).weaponReturn,undefined);
 const v=state(ready([returnRow(1,1000,{from:'<img src=x>',target:'<img src=x>',alternatives:['<script>bad</script>']})]),1100,'SAIN:StandAndShoot',1000,false);
 assert.ok(!tooltip(v).includes('<img')&&!tooltip(v).includes('<script>'));
});
check('W03 refuses fabricated readiness and malformed weapon evidence',()=>{
 for(const bad of [null,[],{...returnTrace,state:'oops'},{...returnTrace,state:'ended'},{...returnTrace,accepted:false},{...returnTrace,requested:false},
 {...returnTrace,inHands:false},{...returnTrace,ready:true},{...returnTrace,state:'ready',ready:false},{...returnTrace,validFor:10},
 {...returnTrace,weapons:[]},{...returnTrace,weapons:[{},...returnTrace.weapons.slice(1)]},
 {...returnTrace,weapons:[{...returnTrace.weapons[0],loaded:100},...returnTrace.weapons.slice(1)]},
 {...returnTrace,source:'live-hidden'},{...returnTrace,choice:'Keep'},{...returnTrace,to:''},{...returnTrace,from:returnTrace.to}])assert.equal(returnHelpers.parseCometWeaponReturn(bad),null);
 for(const key of ['contactAge','quietFor','holdRemaining','returnRemaining','retryRemaining','elapsed','distance'])assert.equal(returnHelpers.parseCometWeaponReturn({...returnTrace,[key]:NaN}),null);
 for(const extra of [{stage:'accepted'},{decision:'Push'}])assert.equal(ready([returnRow(1,1000,{},extra)]).events.length,0);
});
const w03Wire=path.resolve(__dirname,'../../COMET/artifacts/w03-wire-traces.json');
if(fs.existsSync(w03Wire))check('W03 actual C# wire lifecycle agrees with RR parser',()=>{
 for(const t of JSON.parse(fs.readFileSync(w03Wire,'utf8')))assert.ok(returnHelpers.parseCometWeaponReturn(t),JSON.stringify(t));
});
console.log(`${checks} COMET map checks passed (including W03)`);
const quickHelpers=load('../Private/src/helpers/cometQuickReload.ts');
const quickTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/w04-quick-reload.json'),'utf8')).quickReload;
const quickRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','QuickReload',{feature:'W04',detail:{botInstance:'instance',quickReload:{...quickTrace,...changes}},...extra});
check('W04 shows actual drop and ammo without changing native action/color',()=>{
 const v=state(ready([quickRow(1,1000)]),1100,'SAIN:StandAndShoot',1000,false);
 assert.ok(v.quickReload);assert.equal(v.decision,'SAIN:StandAndShoot');assert.equal(v.actionActive,false);
 for(const text of ['Fast reload - W04','7/31','Replacement: 30 rounds','Loaded reachable spares: 2','Magazine drop confirmed: yes','6 rounds left in the world'])assert.ok(tooltip(v).includes(text),text);
});
check('W04 completed request can remain drop-unconfirmed',()=>{
 const v=state(ready([quickRow(1,1000,{state:'completed',callbackSeen:true,callbackSuccess:true,replacementInserted:true,finished:true,improved:true,after:31,dropped:false,droppedRounds:0})]),1100,'SAIN:StandAndShoot',1000,false);
 assert.ok(v.quickReload);assert.ok(tooltip(v).includes('Magazine drop confirmed: no'));
});
check('W04 lease, end, ghost and native action changes clear context; backwards seek restores it',()=>{
 const r=ready([quickRow(1,1000),quickRow(2,1200,{state:'ended',validFor:0})]);
 assert.ok(state(r,1100,'SAIN:StandAndShoot',1000,false).quickReload);
 assert.equal(state(r,1200,'SAIN:StandAndShoot',1000,false).quickReload,undefined);
 assert.ok(state(r,1100,'SAIN:StandAndShoot',1000,false).quickReload);
 for(const at of [999,1500,2000])assert.equal(state(ready([quickRow(1,1000)]),at,'SAIN:StandAndShoot',1000,false).quickReload,undefined);
 assert.equal(state(r,1100,'SAIN:StandAndShoot',1000,true).quickReload,undefined);
 assert.equal(state(r,1100,'SAIN:DogFight',1000,false).quickReload,undefined);
});
check('W04 separates sessions and instances and escapes IDs/reasons/alternatives',()=>{
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',combatLean:leanTrace}}])assert.equal(state(ready([quickRow(1,1000),leanRow(2,1050,{},extra)]),1100,'SAIN:StandAndShoot',1000,false).quickReload,undefined);
 const v=state(ready([quickRow(1,1000,{weapon:'<img src=x>',target:'<img src=x>',reason:'<img src=x>',alternatives:['<script>bad</script>']})]),1100,'SAIN:StandAndShoot',1000,false);
 assert.ok(!tooltip(v).includes('<img')&&!tooltip(v).includes('<script>'));
});
check('W04 rejects fabricated success and malformed evidence',()=>{
 for(const bad of [null,[],{...quickTrace,state:'oops'},{...quickTrace,state:'ended'},{...quickTrace,requested:false},
 {...quickTrace,started:false},{...quickTrace,state:'completed'},{...quickTrace,finished:true},{...quickTrace,callbackSuccess:true},
 {...quickTrace,dropped:false},{...quickTrace,validFor:10},{...quickTrace,loaded:100},{...quickTrace,source:'live-hidden'},
 {...quickTrace,choice:'Normal'},{...quickTrace,replacement:quickTrace.oldMagazine},{...quickTrace,oldMagazine:''}])assert.equal(quickHelpers.parseCometQuickReload(bad),null);
 for(const key of ['contactAge','elapsed','distance','spareMagazines','droppedRounds'])assert.equal(quickHelpers.parseCometQuickReload({...quickTrace,[key]:NaN}),null);
 for(const extra of [{stage:'accepted'},{decision:'Push'}])assert.equal(ready([quickRow(1,1000,{},extra)]).events.length,0);
});
const w04Wire=path.resolve(__dirname,'../../COMET/artifacts/w04-wire-traces.json');
if(fs.existsSync(w04Wire))check('W04 real C# lifecycle agrees with RR parser',()=>{
 for(const t of JSON.parse(fs.readFileSync(w04Wire,'utf8')))assert.ok(quickHelpers.parseCometQuickReload(t),JSON.stringify(t));
});
console.log(`${checks} COMET map checks passed (including W04)`);
const rangeHelpers=load('../Private/src/helpers/cometWeaponRange.ts');
const rangeTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/w05-weapon-range.json'),'utf8')).weaponRange;
const rangeRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','WeaponRange',{feature:'W05',detail:{botInstance:'instance',weaponRange:{...rangeTrace,...changes}},...extra});
check('W05 comparison and physical progress shown without changing action/color',()=>{
 const v=state(ready([rangeRow(1,1000)]),1100,'SAIN:StandAndShoot',1000,false);
 assert.ok(v.weaponRange);assert.equal(v.decision,'SAIN:StandAndShoot');assert.equal(v.actionActive,false);
 for(const text of ['Weapon by distance - W05','Held: rifle','Alternative: dmr','100.0 m','yes / yes / yes / no','Close/long fit'])assert.ok(tooltip(v).includes(text),text);
});
check('W05 selection alone is not a ready weapon',()=>{
 const v=state(ready([rangeRow(1,1000,{state:'choice',requested:false,accepted:false,inHands:false,ready:false})]),1100,'SAIN:StandAndShoot',1000,false);
 assert.ok(v.weaponRange);assert.ok(tooltip(v).includes('no / no / no / no'));
});
check('W05 lease, end, ghost and action changes clear context; seek restores it',()=>{
 const r=ready([rangeRow(1,1000),rangeRow(2,1200,{state:'ended',validFor:0})]);
 assert.ok(state(r,1100,'SAIN:StandAndShoot',1000,false).weaponRange);
 assert.equal(state(r,1200,'SAIN:StandAndShoot',1000,false).weaponRange,undefined);
 assert.ok(state(r,1100,'SAIN:StandAndShoot',1000,false).weaponRange);
 for(const at of [999,1500,2000])assert.equal(state(ready([rangeRow(1,1000)]),at,'SAIN:StandAndShoot',1000,false).weaponRange,undefined);
 assert.equal(state(r,1100,'SAIN:StandAndShoot',1000,true).weaponRange,undefined);
 assert.equal(state(r,1100,'SAIN:DogFight',1000,false).weaponRange,undefined);
});
check('W05 separates sessions and instances and escapes weapon names and alternatives',()=>{
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',combatLean:leanTrace}}])assert.equal(state(ready([rangeRow(1,1000),leanRow(2,1050,{},extra)]),1100,'SAIN:StandAndShoot',1000,false).weaponRange,undefined);
 const v=state(ready([rangeRow(1,1000,{target:'<img src=x>',reason:'<img src=x>',weapons:rangeTrace.weapons.map(g=>({...g,name:'<script>bad</script>'})),alternatives:['<script>bad</script>']})]),1100,'SAIN:StandAndShoot',1000,false);
 assert.ok(!tooltip(v).includes('<img')&&!tooltip(v).includes('<script>'));
});
check('W05 rejects fabricated progress and malformed comparisons',()=>{
 for(const bad of [null,[],{...rangeTrace,state:'oops'},{...rangeTrace,state:'ended'},{...rangeTrace,requested:false},{...rangeTrace,ready:true},
 {...rangeTrace,validFor:10},{...rangeTrace,source:'live-hidden'},{...rangeTrace,weapons:[]},{...rangeTrace,weapons:[{},{}]},
 {...rangeTrace,choice:'Keep'},{...rangeTrace,to:''},{...rangeTrace,to:'other'},{...rangeTrace,from:rangeTrace.to}])assert.equal(rangeHelpers.parseCometWeaponRange(bad),null);
 for(const key of ['contactAge','stableFor','sinceShot','elapsed','distance'])assert.equal(rangeHelpers.parseCometWeaponRange({...rangeTrace,[key]:NaN}),null);
 for(const extra of [{stage:'accepted'},{decision:'Push'}])assert.equal(ready([rangeRow(1,1000,{},extra)]).events.length,0);
});
const w05Wire=path.resolve(__dirname,'../../COMET/artifacts/w05-wire-traces.json');
if(fs.existsSync(w05Wire))check('W05 actual C# lifecycle agrees with RR parser',()=>{
 for(const t of JSON.parse(fs.readFileSync(w05Wire,'utf8')))assert.ok(rangeHelpers.parseCometWeaponRange(t),JSON.stringify(t));
});
console.log(`${checks} COMET map checks passed (including W05)`);
const syncHelpers=load('../Private/src/helpers/cometWeaponSync.ts');
const syncTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/w06-weapon-sync.json'),'utf8')).weaponSync;
const syncRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','WeaponSync',{feature:'W06',detail:{botInstance:'instance',weaponSync:{...syncTrace,...changes}},...extra});
check('W06 repair is maintenance, including ORBIT looting; never a behavior or color override',()=>{
 for(const action of ['SAIN:StandAndShoot','SAIN:Reload','ORBIT:Loot','SAIN:Search']){
  const v=state(ready([syncRow(1,1000)]),1100,action,1000,false);
  assert.ok(v.weaponSync);assert.equal(v.decision,action);assert.equal(v.actionActive,false);
  for(const text of ['Equipment sync - W06','old-rifle','rifle','looted-dmr','discarded-pistol','Verified: yes','Maintenance only'])assert.ok(tooltip(v).includes(text),text);
 }
});
check('W06 deferred repair is not success',()=>{
 const v=state(ready([syncRow(1,1000,{state:'deferred',reason:'sync-native-operation-pending',verified:false,changed:false,resourcesInvalidated:false})]),1100,'SAIN:Reload',1000,false);
 assert.ok(v.weaponSync);assert.ok(tooltip(v).includes('pending'));assert.ok(tooltip(v).includes('Verified: no'));
});
check('W06 lease, end, ghost, seek, session and instance boundaries',()=>{
 const r=ready([syncRow(1,1000),syncRow(2,1200,{state:'ended',validFor:0})]);
 assert.ok(state(r,1100,'SAIN:Search',1000,false).weaponSync);
 assert.equal(state(r,1200,'SAIN:Search',1000,false).weaponSync,undefined);
 assert.ok(state(r,1100,'SAIN:Search',1000,false).weaponSync);
 for(const at of [999,3000,4000])assert.equal(state(ready([syncRow(1,1000)]),at,'SAIN:Search',1000,false).weaponSync,undefined);
 assert.equal(state(r,1100,'SAIN:Search',1000,true).weaponSync,undefined);
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',combatLean:leanTrace}}])assert.equal(state(ready([syncRow(1,1000),leanRow(2,1050,{},extra)]),1100,'SAIN:Search',1000,false).weaponSync,undefined);
});
check('W06 escapes names and rejects fabricated verification',()=>{
 const v=state(ready([syncRow(1,1000,{reason:'<script>bad</script>',slots:syncTrace.slots.map(s=>({...s,name:'<img src=x>'}))})]),1100,'SAIN:Search',1000,false);
 assert.ok(!tooltip(v).includes('<script>')&&!tooltip(v).includes('<img'));
 for(const bad of [null,[],{...syncTrace,verified:false},{...syncTrace,state:'applied'},{...syncTrace,state:'ended'},
  {...syncTrace,validFor:3},{...syncTrace,validFor:NaN},{...syncTrace,sampleMilliseconds:-1},{...syncTrace,slots:[]},
  {...syncTrace,slots:[{},{},{}]},{...syncTrace,slots:[syncTrace.slots[0],syncTrace.slots[0],syncTrace.slots[2]]},
  {...syncTrace,slots:syncTrace.slots.map(s=>({...s,nativeAfter:'incorrect'}))},{...syncTrace,nativeCurrentAfter:'wrong'},{...syncTrace,held:'absent'}])assert.equal(syncHelpers.parseCometWeaponSync(bad),null);
 for(const extra of [{stage:'accepted'},{decision:'Push'}])assert.equal(ready([syncRow(1,1000,{},extra)]).events.length,0);
});
const w06Wire=path.resolve(__dirname,'../../COMET/artifacts/w06-wire-traces.json');
if(fs.existsSync(w06Wire))check('W06 actual C# lifecycle agrees with RR parser',()=>{
 for(const t of JSON.parse(fs.readFileSync(w06Wire,'utf8')))assert.ok(syncHelpers.parseCometWeaponSync(t),JSON.stringify(t));
});
console.log(`${checks} COMET map checks passed (including W06)`);
const disciplineHelpers=load('../Private/src/helpers/cometSuppressionDiscipline.ts');
const disciplineTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/w07-suppression-discipline.json'),'utf8')).suppressionDiscipline;
const disciplineRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','SuppressionDiscipline',{feature:'W07',detail:{botInstance:'instance',suppressionDiscipline:{...disciplineTrace,...changes}},...extra});
check('W07 shows actual burst, pause, ammo and remembered point without overriding action or color',()=>{
 const v=state(ready([disciplineRow(1,1000)]),1100,'SAIN:Search',1000,false);
 assert.ok(v.suppressionDiscipline);assert.equal(v.decision,'SAIN:Search');assert.equal(v.actionActive,false);
 assert.equal(getBehaviorCategory(v.decision),getBehaviorCategory('SAIN:Search'));
 for(const t of ['Suppression discipline - W07','Actual shots: 5/5','5 this sequence','Pause: 2.9 s','Reserve: 18','personal-vision','Frozen aim: 5.0, 1.2, 10.0'])assert.ok(tooltip(v).includes(t),t);
});
check('W07 permitted/accepted does not invent a shot and resuming a burst preserves previous total',()=>{
 for(const accepted of [true,false]){
  const v=state(ready([disciplineRow(1,1000,{state:'firing',reason:'suppression-permitted',pauseRemaining:0,burstShots:0,actualShots:0,accepted})]),1000,'SAIN:Search',1000,false);
  assert.ok(tooltip(v).includes('Actual shots: 0/5'));assert.ok(tooltip(v).includes('Permission alone is not a shot'));
 }
 assert.ok(disciplineHelpers.parseCometSuppressionDiscipline({...disciplineTrace,state:'firing',pauseRemaining:0,burstShots:0,requested:false,accepted:false}));
});
check('W07 lease, native action, end, ghost, backwards seek and identity boundaries',()=>{
 const r=ready([disciplineRow(1,1000),disciplineRow(2,1200,{state:'ended',reason:'suppression-visible-target',validFor:0,pauseRemaining:0,remaining:0})]);
 assert.ok(state(r,1100,'SAIN:Search',1000,false).suppressionDiscipline);
 assert.equal(state(r,1200,'SAIN:Search',1000,false).suppressionDiscipline,undefined);
 assert.ok(state(r,1100,'SAIN:Search',1000,false).suppressionDiscipline);
 for(const at of [999,1300,4000])assert.equal(state(ready([disciplineRow(1,1000)]),at,'SAIN:Search',1000,false).suppressionDiscipline,undefined);
 for(const action of ['SAIN:StandAndShoot','SAIN:Reload','ORBIT:Loot'])assert.equal(state(r,1100,action,1000,false).suppressionDiscipline,undefined);
 assert.equal(state(r,1100,'SAIN:Search',1000,true).suppressionDiscipline,undefined);
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',combatLean:leanTrace}}])assert.equal(state(ready([disciplineRow(1,1000),leanRow(2,1050,{},extra)]),1100,'SAIN:Search',1000,false).suppressionDiscipline,undefined);
});
check('W07 validates data, preserves unexpected observed shots and escapes all free text',()=>{
 const v=state(ready([disciplineRow(1,1000,{target:'<img src=x>',reason:'<script>x</script>',alternatives:['<svg onload=x>']})]),1100,'SAIN:Search',1000,false);
 assert.ok(!tooltip(v).includes('<img')&&!tooltip(v).includes('<script>')&&!tooltip(v).includes('<svg'));
 for(const change of [{validFor:1},{validFor:NaN},{state:'ended'},{state:'paused',pauseRemaining:0},{state:'firing'},
  {actualShots:4},{requested:false},{loaded:31},{capacity:0},{burstLimit:0},{aimX:Infinity},{source:'live-position'},
  {clear:'true'},{state:'firing',pauseRemaining:0,clear:false},{episode:0}])assert.equal(disciplineHelpers.parseCometSuppressionDiscipline({...disciplineTrace,...change}),null,JSON.stringify(change));
 const overflow={...disciplineTrace,state:'ended',reason:'suppression-shot-outside-permission',burstShots:6,actualShots:6,validFor:0,pauseRemaining:0,remaining:0};
 assert.ok(disciplineHelpers.parseCometSuppressionDiscipline(overflow));assert.ok(disciplineHelpers.cometSuppressionDisciplineSummary(overflow).some(t=>t.includes('extra native shot')));
 for(const extra of [{stage:'accepted'},{decision:'Push'}])assert.equal(ready([disciplineRow(1,1000,{},extra)]).events.length,0);
});
const w07Wire=path.resolve(__dirname,'../../COMET/artifacts/w07-wire-traces.json');
if(fs.existsSync(w07Wire))check('W07 real C# lifecycle including rejection and callback timing agrees with RR parser',()=>{
 for(const t of JSON.parse(fs.readFileSync(w07Wire,'utf8')))assert.ok(disciplineHelpers.parseCometSuppressionDiscipline(t),JSON.stringify(t));
});
console.log(`${checks} COMET map checks passed (including W07)`);
const geometryHelpers=load('../Private/src/helpers/cometShotGeometry.ts');
const geometryTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/w08-shot-geometry.json'),'utf8')).shotGeometry;
const geometryRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','ShotGeometry',{feature:'W08',detail:{botInstance:'instance',shotGeometry:{...geometryTrace,...changes}},...extra});
check('W08 doors and glass permit attempts, not confirmed shots or penetrations; native behavior color retained',()=>{
 const v=state(ready([geometryRow(1,1000)]),1100,'SAIN:Search',1000,false);
 assert.ok(v.shotGeometry);assert.equal(v.decision,'SAIN:Search');assert.equal(v.actionActive,false);
 assert.equal(getBehaviorCategory(v.decision),getBehaviorCategory('SAIN:Search'));
 for(const t of ['Shot geometry - W08','Shot permitted','Doors / window glass: 2','Native ballistics still decide','Permission is not a fired shot','Known target: known-enemy'])assert.ok(tooltip(v).includes(t),t);
 assert.ok(!tooltip(v).includes('estimate 0%'));
});
check('W08 blocked geometry and deferred budget explain refusal without claiming a shot',()=>{
 for(const [s,reason,fresh] of [['blocked','geometry-ally-in-line',true],['deferred','geometry-budget',false]]){
  const v=state(ready([geometryRow(1,1000,{state:s,reason,fresh,allowed:false,allySafe:false,passThroughSurfaces:0,surfaces:[]})]),1100,'SAIN:Search',1000,false);
  assert.ok(v.shotGeometry);assert.ok(tooltip(v).includes(`Shot ${s}`));assert.ok(!tooltip(v).includes('Shot permitted'));
 }
});
check('W08 short lease, release, action, ghost, seek and identity boundaries',()=>{
 const r=ready([geometryRow(1,1000),geometryRow(2,1150,{state:'released',allowed:false,validFor:0,reason:'geometry-native-reset'})]);
 assert.ok(state(r,1100,'SAIN:Search',1000,false).shotGeometry);
 assert.equal(state(r,1150,'SAIN:Search',1000,false).shotGeometry,undefined);
 assert.ok(state(r,1100,'SAIN:Search',1000,false).shotGeometry);
 for(const at of [999,1200,4000])assert.equal(state(ready([geometryRow(1,1000)]),at,'SAIN:Search',1000,false).shotGeometry,undefined);
 for(const action of ['SAIN:Reload','SAIN:StandAndShoot','ORBIT:Loot'])assert.equal(state(r,1100,action,1000,false).shotGeometry,undefined);
 assert.equal(state(r,1100,'SAIN:Search',1000,true).shotGeometry,undefined);
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',combatLean:leanTrace}}])assert.equal(state(ready([geometryRow(1,1000),leanRow(2,1050,{},extra)]),1100,'SAIN:Search',1000,false).shotGeometry,undefined);
});
check('W08 rejects invented permissions and malformed geometry; escapes free text',()=>{
 for(const change of [{validFor:1},{validFor:NaN},{state:'released'},{state:'clear'},{allowed:false},{fresh:false},{allySafe:false},
  {passThroughSurfaces:3},{passThroughSurfaces:-1},{penetrationEstimated:true},{estimatedChance:.9},{muzzleX:Infinity},
  {surfaces:[]},{surfaces:[{}]},{surfaces:geometryTrace.surfaces.map(s=>({...s,distance:NaN}))},{state:'penetrable'},
  {surfaces:Array(33).fill(geometryTrace.surfaces[0])}])assert.equal(geometryHelpers.parseCometShotGeometry({...geometryTrace,...change}),null,JSON.stringify(change));
 for(const extra of [{stage:'accepted'},{decision:'Push'}])assert.equal(ready([geometryRow(1,1000,{},extra)]).events.length,0);
 const v=state(ready([geometryRow(1,1000,{reason:'<img src=x>',target:'<script>x</script>',surfaces:geometryTrace.surfaces.map(s=>({...s,material:'<svg onload=x>'})),alternatives:['<img src=x>']})]),1100,'SAIN:Search',1000,false);
 assert.ok(v.shotGeometry);assert.ok(!tooltip(v).includes('<img')&&!tooltip(v).includes('<script>')&&!tooltip(v).includes('<svg'));
});
const w08Wire=path.resolve(__dirname,'../../COMET/artifacts/w08-wire-traces.json');
if(fs.existsSync(w08Wire))check('W08 actual C# policy traces agree with RR parser',()=>{
 for(const t of JSON.parse(fs.readFileSync(w08Wire,'utf8')))assert.ok(geometryHelpers.parseCometShotGeometry(t),JSON.stringify(t));
});
console.log(`${checks} COMET map checks passed (including W08)`);
const recoveryHelpers=load('../Private/src/helpers/cometRecoilRecovery.ts');
const recoveryTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/w09-recoil-recovery.json'),'utf8')).recoilRecovery;
const recoveryRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','RecoilRecovery',{feature:'W09',detail:{botInstance:'instance',recoilRecovery:{...recoveryTrace,...changes}},...extra});
check('W09 badge describes observed recovery without changing native action/color or claiming a hit',()=>{
 const v=state(ready([recoveryRow(1,1000)]),1100,'SAIN:StandAndShoot',1000,false);
 assert.ok(v.recoilRecovery);assert.equal(v.decision,'SAIN:StandAndShoot');assert.equal(v.actionActive,false);assert.ok(v.active);
 assert.equal(getBehaviorCategory(v.decision),getBehaviorCategory('SAIN:StandAndShoot'));
 for(const t of ['Recoil recovery - W09','DMR recovery x3.0','Horizontal offset: 4.000','Vertical offset: -2.000','not a confirmed hit','Known contact: known-contact'])assert.ok(tooltip(v).includes(t),t);
});
check('W09 release, short lease, ghost, action, seeking, instance and session boundaries',()=>{
 const r=ready([recoveryRow(1,1000),recoveryRow(2,1400,{state:'ended',applied:false,step:0,validFor:0})]);
 assert.ok(state(r,1300,'SAIN:StandAndShoot',1000,false).recoilRecovery);
 assert.equal(state(r,1400,'SAIN:StandAndShoot',1000,false).recoilRecovery,undefined);
 assert.ok(state(r,1100,'SAIN:StandAndShoot',1000,false).recoilRecovery);
 for(const time of [999,1750,5000])assert.equal(state(ready([recoveryRow(1,1000)]),time,'SAIN:StandAndShoot',1000,false).recoilRecovery,undefined);
 for(const action of ['SAIN:Search','ORBIT:Loot'])assert.equal(state(r,1100,action,1000,false).recoilRecovery,undefined);
 assert.equal(state(r,1100,'SAIN:StandAndShoot',1000,true).recoilRecovery,undefined);
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',combatLean:leanTrace}}])assert.equal(state(ready([recoveryRow(1,1000),leanRow(2,1050,{},extra)]),1100,'SAIN:StandAndShoot',1000,false).recoilRecovery,undefined);
});
check('W09 malformed, invented and unsafe display data rejected and free text escaped',()=>{
 for(const change of [{state:'bad'},{weaponClass:'pistol'},{weapon:''},{multiplier:1},{multiplier:3.1},{multiplier:NaN},{beforeHorizontal:Infinity},
  {validFor:1},{validFor:0},{state:'ended'},{state:'settled'},{state:'started'},{afterHorizontal:100},{afterVertical:2},{shots:0},{steps:0},{step:-1},{step:.3},{coefficient:0}])
  assert.equal(recoveryHelpers.parseCometRecoilRecovery({...recoveryTrace,...change}),null,JSON.stringify(change));
 for(const extra of [{stage:'accepted'},{decision:'Push'}])assert.equal(ready([recoveryRow(1,1000,{},extra)]).events.length,0);
 const v=state(ready([recoveryRow(1,1000,{weapon:'<img src=x>',reason:'<script>x</script>',target:'<svg onload=x>',alternatives:['<img src=x>']})]),1100,'SAIN:StandAndShoot',1000,false);
 assert.ok(v.recoilRecovery);assert.ok(!tooltip(v).includes('<img')&&!tooltip(v).includes('<script>')&&!tooltip(v).includes('<svg'));
});
for(const [file,key] of [['w09-wire-traces.json',null],['w09-adapter-traces.json','recoilRecovery']]){
 const wire=path.resolve(__dirname,'../../COMET/artifacts/'+file);
 if(fs.existsSync(wire))check('W09 C# policy/adapter lifecycle agrees with RR: '+file,()=>{
  for(const t of JSON.parse(fs.readFileSync(wire,'utf8')))assert.ok(recoveryHelpers.parseCometRecoilRecovery(key?t[key]:t),JSON.stringify(t));
 });
}
console.log(`${checks} COMET map checks passed (including W09)`);
const handsHelpers=load('../Private/src/helpers/cometHandsRecovery.ts');
const handsTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/w10-hands-recovery.json'),'utf8')).handsRecovery;
const handsRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','HandsRecovery',{feature:'W10',detail:{botInstance:'instance',handsRecovery:{...handsTrace,...changes}},...extra});
check('W10 maintenance badge keeps behavior/color and does not claim native acceptance as success',()=>{
 for(const decision of ['SAIN:StandAndShoot','SAIN:Reload','ORBIT:Loot']){
  const v=state(ready([handsRow(1,1000)]),1100,decision,1000,false);
  assert.ok(v.handsRecovery);assert.equal(v.decision,decision);assert.equal(v.actionActive,false);assert.ok(v.active);
  assert.equal(getBehaviorCategory(v.decision),getBehaviorCategory(decision));
  for(const t of ['Hands recovery - W10','Attempts: 1/2','Request accepted: yes','Result: not confirmed','Ready: no','Known contact: known'])assert.ok(tooltip(v).includes(t),t);
 }
});
check('W10 terminal, short lease, seeking, ghost, session and instance boundaries',()=>{
 const r=ready([handsRow(1,1000),handsRow(2,1500,{state:'recovered',ready:true,inHands:true,validFor:0})]);
 assert.ok(state(r,1400,'ORBIT:Loot',1000,false).handsRecovery);
 assert.equal(state(r,1500,'ORBIT:Loot',1000,false).handsRecovery,undefined);
 assert.ok(state(r,1100,'ORBIT:Loot',1000,false).handsRecovery);
 for(const time of [999,2500,10000])assert.equal(state(ready([handsRow(1,1000)]),time,'SAIN:Search',1000,false).handsRecovery,undefined);
 assert.equal(state(r,1100,'SAIN:Search',1000,true).handsRecovery,undefined);
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',combatLean:leanTrace}}])assert.equal(state(ready([handsRow(1,1000),leanRow(2,1050,{},extra)]),1100,'SAIN:Search',1000,false).handsRecovery,undefined);
});
check('W10 invalid/invented states rejected and user text escaped',()=>{
 for(const change of [{state:'bad'},{kind:'knife'},{held:''},{attempts:0},{attempts:4},{limit:0},{ready:true},{validFor:0},{validFor:7},
  {confirmedSeconds:NaN},{requestAge:Infinity},{state:'refused'},{state:'exhausted'},{targetWeapon:''},{targetSlot:'Scabbard'},{state:'recovered',validFor:0}])
  assert.equal(handsHelpers.parseCometHandsRecovery({...handsTrace,...change}),null,JSON.stringify(change));
 for(const extra of [{stage:'accepted'},{decision:'Push'}])assert.equal(ready([handsRow(1,1000,{},extra)]).events.length,0);
 const v=state(ready([handsRow(1,1000,{held:'<img src=x>',reason:'<script>x</script>',contact:'<svg onload=x>',alternatives:['<img src=x>']})]),1100,'SAIN:Search',1000,false);
 assert.ok(v.handsRecovery);assert.ok(!tooltip(v).includes('<img')&&!tooltip(v).includes('<script>')&&!tooltip(v).includes('<svg'));
});
for(const [file,lines] of [['w10-wire-traces.json',false],['w10-adapter-events.jsonl',true]]){
 const wire=path.resolve(__dirname,'../../COMET/artifacts/'+file);
 if(fs.existsSync(wire))check('W10 production policy and adapter lifecycle agrees with RR: '+file,()=>{
  const text=fs.readFileSync(wire,'utf8').trim();const traces=lines?text.split(/\r?\n/).map(x=>JSON.parse(x).handsRecovery):JSON.parse(text);
  for(const t of traces)assert.ok(handsHelpers.parseCometHandsRecovery(t),JSON.stringify(t));
 });
}

const judgmentHelpers=load('../Private/src/helpers/cometGrenadeJudgment.ts');
const judgmentTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/g01-grenade-judgment.json'),'utf8')).grenadeJudgment;
const judgmentRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','GrenadeJudgment',{feature:'G01',detail:{botInstance:'instance',grenadeJudgment:{...judgmentTrace,...changes}},...extra});
check('G01 accepted does not claim projectile release or replace native behavior color',()=>{
 for(const decision of ['SAIN:ThrowGrenade','SAIN:Search','ORBIT:Loot']) {
  const v=state(ready([judgmentRow(1,1000)]),1200,decision,1000,false);
  assert.ok(v.grenadeJudgment&&v.active);assert.equal(v.decision,decision);assert.equal(v.actionActive,false);
  for(const text of ['Grenade judgment - G01','Chance: 50.0%','Roll: 10.0','Native accepted: yes','Projectile observed: no','Known contact: enemy'])assert.ok(tooltip(v).includes(text),text);
 }
});
check('G01 replay lease, backwards seek and ghost/session/instance boundaries',()=>{
 const rows=ready([judgmentRow(1,1000),judgmentRow(2,1500,{state:'ended',reason:'raid-ended',validFor:0})]);
 assert.ok(state(rows,1200,'SAIN:ThrowGrenade',1000,false).grenadeJudgment);
 assert.equal(state(rows,1500,'SAIN:ThrowGrenade',1000,false).grenadeJudgment,undefined);
 assert.ok(state(rows,1200,'SAIN:ThrowGrenade',1000,false).grenadeJudgment);
 for(const t of [999,2000,20000])assert.equal(state(ready([judgmentRow(1,1000)]),t,'SAIN:Search',1000,false).grenadeJudgment,undefined);
 assert.equal(state(rows,1200,'SAIN:Search',1000,true).grenadeJudgment,undefined);
 for(const extra of [{cometSession:'other'},{detail:{botInstance:'other',combatLean:leanTrace}}])assert.equal(state(ready([judgmentRow(1,1000),leanRow(2,1100,{},extra)]),1200,'SAIN:Search',1000,false).grenadeJudgment,undefined);
});
check('G01 rejects malformed telemetry and escapes text',()=>{
 for(const change of [{chance:NaN},{roll:100},{roll:-1},{accepted:true,requested:false},{released:true},{state:'released',released:false},{validFor:100},{state:'invented'},{samples:1.2},{x:Infinity}])assert.equal(judgmentHelpers.parseCometGrenadeJudgment({...judgmentTrace,...change}),null,JSON.stringify(change));
 const v=state(ready([judgmentRow(1,1000,{target:'<img src=x>',reason:'<svg>',alternatives:['<script>']})]),1200,'SAIN:Search',1000,false);
 assert.ok(v.grenadeJudgment);assert.ok(!tooltip(v).includes('<img')&&!tooltip(v).includes('<script>')&&!tooltip(v).includes('<svg>'));
 assert.equal(prepare([judgmentRow(1,1000,{}, {decision:'HandsRecovery'})]).length,0);
});
for(const file of ['g01-policy-wire.json','g01-adapter-events.jsonl']) {
 const wire=path.resolve(__dirname,'../../COMET/artifacts',file);
 if(fs.existsSync(wire))check('G01 production wire parses: '+file,()=>{
  const text=fs.readFileSync(wire,'utf8');const traces=file.endsWith('jsonl')?text.trim().split(/\r?\n/).map(v=>JSON.parse(v).grenadeJudgment):JSON.parse(text);
  for(const t of traces)assert.ok(judgmentHelpers.parseCometGrenadeJudgment(t),JSON.stringify(t));
 });
}

const trajectoryHelpers=load('../Private/src/helpers/cometGrenadeTrajectory.ts');
const trajectoryTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/g02-grenade-trajectory.json'),'utf8')).grenadeTrajectory;
const trajectoryRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','GrenadeTrajectory',{feature:'G02',detail:{botInstance:'instance',grenadeTrajectory:{...trajectoryTrace,...changes}},...extra});
check('G02 map exposes real aim and candidates without taking behavior ownership',()=>{
 for(const decision of ['SAIN:ThrowGrenade','SAIN:Search','ORBIT:Loot']) {
  const v=state(ready([trajectoryRow(1,1000)]),1050,decision,1000,false);
  assert.ok(v.grenadeTrajectory&&v.active);assert.equal(v.decision,decision);assert.equal(v.actionActive,false);
  assert.equal(getBehaviorCategory(v.decision),getBehaviorCategory(decision));
  for(const text of ['Grenade trajectory - G02','Known contact: enemy','Aim: last known','clearance 0.18 m','Native arc attempts: 4/12'])assert.ok(tooltip(v).includes(text),text);
 }
});
check('G02 lease, backwards seek, ghost and recording identity boundaries',()=>{
 const r=ready([trajectoryRow(1,1000),trajectoryRow(2,1100,{state:'ended',reason:'raid-ended',validFor:0})]);
 assert.ok(state(r,1050,'SAIN:Search',1000,false).grenadeTrajectory);
 assert.equal(state(r,1100,'SAIN:Search',1000,false).grenadeTrajectory,undefined);
 assert.ok(state(r,1050,'SAIN:Search',1000,false).grenadeTrajectory);
 for(const time of [999,1500,20000])assert.equal(state(ready([trajectoryRow(1,1000)]),time,'SAIN:Search',1000,false).grenadeTrajectory,undefined);
 assert.equal(state(r,1050,'SAIN:Search',1000,true).grenadeTrajectory,undefined);
 for(const extra of [{cometSession:'other'},{detail:{botInstance:'other',combatLean:leanTrace}}])assert.equal(state(ready([trajectoryRow(1,1000),leanRow(2,1025,{},extra)]),1050,'SAIN:Search',1000,false).grenadeTrajectory,undefined);
});
check('G02 rejects malformed telemetry and escapes all free text',()=>{
 for(const c of [{state:'released'},{attempts:13},{angle:80},{knownX:NaN},{validFor:2},{clearance:Infinity},{kind:'teleport'},{alternatives:[{}]},{alternatives:Array(21).fill(trajectoryTrace.alternatives[0])}])assert.equal(trajectoryHelpers.parseCometGrenadeTrajectory({...trajectoryTrace,...c}),null,JSON.stringify(c));
 for(const c of [{angle:4},{clearance:-1},{accepted:'yes'},{x:NaN},{accepted:true,angle:0}])assert.equal(trajectoryHelpers.parseCometGrenadeTrajectory({...trajectoryTrace,alternatives:[{...trajectoryTrace.alternatives[0],...c}]}),null);
 const v=state(ready([trajectoryRow(1,1000,{target:'<img src=x>',door:'<svg>',reason:'<script>',alternatives:[{...trajectoryTrace.alternatives[0],reason:'<script>x</script>'}]})]),1050,'SAIN:Search',1000,false);
 assert.ok(v.grenadeTrajectory);for(const tag of ['<img','<svg','<script>'])assert.ok(!tooltip(v).includes(tag));
 assert.equal(prepare([trajectoryRow(1,1000,{}, {decision:'GrenadeJudgment'})]).length,0);
});
const trajectoryWire=path.resolve(__dirname,'../../COMET/artifacts/g02-adapter-events.jsonl');
if(fs.existsSync(trajectoryWire))check('G02 production adapter wire is understood by RR',()=>{
 for(const line of fs.readFileSync(trajectoryWire,'utf8').trim().split(/\r?\n/)){
  const e=JSON.parse(line);if(e.grenadeTrajectory)assert.ok(trajectoryHelpers.parseCometGrenadeTrajectory(e.grenadeTrajectory),line);
 }
});
const choiceHelpers=load('../Private/src/helpers/cometGrenadeChoice.ts');
const choiceTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/g03-grenade-choice.json'),'utf8')).grenadeChoice;
const choiceRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','GrenadeChoice',{feature:'G03',detail:{botInstance:'instance',grenadeChoice:{...choiceTrace,...changes}},...extra});
check('G03 keeps action/color ownership while showing selected item, estimate and alternatives',()=>{
 for(const decision of ['SAIN:ThrowGrenade','SAIN:Search','ORBIT:Loot']){
  const v=state(ready([choiceRow(1,1000)]),1050,decision,1000,false);
  assert.ok(v.grenadeChoice&&v.active);assert.equal(v.decision,decision);assert.equal(v.actionActive,false);
  assert.equal(getBehaviorCategory(v.decision),getBehaviorCategory(decision));
  for(const text of ['Grenade choice - G03','Selected item: Test frag','Known contact: enemy','Estimated flight:','arrival margin','less preferred fuse'])assert.ok(tooltip(v).includes(text),text);
 }
});
check('G03 leases, backwards seek, ghost and cross-recording boundaries',()=>{
 const r=ready([choiceRow(1,1000),choiceRow(2,1100,{state:'ended',validFor:0})]);
 assert.ok(state(r,1050,'SAIN:Search',1000,false).grenadeChoice);
 assert.equal(state(r,1100,'SAIN:Search',1000,false).grenadeChoice,undefined);
 assert.ok(state(r,1050,'SAIN:Search',1000,false).grenadeChoice);
 for(const time of [999,1750,20000])assert.equal(state(ready([choiceRow(1,1000)]),time,'SAIN:Search',1000,false).grenadeChoice,undefined);
 assert.equal(state(r,1050,'SAIN:Search',1000,true).grenadeChoice,undefined);
 for(const extra of [{cometSession:'other'},{detail:{botInstance:'other',combatLean:leanTrace}}])assert.equal(state(ready([choiceRow(1,1000),leanRow(2,1025,{},extra)]),1050,'SAIN:Search',1000,false).grenadeChoice,undefined);
});
check('G03 rejects malformed telemetry and escapes free text',()=>{
 for(const c of [{state:'released'},{flight:Infinity},{fuse:NaN},{validFor:2},{requiredMargin:0},{item:''},{alternatives:[{}]},{alternatives:Array(33).fill(choiceTrace.alternatives[0])},{margin:0}])assert.equal(choiceHelpers.parseCometGrenadeChoice({...choiceTrace,...c}),null,JSON.stringify(c));
 const v=state(ready([choiceRow(1,1000,{target:'<img src=x>',reason:'<script>',name:'<svg>',alternatives:choiceTrace.alternatives.map(a=>({...a,reason:'<script>x</script>'}))})]),1050,'SAIN:Search',1000,false);
 assert.ok(v.grenadeChoice);for(const tag of ['<img','<svg','<script>'])assert.ok(!tooltip(v).includes(tag));
 assert.equal(prepare([choiceRow(1,1000,{}, {decision:'GrenadeTrajectory'})]).length,0);
});
const choiceWire=path.resolve(__dirname,'../../COMET/artifacts/g03-adapter-events.jsonl');
if(fs.existsSync(choiceWire))check('G03 actual production wire parses in RR',()=>{
 for(const line of fs.readFileSync(choiceWire,'utf8').trim().split(/\r?\n/)){
  const e=JSON.parse(line);if(e.grenadeChoice)assert.ok(choiceHelpers.parseCometGrenadeChoice(e.grenadeChoice),line);
 }
});
const ownHelpers=load('../Private/src/helpers/cometOwnGrenadeSafety.ts');
const ownTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/g04-own-grenade.json'),'utf8')).ownGrenadeSafety;
const ownRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','OwnGrenadeSafety',{feature:'G04',detail:{botInstance:'instance',ownGrenadeSafety:{...ownTrace,...changes}},...extra});
check('G04 displays danger, knowledge, alternatives without taking behavior colors',()=>{
 for(const decision of ['SAIN:ThrowGrenade','SAIN:RunAway','ORBIT:Loot']){
  const v=state(ready([ownRow(1,1000)]),1050,decision,1000,false);assert.ok(v.ownGrenadeSafety&&v.active);assert.equal(v.decision,decision);assert.equal(v.actionActive,false);
  assert.equal(getBehaviorCategory(v.decision),getBehaviorCategory(decision));
  for(const text of ['Own grenade safety - G04','Known grenade:','danger radius','unconfirmed grenade','native escape requested','entry: D07 still requires confirmed blast'])assert.ok(tooltip(v).includes(text),text);
 }
});
check('G04 leases and timeline boundaries',()=>{
 const r=ready([ownRow(1,1000),ownRow(2,1100,{state:'released',outcome:'confirmed-explosion',validFor:0})]);
 assert.ok(state(r,1050,'SAIN:Search',1000,false).ownGrenadeSafety);assert.equal(state(r,1100,'SAIN:Search',1000,false).ownGrenadeSafety,undefined);assert.ok(state(r,1050,'SAIN:Search',1000,false).ownGrenadeSafety);
 for(const t of [999,1500,20000])assert.equal(state(ready([ownRow(1,1000)]),t,'SAIN:Search',1000,false).ownGrenadeSafety,undefined);
 assert.equal(state(r,1050,'SAIN:Search',1000,true).ownGrenadeSafety,undefined);
 for(const extra of [{cometSession:'other'},{detail:{botInstance:'other',combatLean:leanTrace}}])assert.equal(state(ready([ownRow(1,1000),leanRow(2,1025,{},extra)]),1050,'SAIN:Search',1000,false).ownGrenadeSafety,undefined);
});
check('G04 validates actual evidence and escapes text',()=>{
 for(const c of [{state:'exploded'},{radius:Infinity},{age:NaN},{validFor:2},{owner:''},{active:65},{source:'omniscient'},{projectile:1.2},{outcome:'missing-means-exploded'},{alternatives:[{}]},{escape:false},{state:'released',outcome:'outcome-unknown',validFor:0}])assert.equal(ownHelpers.parseCometOwnGrenadeSafety({...ownTrace,...c}),null,JSON.stringify(c));
 const v=state(ready([ownRow(1,1000,{owner:'<img src=x>',reason:'<script>',alternatives:['<svg>']})]),1050,'SAIN:Search',1000,false);
 assert.ok(v.ownGrenadeSafety);for(const tag of ['<img','<svg','<script>'])assert.ok(!tooltip(v).includes(tag));
 assert.equal(prepare([ownRow(1,1000,{}, {decision:'GrenadeChoice'})]).length,0);
});
const ownWire=path.resolve(__dirname,'../../COMET/artifacts/g04-adapter-events.jsonl');
// The committed fixture above is mandatory; the live stream is optional when RR is checked out alone.
if(fs.existsSync(ownWire))check('G04 production adapter event stream is readable',()=>{
 const lines=fs.readFileSync(ownWire,'utf8').trim().split(/\r?\n/);
 for(const line of lines){const e=JSON.parse(line);assert.ok(ownHelpers.parseCometOwnGrenadeSafety(e.ownGrenadeSafety),line);}
});
const reactionHelpers=load('../Private/src/helpers/cometGrenadeReaction.ts');
const reactionTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/g05-grenade-reaction.json'),'utf8')).grenadeReaction;
const reactionRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','GrenadeReaction',{feature:'G05',detail:{botInstance:'instance',grenadeReaction:{...reactionTrace,...changes}},...extra});
check('G05 displays danger, knowledge, alternatives without taking behavior colors',()=>{
 for(const decision of ['SAIN:ThrowGrenade','SAIN:RunAway','ORBIT:Loot']){
  const v=state(ready([reactionRow(1,1000)]),1050,decision,1000,false);assert.ok(v.grenadeReaction&&v.active);assert.equal(v.decision,decision);assert.equal(v.actionActive,false);
  assert.equal(getBehaviorCategory(v.decision),getBehaviorCategory(decision));
  for(const text of ['Grenade reactions - G05','detected grenade','radius','known danger','Safe destination:','Known contact:'])assert.ok(tooltip(v).includes(text),text);
 }
});
check('G05 leases and timeline boundaries',()=>{
 const r=ready([reactionRow(1,1000),reactionRow(2,1100,{state:'ended',validFor:0})]);
 assert.ok(state(r,1050,'SAIN:Search',1000,false).grenadeReaction);assert.equal(state(r,1100,'SAIN:Search',1000,false).grenadeReaction,undefined);assert.ok(state(r,1050,'SAIN:Search',1000,false).grenadeReaction);
 for(const t of [999,1500,20000])assert.equal(state(ready([reactionRow(1,1000)]),t,'SAIN:Search',1000,false).grenadeReaction,undefined);
 assert.equal(state(r,1050,'SAIN:Search',1000,true).grenadeReaction,undefined);
 for(const extra of [{cometSession:'other'},{detail:{botInstance:'other',combatLean:leanTrace}}])assert.equal(state(ready([reactionRow(1,1000),leanRow(2,1025,{},extra)]),1050,'SAIN:Search',1000,false).grenadeReaction,undefined);
});
check('G05 validates actual evidence and escapes text',()=>{
 for(const c of [{state:'exploded'},{radius:Infinity},{pathLength:NaN},{validFor:2},{owner:''},{active:129},{source:'omniscient'},{projectile:1.2},{reaction:'Teleport'},{alternatives:[{}]},{hasGoal:false},{state:'ended',validFor:.5}])assert.equal(reactionHelpers.parseCometGrenadeReaction({...reactionTrace,...c}),null,JSON.stringify(c));
 const v=state(ready([reactionRow(1,1000,{owner:'<img src=x>',reason:'<script>',alternatives:['<svg>']})]),1050,'SAIN:Search',1000,false);
 assert.ok(v.grenadeReaction);for(const tag of ['<img','<svg','<script>'])assert.ok(!tooltip(v).includes(tag));
 assert.equal(prepare([reactionRow(1,1000,{}, {decision:'GrenadeChoice'})]).length,0);
});
const reactionWire=path.resolve(__dirname,'../../COMET/artifacts/g05-adapter-events.jsonl');
// The committed fixture above is mandatory; the live stream is optional when RR is checked out alone.
if(fs.existsSync(reactionWire))check('G05 production adapter event stream is readable',()=>{
 const lines=fs.readFileSync(reactionWire,'utf8').trim().split(/\r?\n/);
 for(const line of lines){const e=JSON.parse(line);assert.ok(reactionHelpers.parseCometGrenadeReaction(e.grenadeReaction),line);}
});
console.log(`${checks} COMET map checks passed (including G05)`);
const dispersionHelpers=load('../Private/src/helpers/cometGrenadeDispersion.ts');
const dispersionTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/g06-grenade-dispersion.json'),'utf8')).grenadeDispersion;
const dispersionRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','GrenadeDispersion',{feature:'G06',detail:{botInstance:'instance',grenadeDispersion:{...dispersionTrace,...changes}},...extra});
check('G06 shared exit explains spacing without replacing native action colors',()=>{
 for(const decision of ['SAIN:RunAway','SAIN:Search','ORBIT:Loot']){
  const v=state(ready([dispersionRow(1,1000)]),1050,decision,1000,false);
  assert.ok(v.grenadeDispersion&&v.active);assert.equal(v.decision,decision);assert.equal(v.actionActive,false);
  for(const text of ['Squad grenade dispersion - G06','Shared safe exit','no waiting','preferred spacing','teammate','reserved-near'])assert.ok(tooltip(v).includes(text),text);
  assert.equal(getBehaviorCategory(v.decision),getBehaviorCategory(decision));
 }
});
check('G06 independently coexists with G05 and both release',()=>{
 const r=ready([reactionRow(1,1000),dispersionRow(2,1010),dispersionRow(3,1100,{state:'ended',validFor:0,leaseRemaining:0})]);
 let v=state(r,1050,'SAIN:RunAway',1000,false);assert.ok(v.grenadeReaction&&v.grenadeDispersion);
 v=state(r,1100,'SAIN:RunAway',1000,false);assert.ok(v.grenadeReaction);assert.equal(v.grenadeDispersion,undefined);
 assert.ok(state(r,1050,'SAIN:RunAway',1000,false).grenadeDispersion);
});
check('G06 expires on trace/lease boundaries, ghost or identity change',()=>{
 for(const t of [999,1500,50000])assert.equal(state(ready([dispersionRow(1,1000)]),t,'SAIN:RunAway',1000,false).grenadeDispersion,undefined);
 assert.equal(state(ready([dispersionRow(1,1000,{leaseRemaining:.1})]),1100,'SAIN:RunAway',1000,false).grenadeDispersion,undefined);
 assert.equal(state(ready([dispersionRow(1,1000)]),1050,'SAIN:RunAway',1000,true).grenadeDispersion,undefined);
 for(const extra of [{cometSession:'other'},{detail:{botInstance:'other',combatLean:leanTrace}}])assert.equal(state(ready([dispersionRow(1,1000),leanRow(2,1020,{},extra)]),1050,'SAIN:RunAway',1000,false).grenadeDispersion,undefined);
});
check('G06 strict evidence and escaped tooltip text',()=>{
 for(const change of [{state:'teleport'},{token:0},{token:Infinity},{peers:33},{squad:''},{nearest:-2},{nearest:3},{peer:''},{spacing:0},{memberRange:61},{x:NaN},{leaseRemaining:2},{validFor:2},{state:'ended',validFor:0,leaseRemaining:1},{alternatives:[{}]}])assert.equal(dispersionHelpers.parseCometGrenadeDispersion({...dispersionTrace,...change}),null,JSON.stringify(change));
 const v=state(ready([dispersionRow(1,1000,{peer:'<img src=x>',reason:'<script>',alternatives:['<svg>']})]),1050,'SAIN:RunAway',1000,false);
 assert.ok(v.grenadeDispersion);for(const tag of ['<img','<script>','<svg>'])assert.ok(!tooltip(v).includes(tag));
 assert.equal(prepare([dispersionRow(1,1000,{}, {decision:'GrenadeReaction'})]).length,0);
 assert.ok(dispersionHelpers.parseCometGrenadeDispersion({...dispersionTrace,state:'reserved',peer:'',nearest:-1,peers:0}));
 assert.equal(dispersionHelpers.parseCometGrenadeDispersion({...dispersionTrace,state:'reserved',nearest:-.5}),null);
 assert.match(dispersionHelpers.cometGrenadeDispersionSummary(dispersionTrace).join('\n'),/Reservation #.*remaining at this event/);
});
const dispersionWire=path.resolve(__dirname,'../../COMET/artifacts/g06-adapter-events.jsonl');
if(fs.existsSync(dispersionWire))check('G06 production adapter stream is readable',()=>{
 for(const line of fs.readFileSync(dispersionWire,'utf8').trim().split(/\r?\n/))assert.ok(dispersionHelpers.parseCometGrenadeDispersion(JSON.parse(line).grenadeDispersion),line);
});
console.log(`${checks} COMET map checks passed (including G06)`);

const filterHelpers=load('../Private/src/helpers/cometGrenadeFilter.ts');
const filterTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/g07-grenade-filter.json'),'utf8')).grenadeFilter;
const filterRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','GrenadeFilter',{feature:'G07',detail:{botInstance:'instance',grenadeFilter:{...filterTrace,...changes}},...extra});
for(const decision of ['SAIN:ThrowGrenade','SAIN:RunAway','ORBIT:Looting']){
 const v=state(ready([filterRow(1,1000)]),1100,decision,1000,false);
 assert.ok(v.grenadeFilter&&v.active);assert.equal(v.decision,decision);assert.equal(v.actionActive,false);
 assert.match(tooltip(v),/Offensive grenade filter - G07/);assert.match(tooltip(v),/flash/);checks++;
}
{
 const r=ready([filterRow(1,1000),filterRow(2,1200,{state:'ended',validFor:0})]);
 assert.ok(state(r,1100,'SAIN:ThrowGrenade',1000,false).grenadeFilter);
 assert.equal(state(r,1200,'SAIN:ThrowGrenade',1000,false).grenadeFilter,undefined);
 assert.ok(state(r,1100,'SAIN:ThrowGrenade',1000,false).grenadeFilter);checks++;
}
{
 for(const at of [999,1750,50000])assert.equal(state(ready([filterRow(1,1000)]),at,'SAIN:ThrowGrenade',1000,false).grenadeFilter,undefined);
 assert.equal(state(ready([filterRow(1,1000)]),1100,'SAIN:ThrowGrenade',1000,true).grenadeFilter,undefined);
 for(const extra of [{cometSession:'other'},{detail:{botInstance:'other',combatLean:leanTrace}}])assert.equal(state(ready([filterRow(1,1000),leanRow(2,1020,{},extra)]),1100,'SAIN:ThrowGrenade',1000,false).grenadeFilter,undefined);checks++;
}
{
 for(const change of [{state:'fired'},{category:'custom'},{validFor:NaN},{validFor:2},{state:'ended',validFor:1},{item:''},{category:'smoke'},{alternatives:[{}]},{alternatives:[...filterTrace.alternatives,...filterTrace.alternatives]},{alternatives:Array(33).fill(filterTrace.alternatives[0])},{name:'x'.repeat(513)}])assert.equal(filterHelpers.parseCometGrenadeFilter({...filterTrace,...change}),null,JSON.stringify(change));
 assert.equal(ready([filterRow(1,1000,{}, {decision:'GrenadeChoice'})]).events.length,0);
 const v=state(ready([filterRow(1,1000,{name:'<img onerror=x>',reason:'<script>x</script>'})]),1100,'SAIN:ThrowGrenade',1000,false);
 assert.ok(v.grenadeFilter);assert.ok(!tooltip(v).includes('<img'));assert.ok(!tooltip(v).includes('<script>'));checks++;
}
{
 const wire=path.join(__dirname,'../../COMET/artifacts/g07-adapter-events.jsonl');
 const events=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):['g07-grenade-filter.json','g07-flash-choice.json'].map(f=>JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures',f),'utf8')));
 for(const e of events){
  if(e.feature==='G07')assert.ok(filterHelpers.parseCometGrenadeFilter(e.grenadeFilter),JSON.stringify(e));
  if(e.feature==='G03')assert.ok(load('../Private/src/helpers/cometGrenadeChoice.ts').parseCometGrenadeChoice(e.grenadeChoice),JSON.stringify(e));
 }
 const flash=events.find(e=>e.grenadeChoice?.preference==='flash-fallback');assert.ok(flash);
 const r=ready([filterRow(1,1000),row(2,1050,'evaluated','GrenadeChoice',{feature:'G03',detail:{botInstance:'instance',grenadeChoice:flash.grenadeChoice}})]);
 const v=state(r,1100,'SAIN:ThrowGrenade',1000,false);assert.ok(v.grenadeFilter&&v.grenadeChoice);assert.match(tooltip(v),/flash fallback/);checks++;
}
console.log(`${checks} COMET map checks passed (including G07)`);

const gasHelpers=load('../Private/src/helpers/cometGasExposure.ts');
const gasTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/g08-gas-exposure.json'),'utf8')).gasExposure;
const gasRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','GasExposure',{feature:'G08',detail:{botInstance:'instance',gasExposure:{...gasTrace,...changes}},...extra});
for(const decision of ['SAIN:AvoidGrenade','SAIN:RunAway','ORBIT:Looting']){
 const v=state(ready([gasRow(1,1000)]),1100,decision,1000,false);assert.ok(v.gasExposure&&v.active);assert.equal(v.decision,decision);assert.equal(v.actionActive,false);assert.match(tooltip(v),/CS gas exposure - G08/);assert.match(tooltip(v),/Manimal-CSGas/);checks++;
}
{
 const r=ready([gasRow(1,1000),gasRow(2,1200,{state:'ended',validFor:0,hasGoal:false})]);assert.ok(state(r,1100,'SAIN:AvoidGrenade',1000,false).gasExposure);assert.equal(state(r,1200,'SAIN:AvoidGrenade',1000,false).gasExposure,undefined);assert.ok(state(r,1100,'SAIN:AvoidGrenade',1000,false).gasExposure);checks++;
 for(const at of [999,2000,50000]){assert.equal(state(ready([gasRow(1,1000)]),at,'SAIN:AvoidGrenade',1000,false).gasExposure,undefined);checks++;}
 assert.equal(state(ready([gasRow(1,1000)]),1100,'SAIN:AvoidGrenade',1000,true).gasExposure,undefined);checks++;
 for(const extra of [{cometSession:'other'},{detail:{botInstance:'other',combatLean:leanTrace}}]){assert.equal(state(ready([gasRow(1,1000),leanRow(2,1020,{},extra)]),1100,'SAIN:AvoidGrenade',1000,false).gasExposure,undefined);checks++;}
}
for(const change of [{state:'fired'},{provider:'other'},{protection:'Boss'},{validFor:NaN},{validFor:2},{intensity:-1},{intensity:2},{state:'ended',validFor:1},{inside:true,cloud:''},{clouds:1.5},{clouds:129},{hasGoal:'yes'},{x:Infinity},{cough:true,protection:'Full'},{alternatives:Array(9).fill('x')},{reason:'x'.repeat(513)}]){assert.equal(gasHelpers.parseCometGasExposure({...gasTrace,...change}),null,JSON.stringify(change));checks++;}
assert.equal(ready([gasRow(1,1000,{}, {decision:'GrenadeChoice'})]).events.length,0);checks++;
{
 const v=state(ready([gasRow(1,1000,{cloud:'<img onerror=x>',reason:'<script>x</script>'})]),1100,'SAIN:AvoidGrenade',1000,false);assert.ok(v.gasExposure);assert.ok(!tooltip(v).includes('<img'));assert.ok(!tooltip(v).includes('<script>'));checks++;
 const wire=path.join(__dirname,'../../COMET/artifacts/g08-adapter-events.jsonl');const events=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):[JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/g08-gas-exposure.json'),'utf8'))];
 for(const e of events){assert.ok(gasHelpers.parseCometGasExposure(e.gasExposure),JSON.stringify(e));checks++;}
}
console.log(`${checks} COMET map checks passed (including G08)`);

const flashHelpers=load('../Private/src/helpers/cometFlashContinuity.ts');
const flashTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/g09-flash-continuity.json'),'utf8')).flashContinuity;
const flashRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','FlashContinuity',{feature:'G09',detail:{botInstance:'instance',flashContinuity:{...flashTrace,...changes}},...extra});
for(const decision of ['SAIN:Flashed','SAIN:AvoidGrenade','ORBIT:Looting']){
 const v=state(ready([flashRow(1,1000)]),1100,decision,1000,false);assert.ok(v.flashContinuity&&v.active);assert.equal(v.decision,decision);assert.equal(v.actionActive,false);assert.match(tooltip(v),/Flash continuity - G09/);assert.match(tooltip(v),/Frozen personal visual memory/);assert.ok(Math.abs(v.flashContinuity.remaining-(flashTrace.remaining-.1))<.001);checks++;
}
{
 const r=ready([flashRow(1,1000),flashRow(2,1200,{state:'ended',validFor:0,remaining:0,strongRemaining:0,hasRemembered:false})]);assert.ok(state(r,1100,'SAIN:Flashed',1000,false).flashContinuity);assert.equal(state(r,1200,'SAIN:Flashed',1000,false).flashContinuity,undefined);assert.ok(state(r,1100,'SAIN:Flashed',1000,false).flashContinuity);checks++;
 for(const at of [999,2000,50000]){assert.equal(state(ready([flashRow(1,1000)]),at,'SAIN:Flashed',1000,false).flashContinuity,undefined);checks++;}
 assert.equal(state(ready([flashRow(1,1000,{remaining:.1,strongRemaining:0})]),1200,'SAIN:Flashed',1000,false).flashContinuity,undefined);checks++;
 assert.equal(state(ready([flashRow(1,1000)]),1100,'SAIN:Flashed',1000,true).flashContinuity,undefined);checks++;
 for(const extra of [{cometSession:'other'},{detail:{botInstance:'other',combatLean:leanTrace}}]){assert.equal(state(ready([flashRow(1,1000),leanRow(2,1020,{},extra)]),1100,'SAIN:Flashed',1000,false).flashContinuity,undefined);checks++;}
 const v=state(ready([flashRow(1,1000),gasRow(2,1050)]),1100,'SAIN:Flashed',1000,false);assert.ok(v.flashContinuity&&v.gasExposure);assert.match(tooltip(v),/Flash continuity/);assert.match(tooltip(v),/CS gas exposure/);checks++;
}
for(const change of [{state:'fired'},{source:'guessed'},{validFor:NaN},{validFor:2},{remaining:-1},{remaining:NaN},{strongRemaining:999},{state:'ended',validFor:1},{hasRemembered:true,target:''},{gasActive:'yes'},{x:Infinity},{alternatives:Array(9).fill('x')},{reason:'x'.repeat(513)}]){assert.equal(flashHelpers.parseCometFlashContinuity({...flashTrace,...change}),null,JSON.stringify(change));checks++;}
assert.equal(ready([flashRow(1,1000,{}, {decision:'GasExposure'})]).events.length,0);checks++;
{
 const v=state(ready([flashRow(1,1000,{target:'<img onerror=x>',reason:'<script>x</script>'})]),1100,'SAIN:Flashed',1000,false);assert.ok(v.flashContinuity);assert.ok(!tooltip(v).includes('<img'));assert.ok(!tooltip(v).includes('<script>'));checks++;
 const wire=path.join(__dirname,'../../COMET/artifacts/g09-adapter-events.jsonl');const events=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):[JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/g09-flash-continuity.json'),'utf8'))];
 for(const e of events){assert.ok(flashHelpers.parseCometFlashContinuity(e.flashContinuity),JSON.stringify(e));checks++;}
}
console.log(`${checks} COMET map checks passed (including G09)`);

const blastHelpers=load('../Private/src/helpers/cometExplosionAwareness.ts');
const blastTrace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/g10-explosion-awareness.json'),'utf8')).explosionAwareness;
const blastRow=(id,time,changes={},extra={})=>row(id,time,'evaluated','ExplosionAwareness',{feature:'G10',detail:{botInstance:'instance',explosionAwareness:{...blastTrace,...changes}},...extra});
for(const decision of ['SAIN:Patrol','ORBIT:Looting','SAIN:Search']){
 const v=state(ready([blastRow(1,1000)]),1100,decision,1000,false);assert.ok(v.explosionAwareness&&v.active);assert.equal(v.decision,decision);assert.equal(v.actionActive,false);assert.match(tooltip(v),/Explosion awareness - G10/);assert.match(tooltip(v),/Personally witnessed throw/);assert.ok(Math.abs(v.explosionAwareness.remaining-(blastTrace.remaining-.1))<.001);checks++;
}
{
 const r=ready([blastRow(1,1000),blastRow(2,1200,{state:'ended',validFor:0,remaining:0,applied:false})]);assert.ok(state(r,1100,'SAIN:Patrol',1000,false).explosionAwareness);assert.equal(state(r,1200,'SAIN:Patrol',1000,false).explosionAwareness,undefined);assert.ok(state(r,1100,'SAIN:Patrol',1000,false).explosionAwareness);checks++;
 for(const at of [999,2000,50000]){assert.equal(state(ready([blastRow(1,1000)]),at,'SAIN:Patrol',1000,false).explosionAwareness,undefined);checks++;}
 assert.equal(state(ready([blastRow(1,1000,{remaining:.1,validFor:.1})]),1200,'SAIN:Patrol',1000,false).explosionAwareness,undefined);checks++;
 assert.equal(state(ready([blastRow(1,1000)]),1100,'SAIN:Patrol',1000,true).explosionAwareness,undefined);checks++;
 for(const extra of [{cometSession:'other'},{detail:{botInstance:'other',combatLean:leanTrace}}]){assert.equal(state(ready([blastRow(1,1000),leanRow(2,1020,{},extra)]),1100,'SAIN:Patrol',1000,false).explosionAwareness,undefined);checks++;}
 for(const change of [{state:'heard',remaining:0,validFor:0,applied:false},{applied:false,validFor:0}]){
  assert.equal(state(ready([blastRow(1,1000,change)]),1100,'SAIN:Patrol',1000,false).explosionAwareness,undefined);checks++;
  const v=state(ready([blastRow(1,1000),blastRow(2,1050,{...change,signal:'other',x:500})]),1100,'SAIN:Patrol',1000,false);assert.equal(v.explosionAwareness.x,blastTrace.x);assert.ok(v.explosionAwareness.remaining<=blastTrace.remaining-.09);checks++;
 }
 const v=state(ready([blastRow(1,1000,{evidence:'unknown',target:'',evidenceAge:0,contactX:null,contactY:null,contactZ:null})]),1100,'ORBIT:Looting',1000,false);assert.match(tooltip(v),/Thrower unknown/);checks++;
}
for(const change of [{state:'fired'},{kind:'unknown'},{evidence:'inferred'},{validFor:NaN},{validFor:2},{remaining:-1},{remaining:9},{state:'ended',validFor:1},{target:''},{applied:'yes'},{applied:false,validFor:1},{x:Infinity},{contactX:null},{evidenceAge:-1},{distance:NaN},{audible:false},{evidence:'own'},{signal:''},{alternatives:Array(9).fill('x')},{reason:'x'.repeat(513)}]){assert.equal(blastHelpers.parseCometExplosionAwareness({...blastTrace,...change}),null,JSON.stringify(change));checks++;}
assert.equal(ready([blastRow(1,1000,{}, {decision:'GasExposure'})]).events.length,0);checks++;
{
 const v=state(ready([blastRow(1,1000,{target:'<img onerror=x>',reason:'<script>x</script>'})]),1100,'SAIN:Patrol',1000,false);assert.ok(v.explosionAwareness);assert.ok(!tooltip(v).includes('<img'));assert.ok(!tooltip(v).includes('<script>'));checks++;
 const wire=path.join(__dirname,'../../COMET/artifacts/g10-adapter-events.jsonl');const events=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):[JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/g10-explosion-awareness.json'),'utf8'))];
 for(const e of events){assert.ok(blastHelpers.parseCometExplosionAwareness(e.explosionAwareness),JSON.stringify(e));checks++;}
}
console.log(`${checks} COMET map checks passed (including G10)`);

const h01Helpers=load('../Private/src/helpers/cometMedicalChoice.ts');
const h01Trace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/h01-medical-choice.json'),'utf8')).medicalChoice;
const h01Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','MedicalChoice',{feature:'H01',detail:{botInstance:'instance',medicalChoice:{...h01Trace,...changes}},...extra});
{
 const v=state(ready([h01Row(1,1000)]),1100,'SAIN:Surgery',1000,false);
 assert.ok(v.medicalChoice&&v.active&&!v.actionActive);assert.equal(v.decision,'SAIN:Surgery');assert.match(tooltip(v),/Medical choice - H01/);assert.match(tooltip(v),/Surgery/);assert.match(tooltip(v),/observed in hands/);checks++;
 const r=ready([h01Row(1,1000),h01Row(2,1200,{state:'ended',applied:false,validFor:0,reason:'medical-use-ended'})]);
 assert.ok(state(r,1100,'SAIN:Surgery',1000,false).medicalChoice);assert.equal(state(r,1200,'SAIN:Patrol',1200,false).medicalChoice,undefined);assert.ok(state(r,1100,'SAIN:Surgery',1000,false).medicalChoice);checks++;
 for(const at of [999,2000,50000]){assert.equal(state(ready([h01Row(1,1000)]),at,'SAIN:Surgery',1000,false).medicalChoice,undefined);checks++;}
 assert.equal(state(ready([h01Row(1,1000)]),1100,'SAIN:Surgery',1000,true).medicalChoice,undefined);checks++;
 for(const extra of [{cometSession:'other'},{detail:{botInstance:'other',combatLean:leanTrace}}]){assert.equal(state(ready([h01Row(1,1000),leanRow(2,1020,{},extra)]),1100,'SAIN:Surgery',1000,false).medicalChoice,undefined);checks++;}
 for(const stage of ['selected','requested']){assert.equal(state(ready([h01Row(1,1000,{state:stage,started:false,applied:false,validFor:0})]),1100,'SAIN:Surgery',1000,false).medicalChoice,undefined);checks++;}
 const untrusted=state(ready([h01Row(1,1000,{contact:'<img onerror=x>',reason:'<script>x</script>',item:'<img src=x>'})]),1100,'SAIN:Surgery',1000,false);assert.ok(untrusted.medicalChoice);assert.ok(!tooltip(untrusted).includes('<img'));assert.ok(!tooltip(untrusted).includes('<script>'));checks++;
 const wire=path.join(__dirname,'../../COMET/artifacts/h01-adapter-events.jsonl');const events=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):[JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/h01-medical-choice.json'),'utf8'))];
 for(const e of events){assert.ok(h01Helpers.parseCometMedicalChoice(e.medicalChoice),JSON.stringify(e));checks++;}
}
for(const change of [{state:'success'},{choice:'MagicHeal'},{health:NaN},{health:2},{duration:Infinity},{duration:-1},{state:'ended',validFor:1},{started:false},{applied:'yes'},{applied:false,validFor:1},{x:Infinity},{contact:'',x:1},{contacts:17},{quiet:-1},{distance:NaN},{sinceHit:NaN},{outcome:'healed-everything'},{alternatives:Array(5).fill({})},{reason:'x'.repeat(513)}]){assert.equal(h01Helpers.parseCometMedicalChoice({...h01Trace,...change}),null,JSON.stringify(change));checks++;}
assert.equal(ready([h01Row(1,1000,{}, {decision:'ExplosionAwareness'})]).events.length,0);checks++;
console.log(`${checks} COMET map checks passed (including H01)`);
const h02Helpers=load('../Private/src/helpers/cometSurgeryInterruption.ts');
const h02Trace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/h02-surgery-interruption.json'),'utf8')).surgeryInterruption;
const h02Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','SurgeryInterruption',{feature:'H02',detail:{botInstance:'instance',surgeryInterruption:{...h02Trace,...changes}},...extra});
{
 const r=ready([h02Row(1,1000),h02Row(2,1500,{state:'hands-released',handsReleased:true}),h02Row(3,2000,{state:'weapon-ready',handsReleased:true,weaponReady:true,applied:false,validFor:0})]);
 const v=state(r,1100,'SAIN:Surgery',1000,false);assert.ok(v.surgeryInterruption&&v.active&&!v.actionActive);assert.equal(v.decision,'SAIN:Surgery');assert.match(tooltip(v),/Surgery interruption - H02/);assert.match(tooltip(v),/weapon ready: not observed/);checks++;
 assert.match(tooltip(state(r,1600,'SAIN:RunToCover',1500,false)),/Medicine hands released: yes/);checks++;
 assert.equal(state(r,2000,'SAIN:RunToCover',2000,false).surgeryInterruption,undefined);assert.ok(state(r,1100,'SAIN:Surgery',1000,false).surgeryInterruption);checks++;
 for(const at of [999,2000,50000]){assert.equal(state(ready([h02Row(1,1000)]),at,'SAIN:Surgery',1000,false).surgeryInterruption,undefined);checks++;}
 assert.equal(state(r,1100,'SAIN:Surgery',1000,true).surgeryInterruption,undefined);checks++;
 for(const extra of [{cometSession:'other'},{detail:{botInstance:'other',combatLean:leanTrace}}]){assert.equal(state(ready([h02Row(1,1000),leanRow(2,1020,{},extra)]),1100,'SAIN:Surgery',1000,false).surgeryInterruption,undefined);checks++;}
 assert.equal(state(ready([h02Row(1,1000),h02Row(2,1200,{state:'ended',applied:false,validFor:0})]),1300,'SAIN:Surgery',1000,false).surgeryInterruption,undefined);checks++;
 const x=state(ready([h02Row(1,1000,{reason:'<script>x</script>',item:'<img src=x>',evidence:{...h02Trace.evidence,contact:'<img onerror=x>'}})]),1100,'SAIN:Surgery',1000,false);assert.ok(x.surgeryInterruption);assert.ok(!tooltip(x).includes('<img'));assert.ok(!tooltip(x).includes('<script>'));checks++;
 const wire=path.join(__dirname,'../../COMET/artifacts/h02-adapter-events.jsonl');const events=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):[JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/h02-surgery-interruption.json'),'utf8'))];
 for(const e of events){assert.ok(h02Helpers.parseCometSurgeryInterruption(e.surgeryInterruption),JSON.stringify(e));checks++;}
}
for(const change of [{state:'magic'},{requested:false},{state:'ended',applied:true},{weaponReady:true,handsReleased:false},{retryRemaining:Infinity},{validFor:2},{applied:false,validFor:1},{item:''},{part:''},{completed:'yes'},{alternatives:Array(5).fill('x')},{reason:'x'.repeat(513)},{evidence:{}},{evidence:{...h02Trace.evidence,age:-1}},{evidence:{...h02Trace.evidence,x:Infinity}}]){assert.equal(h02Helpers.parseCometSurgeryInterruption({...h02Trace,...change}),null,JSON.stringify(change));checks++;}
assert.equal(ready([h02Row(1,1000,{}, {decision:'MedicalChoice'})]).events.length,0);checks++;
console.log(`${checks} COMET map checks passed (including H02)`);

const h03Helpers=load('../Private/src/helpers/cometMedicalPosture.ts');
const h03Trace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/h03-medical-posture.json'),'utf8')).medicalPosture;
const h03Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','MedicalPosture',{feature:'H03',detail:{botInstance:'instance',medicalPosture:{...h03Trace,...changes}},...extra});
{
 const resumed={state:'resumed',reason:'medical-posture-tactics-resumed',using:false,medicineHands:false,weaponReady:true,neutral:true,tilt:0,stableFor:.2,applied:false,validFor:0};
 const r=ready([h03Row(1,1000),h03Row(2,1500,{using:false,medicineHands:false,state:'waiting-weapon',weaponReady:false}),h03Row(3,2000,resumed)]);
 const v=state(r,1100,'SAIN:FirstAid',1000,false);assert.ok(v.medicalPosture&&v.active&&!v.actionActive);assert.equal(v.decision,'SAIN:FirstAid');assert.match(tooltip(v),/Medical posture - H03/);assert.match(tooltip(v),/medicine still in hands: yes/);checks++;
 assert.match(tooltip(state(r,1600,'SAIN:RunToCover',1500,false)),/waiting weapon/);checks++;
 assert.equal(state(r,2000,'SAIN:RunToCover',2000,false).medicalPosture,undefined);assert.ok(state(r,1100,'SAIN:FirstAid',1000,false).medicalPosture);checks++;
 for(const at of [999,2000,50000]){assert.equal(state(ready([h03Row(1,1000)]),at,'SAIN:FirstAid',1000,false).medicalPosture,undefined);checks++;}
 assert.equal(state(r,1100,'SAIN:FirstAid',1000,true).medicalPosture,undefined);checks++;
 for(const extra of [{cometSession:'other'},{detail:{botInstance:'other',combatLean:leanTrace}}]){assert.equal(state(ready([h03Row(1,1000),leanRow(2,1020,{},extra)]),1100,'SAIN:FirstAid',1000,false).medicalPosture,undefined);checks++;}
 const x=state(ready([h03Row(1,1000,{reason:'<script>x</script>',item:'<img src=x>',treatment:'<img onerror=x>'})]),1100,'SAIN:FirstAid',1000,false);assert.ok(x.medicalPosture);assert.ok(!tooltip(x).includes('<img'));assert.ok(!tooltip(x).includes('<script>'));checks++;
 const wire=path.join(__dirname,'../../COMET/artifacts/h03-adapter-events.jsonl');const events=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):[JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/h03-medical-posture.json'),'utf8'))];
 for(const e of events){assert.ok(h03Helpers.parseCometMedicalPosture(e.medicalPosture),JSON.stringify(e));checks++;}
}
for(const change of [{state:'magic'},{state:'ended',applied:true},{state:'waiting-weapon'},{state:'settling',weaponReady:false},{validFor:2},{applied:false,validFor:1},{stableFor:Infinity},{tilt:NaN},{resumeDelay:2},{neutral:'yes'},{alternatives:Array(5).fill('x')},{reason:'x'.repeat(513)}]){assert.equal(h03Helpers.parseCometMedicalPosture({...h03Trace,...change}),null,JSON.stringify(change));checks++;}
assert.equal(ready([h03Row(1,1000,{}, {decision:'MedicalChoice'})]).events.length,0);checks++;
console.log(`${checks} COMET map checks passed (including H03)`);
// Appended to RR's existing test runner, sharing its real TS loader and fixtures.
const h04Helpers=load('../Private/src/helpers/cometPostCombat.ts');
const h04Trace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/h04-post-combat.json'),'utf8')).postCombat;
const h04Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','PostCombat',{feature:'H04',detail:{botInstance:'instance',postCombat:{...h04Trace,...changes}},...extra});
{
 const ended={state:'ended',reason:'post-combat-work-complete',applied:false,validFor:0};
 const r=ready([h04Row(1,1000),h04Row(2,1500,{state:'medical',medicalUseful:true,medicalBusy:true}),h04Row(3,2000,ended)]);
 const v=state(r,1100,'SAIN:Freeze',900,false);assert.ok(v.postCombat&&v.active&&v.actionActive);assert.equal(v.decision,'COMET:PostCombatWatch');assert.match(tooltip(v),/Post-combat recovery - H04/);assert.match(tooltip(v),/Remembered contact/);checks++;
 const med=state(r,1600,'COMET:PostCombatMedical',1500,false);assert.equal(med.decision,'COMET:PostCombatMedical');assert.match(tooltip(med),/medicine active: yes/);checks++;
 assert.equal(state(r,1600,'SAIN:StandAndShoot',1590,false).decision,'SAIN:StandAndShoot');checks++;
 assert.equal(state(r,2000,'COMET:PostCombatMedical',1500,false).postCombat,undefined);assert.equal(state(r,2000,'COMET:PostCombatMedical',1500,false).decision,'');assert.ok(state(r,1100,'SAIN:Freeze',900,false).postCombat);checks++;
 for(const at of [999,2000,50000]){assert.equal(state(ready([h04Row(1,1000)]),at,'COMET:PostCombatWatch',900,false).postCombat,undefined);checks++;}
 assert.equal(state(r,1100,'COMET:PostCombatWatch',1000,true).postCombat,undefined);checks++;
 for(const extra of [{cometSession:'other'},{detail:{botInstance:'other',combatLean:leanTrace}}]){assert.equal(state(ready([h04Row(1,1000),leanRow(2,1020,{},extra)]),1100,'SAIN:Freeze',900,false).postCombat,undefined);checks++;}
 const x=state(ready([h04Row(1,1000,{reason:'<script>x</script>',contact:'<img src=x>',execution:'<img onerror=x>'})]),1100,'SAIN:Freeze',900,false);assert.ok(x.postCombat);assert.ok(!tooltip(x).includes('<img'));assert.ok(!tooltip(x).includes('<script>'));checks++;
 const wire=path.join(__dirname,'../../COMET/artifacts/h04-adapter-events.jsonl');const events=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):[JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/h04-post-combat.json'),'utf8'))];
 for(const e of events){assert.ok(h04Helpers.parseCometPostCombat(e.postCombat),JSON.stringify(e));checks++;}
 const behavior=load('../Private/src/helpers/botBehavior.ts');
 for(const [stage,category] of Object.entries({Cover:'cover',Medical:'medical',Reload:'other',Hands:'other',Watch:'guard',Regroup:'movement',Check:'search'})){
 assert.equal(behavior.getBehaviorCategory('COMET:PostCombat'+stage).key,category);assert.match(behavior.formatDecisionLabel('COMET:PostCombat'+stage),/Recovery:/);checks++;}
}
for(const change of [{state:'magic'},{state:'ended',applied:true},{validFor:2},{applied:false,validFor:1},{remaining:Infinity},{elapsed:NaN},{advanceChance:101},{episode:.5},{medicalBusy:'yes'},{alternatives:Array(5).fill('x')},{reason:'x'.repeat(513)},{x:null,y:4,z:5}]){assert.equal(h04Helpers.parseCometPostCombat({...h04Trace,...change}),null,JSON.stringify(change));checks++;}
assert.equal(ready([h04Row(1,1000,{}, {decision:'MedicalChoice'})]).events.length,0);checks++;
console.log(`${checks} COMET map checks passed (including H04)`);
const h05Helpers=load('../Private/src/helpers/cometReadyStance.ts');
const h05Trace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/h05-ready-stance.json'),'utf8')).readyStance;
const h05Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','ReadyStance',{feature:'H05',detail:{botInstance:'instance',readyStance:{...h05Trace,...changes}},...extra});
{
 const ended={state:'expired',reason:'ready-stance-window-ended',applied:false,validFor:0,requested:false,remaining:0};
 const r=ready([h05Row(1,1000),h05Row(2,1500,{state:'suspended',reason:'ready-stance-medicine',applied:false,validFor:0,requested:false}),h05Row(3,2000),h05Row(4,2500,ended)]);
 for(const decision of ['SAIN:Search','ORBIT:Loot']){
  const v=state(r,1100,decision,900,false);assert.ok(v.readyStance&&v.active);assert.equal(v.decision,decision);assert.equal(v.actionActive,false);assert.match(tooltip(v),/Weapon ready after combat - H05/);assert.match(tooltip(v),/raised posture observed: yes/);assert.match(tooltip(v),/Combat, objectives and Ghost eligibility: unchanged/);checks++;
 }
 const combined=state(ready([h04Row(10,1000),h05Row(11,1020)]),1100,'COMET:PostCombatWatch',1000,false);assert.ok(combined.readyStance&&combined.postCombat&&combined.actionActive);assert.equal(combined.decision,'COMET:PostCombatWatch');checks++;
 assert.equal(state(r,1600,'SAIN:FirstAid',1500,false).readyStance,undefined);assert.ok(state(r,2100,'SAIN:Patrol',2000,false).readyStance);assert.equal(state(r,2500,'SAIN:Patrol',2500,false).readyStance,undefined);assert.ok(state(r,1100,'SAIN:Patrol',1000,false).readyStance);checks++;
 for(const at of [999,2000,50000]){assert.equal(state(ready([h05Row(1,1000)]),at,'SAIN:Patrol',1000,false).readyStance,undefined);checks++;}
 assert.equal(state(r,1100,'SAIN:Patrol',1000,true).readyStance,undefined);checks++;
 for(const extra of [{cometSession:'other'},{detail:{botInstance:'other',combatLean:leanTrace}}]){assert.equal(state(ready([h05Row(1,1000),leanRow(2,1020,{},extra)]),1100,'SAIN:Patrol',1000,false).readyStance,undefined);checks++;}
 for(const stateName of ['pending','native','released','suspended']){assert.equal(state(ready([h05Row(1,1000,{state:stateName,applied:false,validFor:0,requested:stateName==='pending',observedRaised:false})]),1100,'SAIN:Patrol',1000,false).readyStance,undefined);checks++;}
 const x=state(ready([h05Row(1,1000,{reason:'<script>x</script>',contact:'<img src=x>',evidence:'<img onerror=x>'})]),1100,'SAIN:Patrol',1000,false);assert.ok(x.readyStance);assert.ok(!tooltip(x).includes('<img'));assert.ok(!tooltip(x).includes('<script>'));checks++;
 const wire=path.join(__dirname,'../../COMET/artifacts/h05-adapter-events.jsonl');const events=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):[JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/h05-ready-stance.json'),'utf8'))];
 for(const e of events){assert.ok(h05Helpers.parseCometReadyStance(e.readyStance),JSON.stringify(e));checks++;}
}
for(const change of [{state:'magic'},{state:'expired',applied:true},{validFor:2},{applied:false,validFor:1},{remaining:Infinity},{sinceFight:NaN},{cueAge:-1},{nativePatrol:false},{observedRaised:false},{requested:false},{remaining:.1,validFor:1},{alternatives:Array(5).fill('x')},{reason:'x'.repeat(513)},{distance:Infinity}]){assert.equal(h05Helpers.parseCometReadyStance({...h05Trace,...change}),null,JSON.stringify(change));checks++;}
assert.equal(ready([h05Row(1,1000,{}, {decision:'MedicalChoice'})]).events.length,0);checks++;
console.log(`${checks} COMET map checks passed (including H05)`);

const s01Helpers=load('../Private/src/helpers/cometCrossfire.ts');
const s01Trace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/s01-crossfire.json'),'utf8')).crossfire;
const s01Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','Crossfire',{feature:'S01',detail:{botInstance:'instance',crossfire:{...s01Trace,...changes}},...extra});
{
 const r=ready([s01Row(1,1000),s01Row(2,1500,{state:'holding'}),s01Row(3,2000,{state:'ended',applied:false,reserved:false,validFor:0})]);
 for(const [at,stage,category] of [[1100,'Moving','movement'],[1600,'Holding','guard']]){
  const v=state(r,at,'COMET:Crossfire'+stage,1000,false);assert.ok(v.crossfire&&v.active&&v.actionActive);assert.equal(v.decision,'COMET:Crossfire'+stage);assert.equal(getBehaviorCategory(v.decision).key,category);assert.match(tooltip(v),/Squad crossfire angles - S01/);assert.match(tooltip(v),/Supporting teammate/);assert.match(tooltip(v),/Known contact/);checks++;
 }
 assert.equal(state(r,2000,'SAIN:Search',2000,false).crossfire,undefined);assert.ok(state(r,1100,'COMET:CrossfireMoving',1000,false).crossfire);checks++;
 for(const at of [999,2000,50000]){const v=state(ready([s01Row(1,1000)]),at,'COMET:CrossfireMoving',1000,false);assert.equal(v.crossfire,undefined);assert.equal(v.actionActive,false);checks++;}
 assert.equal(state(r,1100,'COMET:CrossfireMoving',1000,true).crossfire,undefined);checks++;
 assert.equal(state(r,1200,'SAIN:StandAndShoot',1150,false).crossfire,undefined);checks++;
 for(const extra of [{cometSession:'other'},{detail:{botInstance:'other',combatLean:leanTrace}}]){assert.equal(state(ready([s01Row(1,1000),leanRow(2,1020,{},extra)]),1100,'COMET:CrossfireMoving',1000,false).crossfire,undefined);checks++;}
 for(const st of ['planning','ready','ended']){const v=state(ready([s01Row(1,1000,{state:st,applied:false,reserved:st==='ready',validFor:0})]),1100,'SAIN:Search',1000,false);assert.equal(v.crossfire,undefined);assert.equal(v.decision,'SAIN:Search');checks++;}
 const x=state(ready([s01Row(1,1000,{reason:'<script>x</script>',supportName:'<img src=x>',contact:'<b>x</b>',alternatives:['<img onerror=x>']})]),1100,'COMET:CrossfireMoving',1000,false);assert.ok(x.crossfire);assert.ok(!tooltip(x).includes('<img'));assert.ok(!tooltip(x).includes('<script>'));assert.match(tooltip(x),/Rejected alternative/);checks++;
 const wire=path.join(__dirname,'../../COMET/artifacts/s01-adapter-events.jsonl');const data=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):[JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/s01-crossfire.json'),'utf8'))];
 const observed=data.filter(e=>e.crossfire);assert.ok(observed.length>0,'crossfire adapter trace contains observations');
 for(const e of observed){assert.ok(s01Helpers.parseCometCrossfire(e.crossfire),JSON.stringify(e));checks++;}
}
for(const change of [{state:'teleported'},{applied:'yes'},{reserved:false},{validFor:2},{validFor:0},{remaining:NaN},{angle:181},{pathLength:61},{roll:-1},{chance:101},{candidates:73},{x:Infinity},{goalY:null},{state:'ended'},{state:'ready'},{applied:false,validFor:1},{episode:0},{alternatives:Array(9).fill('x')},{supportName:'x'.repeat(513)}]){assert.equal(s01Helpers.parseCometCrossfire({...s01Trace,...change}),null,JSON.stringify(change));checks++;}
assert.equal(ready([s01Row(1,1000,{}, {decision:'PostCombat'})]).events.length,0);checks++;
const s02Fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/s02-secondary-entrance.json'),'utf8'));
const s02Trace=s02Fixture.crossfire;
const s02Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','Crossfire',{feature:'S02',detail:{botInstance:'instance',crossfire:{...s02Trace,...changes}},...extra});
for(const [stage,outer,label,category] of [['moving','moving','EntranceMoving','movement'],['watching','holding','EntranceWatching','guard'],['opening','holding','EntranceWatching','guard'],['entering','moving','EntranceEntering','movement']]) {
 const trace={state:outer,entrance:{...s02Trace.entrance,state:stage}};
 const r=ready([s02Row(1,1000,trace)]);const d='COMET:Crossfire'+label;
 const v=state(r,1100,d,1000,false);
 assert.ok(v.crossfire?.entrance&&v.active&&v.actionActive);assert.equal(v.decision,d);assert.equal(getBehaviorCategory(d).key,category);
 for(const text of ['Secondary entrance - S02','Supporting teammate','Known contact','Partner:','Primary access:','Entry:','threshold','Watch:'])assert.ok(tooltip(v).includes(text),text);
 for(const at of [999,2000,50000])assert.equal(state(r,at,d,1000,false).crossfire,undefined);
 assert.equal(state(r,1100,d,1000,true).crossfire,undefined);
 assert.equal(state(r,1200,'SAIN:StandAndShoot',1150,false).crossfire,undefined);checks+=14;
}
{
 const r=ready([s02Row(1,1000),s02Row(2,1200,{state:'ended',applied:false,reserved:false,validFor:0,entrance:{...s02Trace.entrance,state:'ended'}})]);
 assert.ok(state(r,1100,'COMET:CrossfireEntranceEntering',1000,false).crossfire);
 assert.equal(state(r,1200,'COMET:CrossfireEntranceEntering',1000,false).crossfire,undefined);checks+=2;
 for(const extra of [{cometSession:'other'},{detail:{botInstance:'other',combatLean:leanTrace}}]){assert.equal(state(ready([s02Row(1,1000),leanRow(2,1020,{},extra)]),1100,'COMET:CrossfireEntranceEntering',1000,false).crossfire,undefined);checks++;}
 const escaped=state(ready([s02Row(1,1000,{entrance:{...s02Trace.entrance,primary:'<script>x</script>',supportStatus:'<img src=x>',entryReason:'<img onerror=x>'}})]),1100,'COMET:CrossfireEntranceEntering',1000,false);
 assert.ok(escaped.crossfire);assert.ok(!tooltip(escaped).includes('<img'));assert.ok(!tooltip(escaped).includes('<script>'));checks+=3;
 for(const e of [null,undefined]){assert.equal(state(ready([s02Row(1,1000,{entrance:e})]),1100,'COMET:CrossfireEntranceEntering',1000,false).crossfire,undefined);checks++;}
 assert.equal(state(ready([s02Row(1,1000,{}, {feature:'S01'})]),1100,'COMET:CrossfireEntranceEntering',1000,false).crossfire,undefined);checks++;
}
for(const change of [{state:'teleported'},{watchDuration:0},{watchRemaining:41},{entryRoll:-1},{entryChance:101},{ammo:NaN},{rolled:1},{openObserved:'yes'},{passageX:Infinity},{primary:'x'.repeat(513)},{state:'ended'},{state:'watching'}]){assert.equal(s01Helpers.parseCometCrossfire({...s02Trace,entrance:{...s02Trace.entrance,...change}}),null,JSON.stringify(change));checks++;}
for(const change of [{candidates:49},{remaining:49},{entrance:[]},{entrance:{}},{state:'holding'}]){assert.equal(s01Helpers.parseCometCrossfire({...s02Trace,...change}),null,JSON.stringify(change));checks++;}
{
 const wire=path.join(__dirname,'../../COMET/artifacts/s02-adapter-events.jsonl');const data=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):[s02Fixture];
 const observed=data.filter(e=>e.crossfire);assert.ok(observed.length>0,'crossfire adapter trace contains observations');
 for(const e of observed){assert.ok(s01Helpers.parseCometCrossfire(e.crossfire),JSON.stringify(e));checks++;}
}
console.log(`${checks} COMET map checks passed (including S01/S02)`);

const s03Fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/s03-squad-maneuver.json'),'utf8'));
const s03Trace=s03Fixture.crossfire;
const s03Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','Crossfire',{feature:'S03',detail:{botInstance:'instance',crossfire:{...s03Trace,...changes}},...extra});
{
 const r=ready([s03Row(1,1000),s03Row(2,2000,{state:'ended',applied:false,reserved:false,validFor:0,maneuver:{...s03Trace.maneuver,state:'ended'}})]);
 const v=state(r,1100,'SAIN:Freeze',900,false);assert.equal(v.decision,'COMET:CrossfireManeuverMoving');assert.match(tooltip(v),/Squad support and flanking - S03/);assert.match(tooltip(v),/Squadmate:/);checks++;
 assert.ok(state(r,1100,'SAIN:Freeze',900,true).crossfire===undefined);assert.equal(state(r,2000,'COMET:CrossfireManeuverMoving',1500,false).crossfire,undefined);checks++;
 assert.equal(state(r,1700,'SAIN:StandAndShoot',1600,false).decision,'SAIN:StandAndShoot');checks++;
 assert.ok(state(r,1100,'SAIN:Freeze',900,false).crossfire);checks++;
 const escaped=state(ready([s03Row(1,1000,{maneuver:{...s03Trace.maneuver,supportName:'<img onerror=x>',members:['<script>x</script>','other']}})]),1100,'SAIN:Freeze',900,false);
 assert.ok(!tooltip(escaped).includes('<script>')&&!tooltip(escaped).includes('<img'));checks++;
 const behavior=load('../Private/src/helpers/botBehavior.ts');
 for(const [name,cat] of Object.entries({Moving:'movement',Holding:'guard',Supporting:'guard',Suppressing:'combat',Rear:'guard'})){
  assert.equal(behavior.getBehaviorCategory('COMET:CrossfireManeuver'+name).key,cat);checks++;
 }
 for(const bad of [{state:'bad'},{role:'bad'},{confirmed:false},{remaining:NaN},{shots:-1},{shots:1.5},{members:[]},{members:Array(17).fill('x')},{plan:''},{supportReady:'yes'}]){
  assert.equal(s01Helpers.parseCometCrossfire({...s03Trace,maneuver:{...s03Trace.maneuver,...bad}}),null,JSON.stringify(bad));checks++;
 }
 const wire=path.join(__dirname,'../../COMET/artifacts/s03-adapter-events.jsonl');const data=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):[s03Fixture];
 const observed=data.filter(e=>e.crossfire);assert.ok(observed.length>0,'crossfire adapter trace contains observations');
 for(const e of observed){assert.ok(s01Helpers.parseCometCrossfire(e.crossfire),JSON.stringify(e));checks++;}
 for(const extra of [{feature:'S01'},{feature:'S02'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([s03Row(1,1000,{},extra)]).events.length,0);checks++;}
}
console.log(`${checks} COMET map checks passed (including S03)`);

const s04Fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/s04-cover-mate.json'),'utf8'));
const s04Trace=s04Fixture.crossfire;
const s04Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','Crossfire',{feature:'S04',detail:{botInstance:'instance',crossfire:{...s04Trace,...changes}},...extra});
{
 const ended={state:'ended',applied:false,reserved:false,validFor:0,coverMate:{...s04Trace.coverMate,status:'ended',confirmed:false,weaponReady:true}};
 const r=ready([s04Row(1,1000),s04Row(2,2000,ended)]);
 const v=state(r,1100,'SAIN:Freeze',900,false);assert.equal(v.decision,'COMET:CrossfireCoverMateHolding');assert.match(tooltip(v),/Cover a busy teammate - S04/);assert.match(tooltip(v),/Reload/);assert.match(tooltip(v),/facing confirmed/);checks+=4;
 assert.ok(v.crossfire.coverMate.remaining<s04Trace.coverMate.remaining);checks++;
 assert.equal(state(r,1100,'SAIN:Freeze',900,true).crossfire,undefined);checks++;
 assert.equal(state(r,2000,'COMET:CrossfireCoverMateHolding',1500,false).crossfire,undefined);checks++;
 assert.equal(state(r,1700,'SAIN:StandAndShoot',1600,false).decision,'SAIN:StandAndShoot');checks++;
 assert.ok(state(r,1100,'SAIN:Freeze',900,false).crossfire);checks++;
 assert.equal(state(ready([s04Row(1,1000)]),2000,'COMET:CrossfireCoverMateHolding',1000,false).crossfire,undefined);checks++;
 for(const field of ['mateName','sector','reason']){
  const escaped=state(ready([s04Row(1,1000,{coverMate:{...s04Trace.coverMate,[field]:'<img src=x onerror=x>'}})]),1100,'SAIN:Freeze',900,false);
  assert.ok(!tooltip(escaped).includes('<img'));checks++;
 }
 const behavior=load('../Private/src/helpers/botBehavior.ts');
 for(const [name,cat] of Object.entries({Moving:'movement',Holding:'guard'})){
  assert.equal(behavior.getBehaviorCategory('COMET:CrossfireCoverMate'+name).key,cat);checks++;
 }
 for(const bad of [{status:'bad'},{operation:''},{confirmed:false},{remaining:NaN},{remaining:91},{protectors:-1},{protectors:4},{protectors:1.5},{mate:''},{sector:''},{weaponReady:'yes'},{stalled:true},{operationAge:-1},{separation:Infinity},{treatment:'Loot'}]){
  assert.equal(s01Helpers.parseCometCrossfire({...s04Trace,coverMate:{...s04Trace.coverMate,...bad}}),null,JSON.stringify(bad));checks++;
 }
 for(const changes of [{maneuver:s03Trace.maneuver},{entrance:JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/s02-secondary-entrance.json'),'utf8')).crossfire.entrance},{applied:true,state:'holding',coverMate:{...s04Trace.coverMate,status:'selected',confirmed:false}}]){
  assert.equal(s01Helpers.parseCometCrossfire({...s04Trace,...changes}),null);checks++;
 }
 const pending={...s04Trace,applied:false,validFor:0,coverMate:{...s04Trace.coverMate,status:'awaiting facing',confirmed:false}};
 assert.ok(s01Helpers.parseCometCrossfire(pending));checks++;
 assert.equal(state(ready([s04Row(1,1000,pending)]),1100,'SAIN:Freeze',900,false).crossfire,undefined);checks++;
 const long={...s04Trace,remaining:60,coverMate:{...s04Trace.coverMate,treatment:'Surgery',remaining:60}};
 assert.ok(s01Helpers.parseCometCrossfire(long));checks++;
 const moving={...s04Trace,state:'moving',coverMate:{...s04Trace.coverMate,status:'moving',confirmed:false}};
 assert.equal(state(ready([s04Row(1,1000,moving)]),1100,'SAIN:Freeze',900,false).decision,'COMET:CrossfireCoverMateMoving');checks++;
 const wire=path.join(__dirname,'../../COMET/artifacts/s04-adapter-events.jsonl');const data=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):[s04Fixture];
 const observed=data.filter(e=>e.crossfire);assert.ok(observed.length>0,'crossfire adapter trace contains observations');
 for(const e of observed){assert.ok(s01Helpers.parseCometCrossfire(e.crossfire),JSON.stringify(e));checks++;}
 for(const extra of [{feature:'S01'},{feature:'S02'},{feature:'S03'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([s04Row(1,1000,{},extra)]).events.length,0);checks++;}
}
console.log(`${checks} COMET map checks passed (including S04)`);

const s05Fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/s05-squad-trade.json'),'utf8'));
const s05Trace=s05Fixture.crossfire;
const s05Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','Crossfire',{feature:'S05',detail:{botInstance:'instance',crossfire:{...s05Trace,...changes}},...extra});
{
 const ended={state:'ended',applied:false,reserved:false,validFor:0,trade:{...s05Trace.trade,status:'ended',confirmed:false}};
 const r=ready([s05Row(1,1000),s05Row(2,2000,ended)]);
 const v=state(r,1100,'SAIN:Freeze',900,false);assert.equal(v.decision,'COMET:CrossfireTradeWatching');assert.match(tooltip(v),/Teammate death reaction - S05/);assert.match(tooltip(v),/Lost teammate/);assert.match(tooltip(v),/facing confirmed/);checks+=4;
 assert.ok(v.crossfire.trade.remaining<s05Trace.trade.remaining&&v.crossfire.trade.deathAge>s05Trace.trade.deathAge);checks++;
 assert.equal(state(r,1100,'SAIN:Freeze',900,true).crossfire,undefined);checks++;
 assert.equal(state(r,2000,'COMET:CrossfireTradeWatching',1500,false).crossfire,undefined);checks++;
 assert.equal(state(r,1700,'SAIN:StandAndShoot',1600,false).decision,'SAIN:StandAndShoot');checks++;
 assert.equal(state(ready([s05Row(1,1000)]),2000,'COMET:CrossfireTradeWatching',1000,false).crossfire,undefined);checks++;
 for(const field of ['mateName','evidence','reason']){
  const escaped=state(ready([s05Row(1,1000,{trade:{...s05Trace.trade,[field]:'<img src=x onerror=x>'}})]),1100,'SAIN:Freeze',900,false);
  assert.ok(!tooltip(escaped).includes('<img'));checks++;
 }
 const behavior=load('../Private/src/helpers/botBehavior.ts');
 for(const [name,cat] of Object.entries({Pushing:'movement',Moving:'movement',Watching:'guard'})){assert.equal(behavior.getBehaviorCategory('COMET:CrossfireTrade'+name).key,cat);checks++;}
 for(const bad of [{status:'bad'},{death:''},{confirmed:false},{remaining:NaN},{remaining:31},{roll:101},{delay:6},{ammo:-1},{mate:''},{confidence:'known automatically'},{choice:'charge'},{deathAge:-1}]){
  assert.equal(s01Helpers.parseCometCrossfire({...s05Trace,trade:{...s05Trace.trade,...bad}}),null,JSON.stringify(bad));checks++;
 }
 for(const changes of [{maneuver:s03Trace.maneuver},{coverMate:s04Trace.coverMate},{applied:true,state:'holding',trade:{...s05Trace.trade,status:'selected',confirmed:false}}]){assert.equal(s01Helpers.parseCometCrossfire({...s05Trace,...changes}),null);checks++;}
 const pending={...s05Trace,applied:false,validFor:0,trade:{...s05Trace.trade,status:'awaiting facing',confirmed:false}};
 assert.ok(s01Helpers.parseCometCrossfire(pending));checks++;
 assert.equal(state(ready([s05Row(1,1000,pending)]),1100,'SAIN:Freeze',900,false).crossfire,undefined);checks++;
 const moving={...s05Trace,state:'moving',trade:{...s05Trace.trade,status:'moving',choice:'push',confirmed:false}};
 assert.equal(state(ready([s05Row(1,1000,moving)]),1100,'SAIN:Freeze',900,false).decision,'COMET:CrossfireTradePushing');checks++;
 assert.equal(s01Helpers.parseCometCrossfire({...moving,trade:{...moving.trade,confidence:'sector only'}}),null);checks++;
 const wire=path.join(__dirname,'../../COMET/artifacts/s05-adapter-events.jsonl');const data=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):[s05Fixture];
 const observed=data.filter(e=>e.crossfire);assert.ok(observed.length>0,'crossfire adapter trace contains observations');
 for(const e of observed){assert.ok(s01Helpers.parseCometCrossfire(e.crossfire),JSON.stringify(e));checks++;}
 for(const extra of [{feature:'S01'},{feature:'S02'},{feature:'S03'},{feature:'S04'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([s05Row(1,1000,{},extra)]).events.length,0);checks++;}
}

const s06Fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/s06-squad-storm.json'),'utf8'));
const s06Trace=s06Fixture.crossfire;
const s06Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','Crossfire',{feature:'S06',detail:{botInstance:'instance',crossfire:{...s06Trace,...changes}},...extra});
{
 const ended={state:'ended',applied:false,reserved:false,validFor:0,storm:{...s06Trace.storm,state:'ended',status:'ended',confirmed:false}};
 const r=ready([s06Row(1,1000),s06Row(2,2000,ended)]);
 const v=state(r,1100,'SAIN:Freeze',900,false);assert.equal(v.decision,'COMET:CrossfireStormMoving');assert.match(tooltip(v),/Coordinated squad assault - S06/);assert.match(tooltip(v),/Observed weakness/);assert.match(tooltip(v),/Ready attackers/);assert.match(tooltip(v),/native movement confirmed/);checks+=5;
 assert.ok(v.crossfire.storm.remaining<s06Trace.storm.remaining&&v.crossfire.storm.evidenceAge>s06Trace.storm.evidenceAge);checks++;
 assert.equal(state(r,1100,'SAIN:Freeze',900,true).crossfire,undefined);checks++;
 assert.equal(state(r,1500,'SAIN:StandAndShoot',1200,false).crossfire,undefined);checks++;
 assert.equal(state(r,2100,'COMET:CrossfireStormMoving',1500,false).crossfire,undefined);checks++;
 assert.equal(state(ready([s06Row(1,1000)]),2100,'COMET:CrossfireStormMoving',1000,false).crossfire,undefined);checks++;
 for(const changes of [{storm:{...s06Trace.storm,confirmed:false}},{storm:{...s06Trace.storm,state:'preparing'}},{storm:{...s06Trace.storm,score:2}},{storm:{...s06Trace.storm,required:1}},{storm:{...s06Trace.storm,departure:-1}},{trade:s05Trace.trade},{maneuver:s03Trace.maneuver},{coverMate:s04Trace.coverMate}]){assert.equal(s01Helpers.parseCometCrossfire({...s06Trace,...changes}),null);checks++;}
 const pending={state:'ready',applied:false,validFor:0,storm:{...s06Trace.storm,state:'preparing',status:'ready',confirmed:false,departure:-1}};
 assert.ok(s01Helpers.parseCometCrossfire({...s06Trace,...pending}));checks++;
 assert.equal(state(ready([s06Row(1,1000,pending)]),1100,'SAIN:Freeze',900,false).crossfire,undefined);checks++;
 for(const field of ['reason','observer','plan']){const escaped=state(ready([s06Row(1,1000,{storm:{...s06Trace.storm,[field]:'<img src=x onerror=x>'}})]),1100,'SAIN:Freeze',900,false);assert.ok(!tooltip(escaped).includes('<img'));checks++;}
 const behavior=load('../Private/src/helpers/botBehavior.ts');
 assert.equal(behavior.getBehaviorCategory('COMET:CrossfireStormMoving').key,'movement');checks++;
 assert.equal(ready([s06Row(1,1000,{}, {feature:'S05'})]).events.length,0);checks++;
}
// Feed every real production adapter event through the replay validator.
const s06AdapterEvents=path.resolve(__dirname,'../../COMET/artifacts/s06-adapter-events.jsonl');
if(fs.existsSync(s06AdapterEvents))for(const line of fs.readFileSync(s06AdapterEvents,'utf8').trim().split(/\r?\n/)){
 const e=JSON.parse(line);if(e.feature!=='S06'||e.stage==='eligibility')continue;
 assert.ok(s01Helpers.parseCometCrossfire(e.crossfire),JSON.stringify(e.crossfire));checks++;
}
console.log(`${checks} COMET map checks passed (including S06)`);
const s07Fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/s07-fire-lane.json'),'utf8'));
const s07Trace=s07Fixture.fireLane;
const s07Helpers=load('../Private/src/helpers/cometFireLane.ts');
const s07Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','FireLane',{feature:'S07',detail:{botInstance:'instance',fireLane:{...s07Trace,...changes}},...extra});
{
 const ended={state:'ended',applied:false,confirmed:false,validFor:0};
 const r=ready([s07Row(1,1000),s07Row(2,1150,ended)]);
 const v=state(r,1100,'SAIN:Search',900,false);
 assert.equal(v.decision,'SAIN:Search');assert.equal(v.actionActive,false);assert.ok(v.fireLane);assert.ok(v.active);checks+=4;
 assert.match(tooltip(v),/Allied firing lanes - S07/);assert.match(tooltip(v),/Actual shot/);assert.match(tooltip(v),/lateral movement observed/);checks+=3;
 assert.equal(getBehaviorCategory(v.decision).key,getBehaviorCategory('SAIN:Search').key);checks++;
 assert.equal(state(r,1100,'SAIN:Search',900,true).fireLane,undefined);checks++;
 assert.equal(state(r,1100,'SAIN:StandAndShoot',1090,false).fireLane,undefined);checks++;
 assert.equal(state(r,1160,'SAIN:Search',900,false).fireLane,undefined);checks++;
 assert.equal(state(ready([s07Row(1,1000)]),1300,'SAIN:Search',900,false).fireLane,undefined);checks++;
 const pending={confirmed:false,validFor:0};assert.ok(s07Helpers.parseCometFireLane({...s07Trace,...pending}));checks++;
 assert.equal(state(ready([s07Row(1,1000,pending)]),1100,'SAIN:Search',900,false).fireLane,undefined);checks++;
 for(const key of ['shooterName','reason','execution']){
  const html=tooltip(state(ready([s07Row(1,1000,{[key]:'<img src=x onerror=x>'})]),1100,'SAIN:Search',900,false));assert.ok(!html.includes('<img'));checks++;
 }
 for(const extra of [{feature:'S01'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([s07Row(1,1000,{},extra)]).events.length,0);checks++;}
 for(const bad of [{confirmed:false},{applied:false},{state:'ended'},{width:NaN},{shotAge:-1},{side:'forward'},{validFor:1},{context:''},{shooter:''},{speed:Infinity}]){assert.equal(s07Helpers.parseCometFireLane({...s07Trace,...bad}),null);checks++;}
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',contact:{target:'enemy',age:0,source:'heard'}}}]){
  assert.equal(state(ready([s07Row(1,1000),row(2,1050,'selected','Hold',extra)]),1100,'SAIN:Search',900,false).fireLane,undefined);checks++;
 }
 const wire=path.resolve(__dirname,'../../COMET/artifacts/s07-adapter-events.jsonl');
 const data=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):[s07Fixture];
 for(const e of data){
  // Opportunity diagnostics are not applied actions and must not create a replay overlay.
  if(e.fireLane.opportunityOnly)assert.equal(s07Helpers.parseCometFireLane(e.fireLane),null);
  else assert.ok(s07Helpers.parseCometFireLane(e.fireLane),JSON.stringify(e.fireLane));
  checks++;
 }
}
console.log(`${checks} COMET map checks passed (including S07)`);

const s08Fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/s08-squad-fire.json'),'utf8'));
const s08Trace=s08Fixture.squadFire;
const s08Helpers=load('../Private/src/helpers/cometSquadFire.ts');
const s08Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','SquadFire',{feature:'S08',detail:{botInstance:'instance',squadFire:{...s08Trace,...changes}},...extra});
{
 const ended={state:'ended',applied:false,stopRequested:false,stopped:false,startPrevented:false,validFor:0};
 const r=ready([s08Row(1,1000),s08Row(2,1150,ended)]);
 const v=state(r,1100,'SAIN:StandAndShoot',900,false);
 assert.equal(v.decision,'SAIN:StandAndShoot');assert.equal(v.actionActive,false);assert.ok(v.squadFire);assert.ok(v.active);checks+=4;
 assert.match(tooltip(v),/Protect squad while firing - S08/);assert.match(tooltip(v),/Current body/);assert.match(tooltip(v),/new trigger request blocked/);checks+=3;
 assert.equal(getBehaviorCategory(v.decision).key,getBehaviorCategory('SAIN:StandAndShoot').key);checks++;
 assert.equal(state(r,1100,'SAIN:StandAndShoot',900,true).squadFire,undefined);checks++;
 assert.equal(state(r,1100,'SAIN:Search',1090,false).squadFire,undefined);checks++;
 assert.equal(state(r,1160,'SAIN:StandAndShoot',900,false).squadFire,undefined);checks++;
 assert.equal(state(ready([s08Row(1,1000)]),1300,'SAIN:StandAndShoot',900,false).squadFire,undefined);checks++;
 const pending={applied:true,stopRequested:true,stopped:false,startPrevented:false,validFor:0};assert.ok(s08Helpers.parseCometSquadFire({...s08Trace,...pending}));checks++;
 assert.equal(state(ready([s08Row(1,1000,pending)]),1100,'SAIN:StandAndShoot',900,false).squadFire,undefined);checks++;
 const stopped={applied:true,stopRequested:true,stopped:true,startPrevented:false,execution:'trigger release observed'};
 assert.ok(state(ready([s08Row(1,1000,stopped)]),1100,'SAIN:StandAndShoot',900,false).squadFire);checks++;
 for(const key of ['allyName','reason','execution','geometry']){
  const html=tooltip(state(ready([s08Row(1,1000,{[key]:'<img src=x onerror=x>'})]),1100,'SAIN:StandAndShoot',900,false));assert.ok(!html.includes('<img'));checks++;
 }
 for(const extra of [{feature:'S01'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([s08Row(1,1000,{},extra)]).events.length,0);checks++;}
 for(const bad of [{startPrevented:false},{applied:false},{stopped:true,stopRequested:false},{state:'ended'},{radius:NaN},{clearFor:-1},{kind:'enemy'},{validFor:1},{ally:''},{speed:Infinity}]){assert.equal(s08Helpers.parseCometSquadFire({...s08Trace,...bad}),null);checks++;}
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',contact:{target:'enemy',age:0,source:'heard'}}}]){
  assert.equal(state(ready([s08Row(1,1000),row(2,1050,'selected','Hold',extra)]),1100,'SAIN:StandAndShoot',900,false).squadFire,undefined);checks++;
 }
 const wire=path.resolve(__dirname,'../../COMET/artifacts/s08-adapter-events.jsonl');
 const data=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):[s08Fixture];
 for(const e of data){assert.ok(s08Helpers.parseCometSquadFire(e.squadFire),JSON.stringify(e.squadFire));checks++;}
}
console.log(`${checks} COMET map checks passed (including S08)`);

const s09Fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/s09-squad-voice.json'),'utf8'));
const s09Trace=s09Fixture.squadVoice;
const s09Helpers=load('../Private/src/helpers/cometSquadVoice.ts');
const s09Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','SquadVoice',{feature:'S09',detail:{botInstance:'instance',squadVoice:{...s09Trace,...changes}},...extra});
{
 const r=ready([s09Row(1,1000)]);const v=state(r,1100,'SAIN:StandAndShoot',900,false);
 assert.equal(v.decision,'SAIN:StandAndShoot');assert.equal(v.actionActive,false);assert.ok(v.active);assert.ok(v.squadVoice);checks+=4;
 assert.match(tooltip(v),/Squad voice - S09/);assert.match(tooltip(v),/filtered/);assert.match(tooltip(v),/SAIN keeps combat ownership/);checks+=3;
 assert.equal(getBehaviorCategory(v.decision).key,getBehaviorCategory('SAIN:StandAndShoot').key);checks++;
 for(const [at,action,ghost] of [[3100,'SAIN:StandAndShoot',false],[1100,'SAIN:Search',false],[1100,'SAIN:StandAndShoot',true],[999,'SAIN:StandAndShoot',false]]){assert.equal(state(r,at,action,900,ghost).squadVoice,undefined);checks++;}
 for(const pending of ['requested','queued','native-declined','native-no-voice','native-not-played','released','superseded']){
  const change={state:pending,filtered:false,played:false,validFor:0};assert.ok(s09Helpers.parseCometSquadVoice({...s09Trace,...change}));assert.equal(state(ready([s09Row(1,1000,change)]),1100,'SAIN:StandAndShoot',900,false).squadVoice,undefined);checks+=2;
 }
 const played={state:'native-played',filtered:false,played:true,mode:'Normal',execution:'SAIN accepted a voice clip; remote audibility is not measured'};
 assert.ok(state(ready([s09Row(1,1000,played)]),1100,'SAIN:StandAndShoot',900,false).squadVoice);checks++;
 for(const key of ['phrase','source','request','reason','execution']){const html=tooltip(state(ready([s09Row(1,1000,{[key]:'<img src=x onerror=x>'})]),1100,'SAIN:StandAndShoot',900,false));assert.ok(!html.includes('<img'));checks++;}
 for(const extra of [{feature:'S08'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([s09Row(1,1000,{},extra)]).events.length,0);checks++;}
 for(const change of [{state:'native-played'},{mode:'Normal'},{mode:'Reduced',urgent:true},{validFor:20},{roll:NaN},{roll:101},{botWait:-1},{request:''},{played:true},{filtered:false},{chance:101},{alternatives:undefined,validFor:Infinity}]){assert.equal(s09Helpers.parseCometSquadVoice({...s09Trace,...change}),null);checks++;}
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',contact:{target:'enemy',age:0,source:'heard'}}}]){assert.equal(state(ready([s09Row(1,1000),row(2,1050,'selected','Hold',extra)]),1100,'SAIN:StandAndShoot',900,false).squadVoice,undefined);checks++;}
 const wire=path.resolve(__dirname,'../../COMET/artifacts/s09-adapter-events.jsonl');const data=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):[s09Fixture];
 for(const e of data){assert.ok(s09Helpers.parseCometSquadVoice(e.squadVoice),JSON.stringify(e.squadVoice));checks++;}
}
console.log(`${checks} COMET map checks passed (including S09)`);
const l01Fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/l01-light-discipline.json'),'utf8'));
const l01Trace=l01Fixture.lightDiscipline;
const l01Helpers=load('../Private/src/helpers/cometLightDiscipline.ts');
const l01Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','LightDiscipline',{feature:'L01',detail:{botInstance:'instance',lightDiscipline:{...l01Trace,...changes}},...extra});
{
 const r=ready([l01Row(1,1000)]);
 for(const action of ['SAIN:Freeze','COMET:Hold','Freeze']){
  const v=state(r,1100,action,900,false);assert.ok(v.lightDiscipline);assert.ok(v.active);assert.equal(v.decision,action);checks+=3;
  assert.equal(getBehaviorCategory(v.decision).key,getBehaviorCategory(action).key);assert.match(tooltip(v),/Ambush lights - L01/);assert.match(tooltip(v),/Observed OFF: yes/);assert.match(tooltip(v),/Known contact/);assert.match(tooltip(v),/Selected device modes preserved/);checks+=5;
 }
 for(const [at,action,ghost] of [[1800,'SAIN:Freeze',false],[1100,'SAIN:Search',false],[1100,'SAIN:Freeze',true],[999,'SAIN:Freeze',false]]){assert.equal(state(r,at,action,900,ghost).lightDiscipline,undefined);checks++;}
 for(const stage of ['waiting','yielded','released']){
  const change={state:stage,validFor:0};assert.ok(l01Helpers.parseCometLightDiscipline({...l01Trace,...change}));
  assert.equal(state(ready([l01Row(1,1000,change)]),1100,'SAIN:Freeze',900,false).lightDiscipline,undefined);checks+=2;
  assert.equal(state(ready([l01Row(1,1000),l01Row(2,1050,change)]),1100,'SAIN:Freeze',900,false).lightDiscipline,undefined);checks++;
 }
 for(const key of ['reason','contact','tactic','weapon','execution']){const html=tooltip(state(ready([l01Row(1,1000,{[key]:'<img src=x onerror=x>'})]),1100,'SAIN:Freeze',900,false));assert.ok(!html.includes('<img'));checks++;}
 const html=tooltip(state(ready([l01Row(1,1000,{modes:['<script>x</script>','laser:2'],alternatives:['<svg onload=x>']})]),1100,'SAIN:Freeze',900,false));assert.ok(!html.includes('<script>')&&!html.includes('<svg'));checks++;
 for(const extra of [{feature:'S09'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([l01Row(1,1000,{},extra)]).events.length,0);checks++;}
 for(const bad of [{state:'native-played'},{validFor:2},{validFor:Infinity},{contactAge:NaN},{known:{x:NaN,y:0,z:0}},{activeDevices:3},{observedOff:false},{devices:1.5},{modes:[]},{source:'omniscience'},{requested:1},{speed:-1},{contact:''},{tactic:''}]){assert.equal(l01Helpers.parseCometLightDiscipline({...l01Trace,...bad}),null);checks++;}
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',contact:{target:'enemy',age:0,source:'heard'}}}]){assert.equal(state(ready([l01Row(1,1000),row(2,1050,'selected','Hold',extra)]),1100,'SAIN:Freeze',900,false).lightDiscipline,undefined);checks++;}
 const wire=path.resolve(__dirname,'../../COMET/artifacts/l01-adapter-events.jsonl');const data=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):[l01Fixture];
 for(const e of data){assert.ok(l01Helpers.parseCometLightDiscipline(e.lightDiscipline),JSON.stringify(e.lightDiscipline));checks++;}
}
console.log(`${checks} COMET map checks passed (including L01)`);
const l02Fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/l02-tactical-devices.json'),'utf8'));
const l02Trace=l02Fixture.tacticalDevices;
const l02Helpers=load('../Private/src/helpers/cometTacticalDevices.ts');
const l02Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','TacticalDevices',{feature:'L02',detail:{botInstance:'instance',tacticalDevices:{...l02Trace,...changes}},...extra});
{
 const named={...l02Trace,accessories:l02Trace.accessories.map((a,i)=>({...a,name:i===0?'SureFire X400':'AN/PEQ-15'}))};
 const parsed=l02Helpers.parseCometTacticalDevices(named);assert.ok(parsed);checks++;
 const summary=l02Helpers.cometTacticalDevicesSummary(parsed).join('\n');
 assert.match(summary,/SureFire X400:/);assert.match(summary,/AN\/PEQ-15:/);checks+=2;
 for(const a of parsed.accessories){assert.ok(!summary.includes(a.id));assert.ok(l02Helpers.cometTacticalDeviceIdentifiers(parsed).join('\n').includes(a.id));checks+=2;}
 const duplicates=l02Helpers.parseCometTacticalDevices({...named,accessories:named.accessories.map(a=>({...a,name:'SureFire X400'}))});
 assert.equal(l02Helpers.cometTacticalDeviceLabel(duplicates,0),'SureFire X400 #1');assert.equal(l02Helpers.cometTacticalDeviceLabel(duplicates,1),'SureFire X400 #2');checks+=2;
 for(const value of [undefined,null,42,'   ']){
  const old=l02Helpers.parseCometTacticalDevices({...named,accessories:named.accessories.map(a=>({...a,name:value}))});
  assert.ok(old);assert.equal(l02Helpers.cometTacticalDeviceLabel(old,0),'Accessory 1');checks+=2;
 }
 const html=tooltip(state(ready([l02Row(1,1000,{accessories:named.accessories.map(a=>({...a,name:'<img src=x onerror=x>'}))})]),1100,'SAIN:Freeze',900,false));
 assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));checks+=2;
}
{
 const r=ready([l02Row(1,1000)]);
 for(const action of ['SAIN:Freeze','Freeze']){
  const v=state(r,1100,action,900,false);assert.ok(v.tacticalDevices);assert.ok(v.active);assert.equal(v.decision,action);checks+=3;
  assert.equal(getBehaviorCategory(v.decision).key,getBehaviorCategory(action).key);assert.match(tooltip(v),/Weapon accessories - L02/);assert.match(tooltip(v),/target state observed: yes/);checks+=3;
 }
 for(const [at,action,ghost] of [[2000,'SAIN:Freeze',false],[1100,'SAIN:Search',false],[1100,'SAIN:Freeze',true],[999,'SAIN:Freeze',false]]){assert.equal(state(r,at,action,900,ghost).tacticalDevices,undefined);checks++;}
 assert.equal(state(ready([l02Row(1,1000),l02Row(2,1050,{state:'released',validFor:0})]),1100,'SAIN:Freeze',900,false).tacticalDevices,undefined);checks++;
 for(const key of ['reason','action','weapon','execution']){const html=tooltip(state(ready([l02Row(1,1000,{[key]:'<img src=x onerror=x>'})]),1100,key==='action'?'<img src=x onerror=x>':'SAIN:Freeze',900,false));assert.ok(!html.includes('<img'));checks++;}
 const html=tooltip(state(ready([l02Row(1,1000,{accessories:l02Trace.accessories.map((a,i)=>({...a,id:`<script>${i}</script>`})),alternatives:['<svg onload=x>']})]),1100,'SAIN:Freeze',900,false));assert.ok(!html.includes('<script>')&&!html.includes('<svg'));checks++;
 for(const extra of [{feature:'L01'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([l02Row(1,1000,{},extra)]).events.length,0);checks++;}
 for(const bad of [{state:'invented'},{validFor:2},{validFor:Infinity},{activeDevices:3},{observed:false},{devices:1.5},{accessories:[]},{source:'other'},{requested:1},{weapon:''},{accepted:true,requested:false},{source:'holster'}]){assert.equal(l02Helpers.parseCometTacticalDevices({...l02Trace,...bad}),null);checks++;}
 for(const bad of [{mode:NaN},{retryIn:Infinity},{retryIn:-1},{rounds:-1},{failures:6},{active:1},{state:'unknown'}]){assert.equal(l02Helpers.parseCometTacticalDevices({...l02Trace,accessories:[{...l02Trace.accessories[0],...bad},l02Trace.accessories[1]]}),null);checks++;}
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',contact:{target:'enemy',age:0,source:'heard'}}}]){assert.equal(state(ready([l02Row(1,1000),row(2,1050,'selected','Hold',extra)]),1100,'SAIN:Freeze',900,false).tacticalDevices,undefined);checks++;}
 const wire=path.resolve(__dirname,'../../COMET/artifacts/l02-adapter-events.jsonl');const data=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):[l02Fixture];
 for(const e of data){const parsed=l02Helpers.parseCometTacticalDevices(e.tacticalDevices);assert.ok(parsed,JSON.stringify(e.tacticalDevices));checks++;}
 const failed=data.find(e=>e.tacticalDevices.state==='backoff');assert.ok(failed);const v=state(ready([l02Row(1,1000,failed.tacticalDevices)]),1500,'SAIN:Freeze',900,false);assert.ok(v.tacticalDevices);assert.match(tooltip(v),/retry in/);assert.equal(v.tacticalDevices.observed,false);checks+=4;
}
console.log(`${checks} COMET map checks passed (including L02)`);

const l03Fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/l03-rest-lights.json'),'utf8'));
const l03Trace=l03Fixture.restLights;
const l03Helpers=load('../Private/src/helpers/cometRestLights.ts');
const l03Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','RestLights',{feature:'L03',detail:{botInstance:'instance',restLights:{...l03Trace,...changes}},...extra});
{
 const r=ready([l03Row(1,1000)]);
 const v=state(r,1100,'Orbit:Guarding',900,false);
 assert.ok(v.restLights);assert.ok(v.active);assert.equal(v.actionActive,false);assert.equal(v.decision,'Orbit:Guarding');checks+=4;
 assert.equal(getBehaviorCategory(v.decision).key,getBehaviorCategory('Orbit:Guarding').key);assert.match(tooltip(v),/Lights while resting - L03/);assert.match(tooltip(v),/OFF observed: yes/);assert.match(tooltip(v),/SureFire X400/);checks+=4;
 for(const a of l03Trace.accessories){assert.ok(!tooltip(v).includes(a.id));checks++;}
 for(const [at,action,ghost] of [[1750,'Orbit:Guarding',false],[1100,'SAIN:Search',false],[1100,'Orbit:Loot',false],[1100,'Orbit:Guarding',true],[999,'Orbit:Guarding',false]]){assert.equal(state(r,at,action,900,ghost).restLights,undefined);checks++;}
 assert.equal(state(ready([l03Row(1,1000),l03Row(2,1050,{state:'released',validFor:0})]),1100,'Orbit:Guarding',900,false).restLights,undefined);checks++;
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',contact:{target:'enemy',age:0,source:'heard'}}}]){assert.equal(state(ready([l03Row(1,1000),row(2,1050,'selected','Hold',extra)]),1100,'Orbit:Guarding',900,false).restLights,undefined);checks++;}
 for(const extra of [{feature:'L02'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([l03Row(1,1000,{},extra)]).events.length,0);checks++;}
 for(const bad of [{state:'unknown'},{validFor:2},{validFor:Infinity},{activeDevices:3},{observedOff:false},{devices:1.5},{accessories:[]},{owner:'other'},{requested:1},{weapon:''},{accepted:true,requested:false},{speed:-1},{stillFor:NaN},{episode:0},{waitRemaining:16},{cooldownRemaining:121}]){assert.equal(l03Helpers.parseCometRestLights({...l03Trace,...bad}),null);checks++;}
 for(const key of ['reason','behavior','weapon','execution']){const bad='<img src=x onerror=x>';const html=tooltip(state(ready([l03Row(1,1000,{[key]:bad})]),1100,key==='behavior'?bad:'Orbit:Guarding',900,false));assert.ok(!html.includes('<img'));checks++;}
 const html=tooltip(state(ready([l03Row(1,1000,{accessories:l03Trace.accessories.map(a=>({...a,name:'<script>x</script>'})),alternatives:['<svg onload=x>']})]),1100,'Orbit:Guarding',900,false));assert.ok(!html.includes('<script>')&&!html.includes('<svg'));checks++;
 const native=state(ready([l03Row(1,1000,{behavior:'peaceLook',owner:'EFT',layer:'PatrolAssault'})]),1100,'peaceLook',900,false);assert.ok(native.restLights);checks++;
 const wire=path.resolve(__dirname,'../../COMET/artifacts/l03/rest-lights.jsonl');const data=fs.existsSync(wire)?fs.readFileSync(wire,'utf8').trim().split(/\r?\n/).map(JSON.parse):[l03Fixture];
 for(const e of data){assert.ok(l03Helpers.parseCometRestLights(e.restLights),JSON.stringify(e.restLights));checks++;}
}
console.log(`${checks} COMET map checks passed (including L03)`);

const e03Fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/e03-encounter.json'),'utf8'));
const e03Trace=e03Fixture.encounter;
const e03Helpers=load('../Private/src/helpers/cometEncounter.ts');
const e03Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','EncounterAdaptation',{feature:'E03',detail:{botInstance:'instance',encounter:{...e03Trace,...changes}},...extra});
{
 const r=ready([e03Row(1,1000)]);
 for(const action of ['SAIN:Freeze','SAIN:StandAndShoot','COMET:Hold']){
  const v=state(r,1100,action,900,false);assert.ok(v.encounter);assert.ok(v.active);assert.equal(v.decision,action);assert.equal(v.actionActive,action.startsWith('COMET:'));checks+=4;
  assert.equal(getBehaviorCategory(v.decision).key,getBehaviorCategory(action).key);assert.match(tooltip(v),/Repeated peeks - E03/);assert.match(tooltip(v),/3 \/ 3 separate appearances/);assert.match(tooltip(v),/not proof of execution/);checks+=4;
 }
 for(const [at,ghost] of [[1350,false],[999,false],[1100,true]]){assert.equal(state(r,at,'SAIN:Freeze',900,ghost).encounter,undefined);checks++;}
 const ended=ready([e03Row(1,1000),e03Row(2,1050,{state:'ended',eligible:false,bonus:0,appliedBonus:0,validFor:0})]);
 assert.equal(state(ended,1100,'SAIN:Freeze',900,false).encounter,undefined);assert.ok(state(ended,1020,'SAIN:Freeze',900,false).encounter);checks+=2;
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',contact:{target:'target'}}},{detail:{botInstance:'instance',contact:{target:'new-opponent'}}}]){
  assert.equal(state(ready([e03Row(1,1000),row(2,1050,'selected','Hold',extra)]),1100,'SAIN:Freeze',900,false).encounter,undefined);checks++;
 }
 for(const extra of [{feature:'L03'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([e03Row(1,1000,{},extra)]).events.length,0);checks++;}
 const detail={botInstance:'instance',contact:{target:'target',source:'seen',age:1},encounter:e03Trace};
 const lifecycle=ready([row(1,1000,'selected','Hold',{detail}),row(2,1050,'accepted','Hold',{detail})]);
 const accepted=state(lifecycle,1100,'COMET:Hold',1050,false);assert.ok(accepted.encounter);assert.ok(accepted.actionActive);checks+=2;
 for(const bad of [{state:'learning-forever'},{validFor:2},{validFor:Infinity},{remaining:NaN},{bonus:26},{appliedBonus:-1},{count:2.5},{required:1},{observations:[]},{observations:[1,1,2]},{observations:[1,3,2]},{x:NaN}]){assert.equal(e03Helpers.parseCometEncounter({...e03Trace,...bad}),null);checks++;}
 assert.equal(e03Helpers.parseCometEncounter({...e03Trace,state:'observing',eligible:true}).bonus,0);checks++;
 for(const key of ['reason','target','choice','holdRefusal']){const html=tooltip(state(ready([e03Row(1,1000,{[key]:'<img src=x onerror=x>'})]),1100,'SAIN:Freeze',900,false));assert.ok(!html.includes('<img'));checks++;}
 const html=tooltip(state(r,1100,'SAIN:Freeze',900,false),{target:'<script>x</script>'});assert.ok(!html.includes('<script>'));checks++;
 const alternatives=tooltip(state(ready([e03Row(1,1000,{alternatives:['<svg onload=x>']})]),1100,'SAIN:Freeze',900,false));assert.ok(!alternatives.includes('<svg'));checks++;
 const wire=path.resolve(__dirname,'../../COMET/artifacts/e03/encounter.jsonl');
 if(fs.existsSync(wire))for(const line of fs.readFileSync(wire,'utf8').trim().split(/\r?\n/)){const e=JSON.parse(line);assert.ok(e03Helpers.parseCometEncounter(e.encounter),JSON.stringify(e));checks++;}
}
console.log(`${checks} COMET map checks passed (including E03)`);

const e04Trace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/e04-outcome.json'),'utf8')).outcome;
const e04Choice=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/e04-choice.json'),'utf8')).outcome;
const e04Helpers=load('../Private/src/helpers/cometOutcome.ts');
const e04Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','TacticalOutcome',{feature:'E04',detail:{botInstance:'instance',outcome:{...e04Trace,...changes}},...extra});
{
 const r=ready([e04Row(1,1000)]);
 for(const action of ['SAIN:SeekCover','SAIN:StandAndShoot','COMET:Cover']){
  const v=state(r,1100,action,900,false);assert.ok(v.outcome);assert.ok(v.active);assert.equal(v.decision,action);assert.equal(v.actionActive,action.startsWith('COMET:'));checks+=4;
  assert.equal(getBehaviorCategory(v.decision).key,getBehaviorCategory(action).key);assert.match(tooltip(v),/Tactical feedback - E04/);assert.match(tooltip(v),/protection confirmed/);assert.match(tooltip(v),/not a guarantee/);checks+=4;
 }
 for(const [at,ghost] of [[1350,false],[999,false],[1100,true]]){assert.equal(state(r,at,'SAIN:SeekCover',900,ghost).outcome,undefined);checks++;}
 const ended=ready([e04Row(1,1000),e04Row(2,1050,{state:'ended',validFor:0})]);
 assert.equal(state(ended,1100,'SAIN:SeekCover',900,false).outcome,undefined);assert.ok(state(ended,1020,'SAIN:SeekCover',900,false).outcome);checks+=2;
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',contact:{target:'enemy'}}},{detail:{botInstance:'instance',contact:{target:'new-opponent'}}}]){
  assert.equal(state(ready([e04Row(1,1000),row(2,1050,'selected','Hold',extra)]),1100,'SAIN:SeekCover',900,false).outcome,undefined);checks++;
 }
 for(const extra of [{feature:'L03'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([e04Row(1,1000,{},extra)]).events.length,0);checks++;}
 const detail={botInstance:'instance',contact:{target:'enemy',source:'seen',age:1},outcome:e04Choice};
 const lifecycle=ready([row(1,1000,'selected','Cover',{feature:'A02',detail}),row(2,1050,'accepted','Cover',{feature:'A02',detail})]);
 const accepted=state(lifecycle,1100,'COMET:Cover',1050,false);assert.ok(accepted.outcome);assert.ok(accepted.actionActive);assert.match(tooltip(accepted,lifecycle,1100,{}),/5.0 available \/ 5.0 applied/);checks+=3;
 for(const bad of [{state:'persistent'},{result:'won'},{validFor:2},{validFor:Infinity},{remaining:NaN},{healthLoss:2},{episode:2.5},{effects:null},{x:NaN}]){assert.equal(e04Helpers.parseCometOutcome({...e04Trace,...bad}),null);checks++;}
 for(const bad of [{delta:100},{applied:6},{results:2.5},{favorable:99},{applied:-1},{results:33}]){assert.equal(e04Helpers.parseCometOutcome({...e04Choice,effects:[{...e04Choice.effects.find(e=>e.action==='Cover'),...bad}]}),null);checks++;}
 for(const key of ['reason','target','choice','action']){const html=tooltip(state(ready([e04Row(1,1000,{[key]:'<img src=x onerror=x>'})]),1100,'SAIN:SeekCover',900,false));assert.ok(!html.includes('<img'));checks++;}
 const html=tooltip(state(r,1100,'SAIN:SeekCover',900,false),r,1100,{enemy:'<script>x</script>'});assert.ok(!html.includes('<script>'));checks++;
 const wire=path.resolve(__dirname,'../../COMET/artifacts/e04/outcomes.jsonl');
 if(fs.existsSync(wire))for(const line of fs.readFileSync(wire,'utf8').trim().split(/\r?\n/)){const e=JSON.parse(line);assert.ok(e04Helpers.parseCometOutcome(e.outcome),JSON.stringify(e));checks++;}
}
console.log(`${checks} COMET map checks passed (including E04)`);

const c01Trace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/c01-transit.json'),'utf8')).doorTransit;
const c01Helpers=load('../Private/src/helpers/cometDoorTransit.ts');
const c01Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','DoorTransit',{feature:'C01',detail:{botInstance:'instance',doorTransit:{...c01Trace,...changes}},...extra});
{
 const r=ready([c01Row(1,1000)]);
 for(const action of ['SAIN:Search','COMET:Search']){
  const v=state(r,1100,action,900,false);assert.ok(v.doorTransit);assert.ok(v.active);assert.equal(v.decision,action);assert.equal(v.actionActive,action.startsWith('COMET:'));checks+=4;
  assert.equal(getBehaviorCategory(v.decision).key,getBehaviorCategory(action).key);assert.match(tooltip(v),/Door traversal - C01/);assert.match(tooltip(v),/success not yet observed/);checks+=3;
 }
 for(const [at,ghost] of [[1350,false],[999,false],[1100,true]]){assert.equal(state(r,at,'SAIN:Search',900,ghost).doorTransit,undefined);checks++;}
 const terminal={state:'ended',validFor:0,slow:false,stopSprint:false,recovery:false};
 const ended=ready([c01Row(1,1000),c01Row(2,1050,terminal)]);
 assert.equal(state(ended,1100,'SAIN:Search',900,false).doorTransit,undefined);assert.ok(state(ended,1020,'SAIN:Search',900,false).doorTransit);checks+=2;
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',contact:{target:'enemy'}}}]){assert.equal(state(ready([c01Row(1,1000),row(2,1050,'selected','Hold',extra)]),1100,'SAIN:Search',900,false).doorTransit,undefined);checks++;}
 for(const extra of [{feature:'D01'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([c01Row(1,1000,{},extra)]).events.length,0);checks++;}
 for(const bad of [{state:'teleported'},{door:null},{distance:6},{blocked:-1},{validFor:2},{validFor:Infinity},{x:NaN},{slow:1},{requestedSpeed:1.1},{passed:true},{state:'ended'}]){assert.equal(c01Helpers.parseCometDoorTransit({...c01Trace,...bad}),null);checks++;}
 for(const key of ['reason','door','doorState','action']){const html=tooltip(state(ready([c01Row(1,1000,{[key]:'<img src=x onerror=x>'})]),1100,'SAIN:Search',900,false));assert.ok(!html.includes('<img'));checks++;}
 const passed={...c01Trace,...terminal,passed:true};assert.match(c01Helpers.cometDoorTransitSummary(passed).join(' '),/Crossing observed/);checks++;
 const wire=path.resolve(__dirname,'../../COMET/artifacts/c01/transit.jsonl');
 if(fs.existsSync(wire))for(const line of fs.readFileSync(wire,'utf8').trim().split(/\r?\n/)){const e=JSON.parse(line);assert.ok(c01Helpers.parseCometDoorTransit(e.doorTransit),JSON.stringify(e));checks++;}
}

const c02Trace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/c02-recovery.json'),'utf8')).doorRecovery;
const c02Helpers=load('../Private/src/helpers/cometDoorRecovery.ts');
const c02Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','DoorRecovery',{feature:'C02',detail:{botInstance:'instance',doorRecovery:{...c02Trace,...changes}},...extra});
{
 const r=ready([c02Row(1,1000)]);
 for(const action of ['SAIN:Search','COMET:Search']){
  const v=state(r,1100,action,900,false);assert.ok(v.doorRecovery);assert.ok(v.active);assert.equal(v.decision,action);assert.equal(v.actionActive,action.startsWith('COMET:'));checks+=4;
  assert.equal(getBehaviorCategory(v.decision).key,getBehaviorCategory(action).key);assert.match(tooltip(v),/Door recovery - C02/);assert.match(tooltip(v),/success not yet observed/);checks+=3;
 }
 for(const [at,ghost] of [[1700,false],[999,false],[1100,true]]){assert.equal(state(r,at,'SAIN:Search',900,ghost).doorRecovery,undefined);checks++;}
 for(const terminal of ['ended','blocked','confirmed']){
  const ended=ready([c02Row(1,1000),c02Row(2,1050,{state:terminal,validFor:0,confirmed:terminal==='confirmed'})]);
  assert.equal(state(ended,1100,'SAIN:Search',900,false).doorRecovery,undefined);assert.ok(state(ended,1020,'SAIN:Search',900,false).doorRecovery);checks+=2;
 }
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',contact:{target:'enemy'}}}]){assert.equal(state(ready([c02Row(1,1000),row(2,1050,'selected','Hold',extra)]),1100,'SAIN:Search',900,false).doorRecovery,undefined);checks++;}
 for(const extra of [{feature:'D01'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([c02Row(1,1000,{},extra)]).events.length,0);checks++;}
 for(const bad of [{state:'teleported'},{door:null},{age:-1},{stable:-1},{validFor:2},{validFor:Infinity},{x:NaN},{requested:1},{confirmed:true},{state:'ended'},{requested:false}]){assert.equal(c02Helpers.parseCometDoorRecovery({...c02Trace,...bad}),null);checks++;}
 for(const key of ['reason','door','target','repair','network']){const html=tooltip(state(ready([c02Row(1,1000,{[key]:'<img src=x onerror=x>'})]),1100,'SAIN:Search',900,false));assert.ok(!html.includes('<img'));checks++;}
 assert.match(c02Helpers.cometDoorRecoverySummary({...c02Trace,state:'confirmed',validFor:0,confirmed:true}).join(' '),/Consistent state confirmed/);checks++;
 const wire=path.resolve(__dirname,'../../COMET/artifacts/c02/recovery.jsonl');
 if(fs.existsSync(wire))for(const line of fs.readFileSync(wire,'utf8').trim().split(/\r?\n/)){const e=JSON.parse(line);assert.ok(c02Helpers.parseCometDoorRecovery(e.doorRecovery),JSON.stringify(e));checks++;}
}
const c03Trace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/c03-geometry.json'),'utf8')).doorSpatial;
const c03Helpers=load('../Private/src/helpers/cometDoorSpatial.ts');
const c03Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','DoorGeometry',{feature:'C03',detail:{botInstance:'instance',doorSpatial:{...c03Trace,...changes}},...extra});
{
 const r=ready([c03Row(1,1000)]);
 for(const action of ['SAIN:Search','COMET:Search']){
  const v=state(r,1100,action,900,false);assert.ok(v.doorSpatial);assert.ok(v.active);assert.equal(v.decision,action);checks+=3;
  assert.equal(getBehaviorCategory(v.decision).key,getBehaviorCategory(action).key);assert.match(tooltip(v),/Door geometry - C03/);assert.match(tooltip(v),/0.55 m/);checks+=3;
 }
 for(const [at,ghost] of [[1600,false],[999,false],[1100,true]]){assert.equal(state(r,at,'SAIN:Search',900,ghost).doorSpatial,undefined);checks++;}
 const ended=ready([c03Row(1,1000),c03Row(2,1050,{state:'ended',validFor:0})]);assert.equal(state(ended,1100,'SAIN:Search',900,false).doorSpatial,undefined);checks++;
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',contact:{target:'enemy'}}}]){assert.equal(state(ready([c03Row(1,1000),row(2,1050,'selected','Hold',extra)]),1100,'SAIN:Search',900,false).doorSpatial,undefined);checks++;}
 for(const extra of [{feature:'D01'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([c03Row(1,1000,{},extra)]).events.length,0);checks++;}
 for(const bad of [{state:'moving'},{door:null},{margin:.2},{margin:2},{validFor:2},{validFor:Infinity},{x:NaN},{source:'anything'},{state:'ended'}]){assert.equal(c03Helpers.parseCometDoorSpatial({...c03Trace,...bad}),null);checks++;}
 for(const key of ['reason','door','blocker','doorState','blockerState']){const html=tooltip(state(ready([c03Row(1,1000,{[key]:'<img src=x onerror=x>'})]),1100,'SAIN:Search',900,false));assert.ok(!html.includes('<img'));checks++;}
 assert.match(c03Helpers.cometDoorSpatialSummary({...c03Trace,state:'clear'}).join(' '),/movement not confirmed/);checks++;
 assert.ok(c03Helpers.parseCometDoorSpatial({...c03Trace,source:'native-physical-floor'}),'current COMET door floor repair is readable');checks++;
 const wire=path.resolve(__dirname,'../../COMET/artifacts/c03/geometry.jsonl');
 if(fs.existsSync(wire))for(const line of fs.readFileSync(wire,'utf8').trim().split(/\r?\n/)){const e=JSON.parse(line);assert.ok(c03Helpers.parseCometDoorSpatial(e.doorSpatial),JSON.stringify(e));checks++;}
}
const c04Trace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/c04-motion.json'),'utf8')).doorMotion;
const c04Helpers=load('../Private/src/helpers/cometDoorMotion.ts');
const c04Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','DoorMotion',{feature:'C04',detail:{botInstance:'instance',doorMotion:{...c04Trace,...changes}},...extra});
{
 const r=ready([c04Row(1,1000)]);
 for(const action of ['SAIN:Search','COMET:Search']){
  const v=state(r,1100,action,900,false);assert.ok(v.doorMotion);assert.ok(v.active);assert.equal(v.decision,action);checks+=3;
  assert.equal(getBehaviorCategory(v.decision).key,getBehaviorCategory(action).key);assert.match(tooltip(v),/Door motion - C04/);assert.match(tooltip(v),/target: -90.0/);checks+=3;
 }
 for(const [at,ghost] of [[1350,false],[999,false],[1100,true]]){assert.equal(state(r,at,'SAIN:Search',900,ghost).doorMotion,undefined);checks++;}
 const ended=ready([c04Row(1,1000),c04Row(2,1050,{state:'ended',validFor:0})]);assert.equal(state(ended,1100,'SAIN:Search',900,false).doorMotion,undefined);checks++;
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',contact:{target:'enemy'}}}]){assert.equal(state(ready([c04Row(1,1000),row(2,1050,'selected','Hold',extra)]),1100,'SAIN:Search',900,false).doorMotion,undefined);checks++;}
 for(const extra of [{feature:'D01'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([c04Row(1,1000,{},extra)]).events.length,0);checks++;}
 for(const bad of [{state:'teleported'},{door:null},{angle:NaN},{targetAngle:800},{validFor:2},{validFor:Infinity},{x:NaN},{action:'anything'},{state:'ended'}]){assert.equal(c04Helpers.parseCometDoorMotion({...c04Trace,...bad}),null);checks++;}
 for(const key of ['reason','door','doorState']){const html=tooltip(state(ready([c04Row(1,1000,{[key]:'<img src=x onerror=x>'})]),1100,'SAIN:Search',900,false));assert.ok(!html.includes('<img'));checks++;}
 assert.match(c04Helpers.cometDoorMotionSummary({...c04Trace,state:'confirmed'}).join(' '),/crossing not confirmed/);checks++;
 const wire=path.resolve(__dirname,'../../COMET/artifacts/c04/motion.jsonl');
 if(fs.existsSync(wire))for(const line of fs.readFileSync(wire,'utf8').trim().split(/\r?\n/)){const e=JSON.parse(line);assert.ok(c04Helpers.parseCometDoorMotion(e.doorMotion),JSON.stringify(e));checks++;}
}

const c05Trace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/c05-closing.json'),'utf8')).doorClosing;
const c05Helpers=load('../Private/src/helpers/cometDoorClosing.ts');
const c05Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','DoorClosing',{feature:'C05',detail:{botInstance:'instance',doorClosing:{...c05Trace,...changes}},...extra});
{
 const r=ready([c05Row(1,1000)]);
 for(const action of ['SAIN:Search','COMET:Search']){
  const v=state(r,1100,action,900,false);assert.ok(v.doorClosing);assert.ok(v.active);assert.equal(v.decision,action);checks+=3;
  assert.equal(getBehaviorCategory(v.decision).key,getBehaviorCategory(action).key);assert.match(tooltip(v),/Automatic door closing - C05/);assert.match(tooltip(v),/clearance: 1.50 m/);checks+=3;
 }
 for(const [at,ghost] of [[1350,false],[999,false],[1100,true]]){assert.equal(state(r,at,'SAIN:Search',900,ghost).doorClosing,undefined);checks++;}
 for(const terminal of ['ended','rejected','confirmed','failed']){
  const ended=ready([c05Row(1,1000),c05Row(2,1050,{state:terminal,validFor:0})]);assert.equal(state(ended,1100,'SAIN:Search',900,false).doorClosing,undefined);checks++;
 }
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',contact:{target:'enemy'}}}]){assert.equal(state(ready([c05Row(1,1000),row(2,1050,'selected','Hold',extra)]),1100,'SAIN:Search',900,false).doorClosing,undefined);checks++;}
 for(const extra of [{feature:'D01'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([c05Row(1,1000,{},extra)]).events.length,0);checks++;}
 for(const bad of [{state:'teleported'},{door:null},{graceRemaining:-1},{retryRemaining:61},{occupiedRadius:0},{validFor:2},{validFor:Infinity},{x:NaN},{state:'ended'}]){assert.equal(c05Helpers.parseCometDoorClosing({...c05Trace,...bad}),null);checks++;}
 for(const key of ['reason','door','doorState']){const html=tooltip(state(ready([c05Row(1,1000,{[key]:'<img src=x onerror=x>'})]),1100,'SAIN:Search',900,false));assert.ok(!html.includes('<img'));checks++;}
 assert.match(c05Helpers.cometDoorClosingSummary({...c05Trace,state:'confirmed',validFor:0}).join(' '),/crossing not confirmed/);checks++;
 const wire=path.resolve(__dirname,'../../COMET/artifacts/c05/closing.jsonl');
 if(fs.existsSync(wire))for(const line of fs.readFileSync(wire,'utf8').trim().split(/\r?\n/)){const e=JSON.parse(line);assert.ok(c05Helpers.parseCometDoorClosing(e.doorClosing),JSON.stringify(e));checks++;}
}
const c06Trace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/c06-recovery.json'),'utf8')).movementRecovery;
const c06Helpers=load('../Private/src/helpers/cometMovementRecovery.ts');
const c06Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','MovementRecovery',{feature:'C06',detail:{botInstance:'instance',movementRecovery:{...c06Trace,...changes}},...extra});
{
 const r=ready([c06Row(1,1000)]);
 for(const action of ['SAIN:Search','COMET:Search','ORBIT:Patrol']){
  const v=state(r,1100,action,900,false);assert.ok(v.movementRecovery);assert.ok(v.active);assert.equal(v.decision,action);checks+=3;
  assert.equal(getBehaviorCategory(v.decision).key,getBehaviorCategory(action).key);assert.match(tooltip(v),/Stuck movement recovery - C06/);assert.match(tooltip(v),/Blocked: 3.0 s/);checks+=3;
 }
 for(const [at,ghost] of [[2000,false],[999,false],[1100,true]]){assert.equal(state(r,at,'SAIN:Search',900,ghost).movementRecovery,undefined);checks++;}
 for(const terminal of ['ended','recovered','exhausted','paused']){
  const ended=ready([c06Row(1,1000),c06Row(2,1050,{state:terminal,validFor:0})]);assert.equal(state(ended,1100,'SAIN:Search',900,false).movementRecovery,undefined);checks++;
 }
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',contact:{target:'enemy'}}}]){assert.equal(state(ready([c06Row(1,1000),row(2,1050,'selected','Hold',extra)]),1100,'SAIN:Search',900,false).movementRecovery,undefined);checks++;}
 for(const extra of [{feature:'D01'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([c06Row(1,1000,{},extra)]).events.length,0);checks++;}
 for(const bad of [{state:'teleported'},{reason:null},{stalledSeconds:-1},{displacement:NaN},{validFor:3},{validFor:Infinity},{incident:.1},{teleportEnabled:'yes'},{state:'ended'}]){assert.equal(c06Helpers.parseCometMovementRecovery({...c06Trace,...bad}),null);checks++;}
 for(const key of ['reason','owner','contact','action','step','result']){const html=tooltip(state(ready([c06Row(1,1000,{[key]:'<img src=x onerror=x>'})]),1100,'SAIN:Search',900,false));assert.ok(!html.includes('<img'));checks++;}
 const wire=path.resolve(__dirname,'../../COMET/artifacts/c06/recovery.jsonl');
 if(fs.existsSync(wire))for(const line of fs.readFileSync(wire,'utf8').trim().split(/\r?\n/)){const e=JSON.parse(line);assert.ok(c06Helpers.parseCometMovementRecovery(e.movementRecovery),JSON.stringify(e));checks++;}
}
console.log(`${checks} COMET map checks passed (including C06)`);


// C07: independent search evidence never overrides the sampled behavior/color.
const c07Trace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/c07-cover-scan.json'),'utf8')).coverScan;
const c07Helpers=load('../Private/src/helpers/cometCoverScan.ts');
const c07Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','CoverScan',{feature:'C07',detail:{botInstance:'instance',coverScan:{...c07Trace,...changes}},...extra});
{
 const r=ready([c07Row(1,1000)]);
 for(const action of ['SAIN:Search','SAIN:RunToCover','COMET:Hold','SAIN:StandAndShoot']){
  const v=state(r,1100,action,900,false);assert.ok(v.coverScan);assert.equal(v.active,true);assert.equal(v.decision,action);checks+=3;
  const html=tooltip(v);assert.ok(html.includes('Stable cover search - C07'));assert.ok(html.includes('Available covers: 1'));checks+=2;
 }
 for(const [at,ghost] of [[3000,false],[999,false],[1100,true]]){assert.equal(state(r,at,'SAIN:Search',900,ghost).coverScan,undefined);checks++;}
 assert.equal(state(ready([c07Row(1,1000),c07Row(2,1050,{state:'ended',validFor:0})]),1100,'SAIN:Search',900,false).coverScan,undefined);checks++;
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',contact:{target:'enemy'}}}]){assert.equal(state(ready([c07Row(1,1000),row(2,1050,'selected','Hold',extra)]),1100,'SAIN:Search',900,false).coverScan,undefined);checks++;}
 for(const bad of [{state:'guessed'},{reason:null},{elapsed:-1},{elapsed:NaN},{validFor:3},{validFor:Infinity},{scan:.1},{pending:-1},{published:129},{state:'ended'}]){assert.equal(c07Helpers.parseCometCoverScan({...c07Trace,...bad}),null);checks++;}
 const wire=path.join(__dirname,'../../COMET/artifacts/c07/cover-scan.jsonl');
 if(fs.existsSync(wire))for(const line of fs.readFileSync(wire,'utf8').trim().split(/\r?\n/)){const e=JSON.parse(line);assert.ok(c07Helpers.parseCometCoverScan(e.coverScan),JSON.stringify(e));checks++;}
}
console.log(`C07 included: ${checks} COMET map checks passed`);

const c08Trace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/c08-fault-isolation.json'),'utf8')).faultIsolation;
const c08Helpers=load('../Private/src/helpers/cometFaultIsolation.ts');
const c08Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','FaultIsolation',{feature:'C08',detail:{botInstance:'instance',faultIsolation:{...c08Trace,...changes}},...extra});
{
 const r=ready([c08Row(1,1000)]);
 for(const action of ['SAIN:Search','SAIN:RunToCover','COMET:Hold','ORBIT:Patrol']){
  const v=state(r,1100,action,900,false);assert.ok(v.faultIsolation);assert.equal(v.active,true);assert.equal(v.decision,action);checks+=3;
  assert.equal(getBehaviorCategory(v.decision).key,getBehaviorCategory(action).key);assert.match(tooltip(v),/Error isolation - C08/);checks+=2;
 }
 for(const [at,ghost] of [[3000,false],[999,false],[1100,true]]){assert.equal(state(r,at,'SAIN:Search',900,ghost).faultIsolation,undefined);checks++;}
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',contact:{target:'enemy'}}}]){assert.equal(state(ready([c08Row(1,1000),row(2,1050,'selected','Hold',extra)]),1100,'SAIN:Search',900,false).faultIsolation,undefined);checks++;}
 for(const extra of [{feature:'C07'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([c08Row(1,1000,{},extra)]).events.length,0);checks++;}
 for(const bad of [{state:'healthy'},{module:null},{count:0},{total:0},{retryIn:NaN},{validFor:3},{validFor:Infinity},{count:.1},{cleanupFailed:'true'},{state:'bot-disabled'},{state:'module-disabled'}]){assert.equal(c08Helpers.parseCometFaultIsolation({...c08Trace,...bad}),null);checks++;}
 for(const key of ['module','entry','error']){const html=tooltip(state(ready([c08Row(1,1000,{[key]:'<img src=x onerror=x>'})]),1100,'SAIN:Search',900,false));assert.ok(!html.includes('<img'));checks++;}
 const wire=path.join(__dirname,'../../COMET/artifacts/c08/fault-isolation.jsonl');
 if(fs.existsSync(wire))for(const line of fs.readFileSync(wire,'utf8').trim().split(/\r?\n/)){const e=JSON.parse(line);assert.ok(c08Helpers.parseCometFaultIsolation(e.faultIsolation),JSON.stringify(e));checks++;}
}
console.log(`C08 included: ${checks} COMET map checks passed`);

const c09Trace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/c09-lifecycle.json'),'utf8')).lifecycle;
const c09Helpers=load('../Private/src/helpers/cometLifecycle.ts');
const c09Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','Lifecycle',{feature:'C09',detail:{botInstance:'instance',lifecycle:{...c09Trace,...changes}},...extra});
{
 const r=ready([c09Row(1,1000)]);
 for(const action of ['SAIN:Search','SAIN:RunToCover','ORBIT:Patrol']){
  const v=state(r,1100,action,900,false);assert.ok(v.lifecycle);assert.equal(v.active,true);assert.equal(v.actionActive,false);assert.equal(v.decision,action);checks+=4;
  assert.equal(getBehaviorCategory(v.decision).key,getBehaviorCategory(action).key);assert.match(tooltip(v),/Death and revive safety - C09/);checks+=2;
 }
 for(const [at,ghost] of [[3000,false],[999,false],[1100,true]]){assert.equal(state(r,at,'SAIN:Search',900,ghost).lifecycle,undefined);checks++;}
 const stopped=ready([row(1,900,'accepted','Hold'),c09Row(2,1000)]);
 for(const at of [1100,4000]){const v=state(stopped,at,'COMET:Hold',900,false);assert.equal(v.actionActive,false);assert.equal(v.event,undefined);assert.equal(v.decision,'');checks+=3;}
 const fresh=ready([c09Row(1,1000),c09Row(2,2000,{state:'resumed',freshState:true}),row(3,2100,'accepted','Search')]);
 assert.equal(state(fresh,2050,'COMET:Hold',900,false).actionActive,false);assert.equal(state(fresh,2200,'COMET:Search',2100,false).actionActive,true);checks+=2;
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',contact:{target:'enemy'}}}]){assert.equal(state(ready([c09Row(1,1000),row(2,1050,'selected','Hold',extra)]),1100,'SAIN:Search',900,false).lifecycle,undefined);checks++;}
 for(const extra of [{feature:'C08'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([c09Row(1,1000,{},extra)]).events.length,0);checks++;}
 for(const bad of [{state:'revived'},{reason:null},{generation:0},{generation:.1},{cleanupSteps:-1},{failedSteps:NaN},{failures:[{}]},{failures:Array(9).fill('x')},{freshState:'yes'},{state:'resumed'},{state:'disabled'},{validFor:3},{validFor:Infinity}]){assert.equal(c09Helpers.parseCometLifecycle({...c09Trace,...bad}),null);checks++;}
 for(const key of ['reason','previousAction']){const html=tooltip(state(ready([c09Row(1,1000,{[key]:'<img src=x onerror=x>'})]),1100,'SAIN:Search',900,false));assert.ok(!html.includes('<img'));checks++;}
 const malicious=tooltip(state(ready([c09Row(1,1000,{state:'disabled',failedSteps:1,failures:['<script>x</script>']})]),1100,'SAIN:Search',900,false));assert.ok(!malicious.includes('<script>'));checks++;
 const wire=path.join(__dirname,'../../COMET/artifacts/c09/lifecycle.jsonl');
 for(const line of fs.readFileSync(wire,'utf8').trim().split(/\r?\n/)){const e=JSON.parse(line);assert.ok(c09Helpers.parseCometLifecycle(e.lifecycle),JSON.stringify(e));checks++;}
}
console.log(`C09 included: ${checks} COMET map checks passed`);

const c10Trace=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/c10-validity.json'),'utf8')).validity;
const c10Helpers=load('../Private/src/helpers/cometValidity.ts');
const c10Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','Validity',{feature:'C10',detail:{botInstance:'instance',validity:{...c10Trace,...changes}},...extra});
{
 const r=ready([c10Row(1,1000)]);
 for(const action of ['SAIN:Search','SAIN:RunToCover','COMET:Hold','ORBIT:Patrol']){
  const v=state(r,1100,action,900,false);assert.ok(v.validity);assert.equal(v.active,true);assert.equal(v.decision,action);checks+=3;
  assert.equal(getBehaviorCategory(v.decision).key,getBehaviorCategory(action).key);assert.match(tooltip(v),/Invalid reference safety - C10/);assert.match(tooltip(v),/damage, death and extraction status are unchanged/);checks+=3;
 }
 for(const [at,ghost] of [[3000,false],[999,false],[1100,true]]){assert.equal(state(r,at,'SAIN:Search',900,ghost).validity,undefined);checks++;}
 const action=state(ready([row(1,900,'accepted','Hold'),c10Row(2,1000)]),1100,'COMET:Hold',900,false);
 assert.equal(action.actionActive,true);assert.equal(action.decision,'COMET:Hold');checks+=2;
 assert.equal(state(ready([c10Row(1,1000),c10Row(2,1050,{summary:true,validFor:0})]),1100,'SAIN:Search',900,false).validity,undefined);checks++;
 assert.equal(state(ready([c10Row(1,1000),c09Row(2,1050)]),1100,'SAIN:Search',900,false).validity,undefined);checks++;
 for(const extra of [{cometSession:'new'},{detail:{botInstance:'new',contact:{target:'enemy'}}}]){assert.equal(state(ready([c10Row(1,1000),row(2,1050,'selected','Hold',extra)]),1100,'SAIN:Search',900,false).validity,undefined);checks++;}
 for(const extra of [{feature:'C09'},{decision:'Other'},{stage:'selected'}]){assert.equal(ready([c10Row(1,1000,{},extra)]).events.length,0);checks++;}
 for(const bad of [{operation:'damage'},{reason:null},{reason:''},{source:23},{sourceInstance:'x'.repeat(513)},{blocked:0},{blocked:-1},{blocked:.5},{blocked:2147483648},{validFor:3},{validFor:Infinity},{summary:'true'},{summary:true}]){assert.equal(c10Helpers.parseCometValidity({...c10Trace,...bad}),null);checks++;}
 for(const operation of ['movement','register-player','remove-player','under-fire']){assert.ok(c10Helpers.parseCometValidity({...c10Trace,operation}));checks++;}
 for(const key of ['reason','source','sourceInstance']){const html=tooltip(state(ready([c10Row(1,1000,{[key]:'<img src=x onerror=x>'})]),1100,'SAIN:Search',900,false));assert.ok(!html.includes('<img'));checks++;}
 const wire=path.join(__dirname,'../../COMET/artifacts/c10/validity.jsonl');
 for(const line of fs.readFileSync(wire,'utf8').trim().split(/\r?\n/)){const e=JSON.parse(line);assert.ok(c10Helpers.parseCometValidity(e.validity),JSON.stringify(e));checks++;}
}
console.log(`C10 included: ${checks} COMET map checks passed`);

const c13=load('../Private/src/helpers/cometRaidCleanup.ts');
const c13Wire=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/c13-cleanup.json'),'utf8'));
check('C13 actual cleanup summary survives parser',()=>{assert.ok(c13.parseCometRaidCleanup(c13Wire.raidCleanup));assert.ok(c13.cometRaidCleanupSummary(c13Wire.raidCleanup).some(x=>x.includes('failures')))});
for(const bad of [null,[],{state:'pending'},{failedSteps:-1},{steps:0},{durationMs:Infinity},{pendingConfigDiscarded:1},{failures:['x'.repeat(513)]}])check('C13 malformed cleanup rejected',()=>assert.equal(c13.parseCometRaidCleanup(bad===null||Array.isArray(bad)?bad:{...c13Wire.raidCleanup,...bad}),null));
check('C13 raid summary never replaces a bot action or map colour',()=>assert.equal(prepare([{...c13Wire,id:999,time:100,profileId:'',cometSession:c13Wire.session,detail:c13Wire}], 'pmc-1').length,0));
console.log('Including C13: '+checks+' map and diagnostic checks passed.');

const c14=load('../Private/src/helpers/cometSainPreset.ts');
const c14Wire=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/c14-preset.json'),'utf8'));
check('C14 actual selected preset parsed',()=>{assert.ok(c14.parseCometSainPreset(c14Wire.sainPreset));assert.ok(c14.cometSainPresetSummary(c14Wire.sainPreset).some(x=>x.includes('does not match')))});
for(const bad of [null,[],{source:'singleton'},{name:'x'.repeat(161)},{availability:'guess'},{reason:'unknown'},{jump:1},{grenades:false,aiGrenades:true},{observedChanges:0},{observedChanges:Infinity},{coalescedChanges:1},{coalescedChanges:-1}])check('C14 malformed preset rejected',()=>assert.equal(c14.parseCometSainPreset(bad===null||Array.isArray(bad)?bad:{...c14Wire.sainPreset,...bad}),null));
check('C14 raid context never replaces bot action or map colour',()=>assert.equal(prepare([{...c14Wire,id:1000,time:100,cometSession:c14Wire.session,detail:c14Wire}], 'pmc-1').length,0));
console.log('Including C14: '+checks+' map and diagnostic checks passed.');

const u01=load('../Private/src/helpers/cometDifficultyPreset.ts');
const u01Wire=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/u01-preset.json'),'utf8'));
check('U01 production difficulty parsed',()=>{assert.ok(u01.parseCometDifficultyPreset(u01Wire.cometPreset));assert.ok(u01.cometDifficultyPresetSummary(u01Wire.cometPreset).some(x=>x.includes('Easy - customized')))});
for(const bad of [null,[],{baseProfile:'Impossible'},{catalogVersion:0},{catalogVersion:Infinity},{customized:'true'},{changedSettings:-1},{changedSettings:0},{changedSettings:.5},{changedSettings:Infinity}])check('U01 malformed preset rejected',()=>assert.equal(u01.parseCometDifficultyPreset(bad===null||Array.isArray(bad)?bad:{...u01Wire.cometPreset,...bad}),null));
for(const profile of ['Hard','Normal','Easy'])check('U01 standard '+profile,()=>assert.ok(u01.parseCometDifficultyPreset({baseProfile:profile,catalogVersion:1,customized:false,changedSettings:0})));
check('U01 raid context never replaces bot action or map colour',()=>assert.equal(prepare([{...u01Wire,id:1001,time:100,cometSession:u01Wire.session,detail:u01Wire}], 'pmc-1').length,0));
console.log('Including U01: '+checks+' map and diagnostic checks passed.');

const u07Wire=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/u07-preset.json'),'utf8'));
check('U07 production personal preset parsed',()=>{const t=u01.parseCometDifficultyPreset(u07Wire.cometPreset);assert.ok(t);assert.equal(t.presetName,'My Customs setup');assert.equal(t.presetRevision,3);assert.equal(t.modifiedSincePreset,true);assert.ok(u01.cometDifficultyPresetSummary(t).some(x=>x.includes('Further settings changes')))});
check('U07 exact copy reported',()=>assert.ok(u01.cometDifficultyPresetSummary({...u07Wire.cometPreset,modifiedSincePreset:false}).some(x=>x.includes('match this personal preset revision'))));
for(const bad of [{presetName:''},{presetName:' x'},{presetName:'x'.repeat(81)},{presetName:'bad\nname'},{presetId:'wrong'},{presetId:null},{presetRevision:0},{presetRevision:1.5},{presetRevision:Infinity},{modifiedSincePreset:1},{modifiedSincePreset:null}])check('U07 malformed identity rejected',()=>assert.equal(u01.parseCometDifficultyPreset({...u07Wire.cometPreset,...bad}),null));
check('U07 nullable legacy identity preserved',()=>assert.ok(u01.parseCometDifficultyPreset({...u01Wire.cometPreset,presetName:null,presetId:null,presetRevision:null,modifiedSincePreset:null})));
check('U07 raid context never replaces bot action or map colour',()=>assert.equal(prepare([{...u07Wire,id:1002,time:100,cometSession:u07Wire.session,detail:u07Wire}], 'pmc-1').length,0));
console.log('Including U07: '+checks+' map and diagnostic checks passed.');

const i02=load('../Private/src/helpers/cometControlHandoff.ts');
const i02Wire=JSON.parse(fs.readFileSync(path.join(__dirname,'../../COMET/artifacts/i02/control.json'),'utf8'));
const i02Row=(id,time,changes={},extra={})=>row(id,time,'evaluated','ControlHandoff',{feature:'I02',detail:{botInstance:'instance',controlHandoff:{...i02Wire.controlHandoff,...changes}},...extra});
check('I02 production event parses',()=>assert.ok(i02.parseCometControlHandoff(i02Wire.controlHandoff)));
for(const line of fs.readFileSync(path.join(__dirname,'../../COMET/artifacts/i02/control.jsonl'),'utf8').trim().split(/\r?\n/))check('I02 production event roundtrip',()=>assert.ok(i02.parseCometControlHandoff(JSON.parse(line).controlHandoff)));
for(const owner of ['questing','looting','orbit','extraction','other'])check('I02 observes '+owner+' without inventing an action',()=>{
 const view=state(ready([i02Row(1,1000,{owner})]),1100,'SAIN:Search',900,false);
 assert.equal(view.decision,'SAIN:Search');assert.equal(view.actionActive,false);assert.equal(view.controlHandoff.owner,owner);assert.match(tooltip(view),/Control handoff/);
 assert.equal(getBehaviorCategory(view.decision).key,getBehaviorCategory('SAIN:Search').key);
});
check('I02 takeover clears older sampled COMET action',()=>{
 const view=state(ready([row(1,900,'accepted','Hold'),i02Row(2,1000)]),1100,'COMET:Hold',900,false);
 assert.equal(view.actionActive,false);assert.equal(view.decision,'');
});
check('I02 renewed COMET action wins',()=>{
 const view=state(ready([i02Row(1,1000),row(2,1100,'accepted','Search')]),1200,'COMET:Search',1100,false);
 assert.equal(view.actionActive,true);assert.equal(view.decision,'COMET:Search');
});
for(const [at,ghost] of [[999,false],[31001,false],[1100,true]])check('I02 bounded context '+at+'/'+ghost,()=>assert.equal(state(ready([i02Row(1,1000)]),at,'SAIN:Search',900,ghost).controlHandoff,undefined));
check('I02 sleep is visible in ghost',()=>assert.equal(state(ready([i02Row(1,1000,{owner:'sleep'})]),1100,'',900,true).controlHandoff.owner,'sleep'));
for(const extra of [{cometSession:'next'},{detail:{botInstance:'next',contact:{target:'enemy'}}}])check('I02 instance reset',()=>assert.equal(state(ready([i02Row(1,1000),row(2,1050,'selected','Hold',extra)]),1100,'SAIN:Search',900,false).controlHandoff,undefined));
check('I02 lifecycle reset',()=>assert.equal(state(ready([i02Row(1,1000),c09Row(2,1050,{state:'sleeping'})]),1100,'SAIN:Search',900,false).controlHandoff,undefined));
for(const extra of [{feature:'A01'},{decision:'Other'},{stage:'selected'}])check('I02 reject mislabeled payload',()=>assert.equal(ready([i02Row(1,1000,{},extra)]).events.length,0));
for(const bad of [null,[],{state:'executed'},{owner:'guess'},{layer:null},{elapsed:-1},{elapsed:Infinity},{pending:1},{rapidReturns:-1},{rapidReturns:.2},{reason:'x'.repeat(257)}])check('I02 rejects malformed context',()=>assert.equal(i02.parseCometControlHandoff(bad===null||Array.isArray(bad)?bad:{...i02Wire.controlHandoff,...bad}),null));
for(const key of ['layer','reason','releasedAction','previousOwner'])check('I02 escapes '+key,()=>assert.ok(!tooltip(state(ready([i02Row(1,1000,{[key]:'<img src=x onerror=x>',pending:true})]),1100,'SAIN:Search',900,false)).includes('<img')));
console.log('Including I02: '+checks+' map and diagnostic checks passed.');
