const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('node:assert/strict');
const ts = require('../Private/node_modules/typescript');
const cache = new Map();
function load(filename) {
    filename = path.resolve(__dirname, filename);
    if (cache.has(filename)) return cache.get(filename);
    const context = { exports: {}, require: name => {
        if (name.endsWith('.css')) return {};
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

const { isPbtCheater, pbtDescription, pbtMarkerHtml } = load('../Private/src/helpers/pbtCheaters.ts');
const Badge = load('../Private/src/component/PbtCheaterBadge.tsx').default;
const { getBehaviorCategory, getDecisionSource, formatDecisionLabel } = load('../Private/src/helpers/botBehavior.ts');
const React = require('../Private/node_modules/react');
const { renderToStaticMarkup } = require('../Private/node_modules/react-dom/server');
let checks = 0;
function check(name, f) { f(); checks++; }
const bot = { profileId:'pbt', type:'PMC|USEC', mod_SAIN_brain:'Chad', mod_PBT_cheater:1, mod_PBT_personality:'Rage', mod_PBT_cheats:'Aimbot,Godmode,Fly' };
check('Explicit identity only',()=>{
    for(const v of [true,1,'1','true','True']) assert.ok(isPbtCheater({...bot,mod_PBT_cheater:v}));
    for(const v of [false,0,'false',undefined,{},2]) assert.equal(isPbtCheater({...bot,mod_PBT_cheater:v}),false);
    assert.equal(isPbtCheater({profileId:'cheater',type:'PMC',name:'PbtCheater',mod_SAIN_brain:'Rage'}),false);
});
check('Humans never highlighted',()=>{
    assert.equal(pbtMarkerHtml({...bot,type:'HUMAN'}),'');
    assert.equal(pbtDescription({...bot,mod_SAIN_brain:'PLAYER'}),'');
});
check('Metadata not confused with current action',()=>{
    assert.ok(pbtDescription(bot).includes('Assigned cheats: Aimbot, Invulnerability, Flying'));
    assert.ok(pbtDescription(bot).includes('PBT personality: Rage'));
    assert.equal(getDecisionSource('SAIN:Search'),'SAIN');
    assert.equal(getDecisionSource('Orbit:ContainerLoot'),'ORBIT');
    assert.equal(getDecisionSource('PBT:Cheating'),'PBT');
    assert.equal(getDecisionSource('BL:PbtCheater'),'PBT');
    assert.equal(formatDecisionLabel('PBT:Cheating'),'Cheater behavior');
    assert.equal(getBehaviorCategory('PBT:Cheating').key,'other');
});
check('Known zero vs missing data',()=>{
    assert.ok(pbtDescription({...bot,mod_PBT_cheats:'None'}).endsWith('None'));
    assert.ok(pbtDescription({...bot,mod_PBT_personality:null,mod_PBT_cheats:[]}).endsWith('Not recorded'));
    assert.equal(pbtDescription(null),'');
});
check('Imported metadata safely escaped by React',()=>{
    const html=renderToStaticMarkup(React.createElement(Badge,{player:{...bot,mod_PBT_personality:'<script>bad</script>',mod_PBT_cheats:'" onmouseover="bad'}}));
    assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes(' onmouseover="bad')); assert.ok(html.includes('PBT cheater'));
});
check('Marker adds identity without replacing squad colors or number',()=>{
    assert.ok(pbtMarkerHtml(bot).includes('aria-label="PBT cheater"'));
    const map=fs.readFileSync(path.resolve(__dirname,'../Private/src/component/MapComponent.tsx'),'utf8');
    assert.ok(map.includes('behaviorColor) + comet + pbtMarkerHtml(player)'));
    assert.ok(map.includes('htmlText(pbtDescription(player))'));
});
check('No badge on historical records lacking evidence',()=>assert.equal(renderToStaticMarkup(React.createElement(Badge,{player:{profileId:'old'}})),''));
console.log(`PASS PBT presentation: ${checks} checks`);
