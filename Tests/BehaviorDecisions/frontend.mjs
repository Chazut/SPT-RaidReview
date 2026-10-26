import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../Private/package.json', import.meta.url));
const ts = require('typescript');
const source = readFileSync(new URL('../../Private/src/helpers/botBehavior.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const behavior = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
let checks = 0;
for (const raw of ['9000', '9001', '9002', '9003', '9004', '9157']) {
    assert.equal(behavior.getDecisionSource(raw), 'Unknown');
    assert.equal(behavior.getBehaviorCategory(raw).key, 'other');
    assert.match(behavior.formatDecisionLabel(raw), /Unidentified action/);
    checks += 3;
}
for (const [decision, source, category] of [
    ['Orbit:ContainerLoot', 'ORBIT', 'loot'],
    ['Orbit:LooseLoot', 'ORBIT', 'loot'],
    ['Orbit:Synthetic', 'ORBIT', 'orbit'],
    ['Orbit:CampingAmbushSniper', 'ORBIT', 'ambush'],
    ['SAIN:FirstAid', 'SAIN', 'medical'],
    ['SAIN:StandAndShoot', 'SAIN', 'combat'],
    ['goToLootPointNode', 'Vanilla', 'loot'],
    ['runToCover', 'Vanilla', 'cover'],
]) {
    assert.equal(behavior.getDecisionSource(decision), source);
    assert.equal(behavior.getBehaviorCategory(decision).key, category);
    checks += 2;
}
console.log(`PASS: ${checks} behavior display checks`);
