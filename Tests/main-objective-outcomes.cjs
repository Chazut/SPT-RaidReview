const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../Private/node_modules/typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('Private/src/helpers/mainObjectives.ts', 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const h = context.exports;
let checks = 0;
function equal(a, b) { assert.equal(a, b); checks++; }

// Recorded ORBIT outcome from Customs raid 460: only the first of three search
// sectors was needed because the squad killed its target. The sector count is
// not a requirement to visit more areas after a successful kill.
const killed = { type: 'Rush', operationId: 'Boss', operationName: 'Boss rush', completed: true,
    operationStep: 'ZoneDormitory 1', operationStepIndex: 1, operationStepCount: 3,
    operationState: 'boss killed by squad' };
equal(h.mainAbandoned(killed), false);
equal(h.mainStarted(killed), false);
equal(h.mainInterrupted(killed), false);
equal(h.operationDetail(killed), '1/3: ZoneDormitory 1 (boss killed by squad)');
for (const operationState of ['completed', 'boss seen', 'boss body found', 'boss not found'])
    equal(h.mainAbandoned({ ...killed, operationState }), false);
for (const operationState of ['failed: incomplete boss search', 'cancelled for extraction or settings', 'no remaining member'])
    equal(h.mainAbandoned({ ...killed, operationState }), true);
equal(h.mainAbandoned({ ...killed, operationId: 'Custom', operationState: 'failed: no NavMesh near configured point' }), true);
equal(h.mainAbandoned({ ...killed, completed: false, operationState: 'approach' }), false);
equal(h.mainStarted({ ...killed, completed: false, operationState: 'approach' }), true);
equal(h.mainAbandoned({ type: 'MultiStep', completed: true, operationState: 'completed' }), false);
equal(h.mainAbandoned({ type: 'MultiStep', completed: true, operationState: 'failed: door interaction blocked' }), true);
equal(h.mainAbandoned({ type: 'ExtractCamp', completed: true, campState: 'failed' }), true);
console.log(`Main objective outcomes: ${checks} checks passed.`);
