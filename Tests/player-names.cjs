const fs = require('fs'), vm = require('vm'), path = require('path');
const ts = require('../Private/node_modules/typescript');
const assert = require('node:assert/strict');
function load(file) {
    const filename = path.resolve(__dirname, file);
    const context = { exports: {}, require: name => name.endsWith('.json')
        ? require(path.resolve(path.dirname(filename), name))
        : load(path.relative(__dirname, path.resolve(path.dirname(filename), name + '.ts'))) };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
    }).outputText, context);
    return context.exports;
}
const { displayPlayerName: name } = load('../Private/src/helpers/playerNames.ts');
const cases = [
    ['Санитар', 'Sanitar'], ['Дед Мороз', 'Santa Claus'], ['Партизан', 'Partizan'],
    ['Журавлёв Тестовый', 'Zhuravlyov Testovyy'], ['ЮЛИЯ-ЩУКА_42', 'YULIYA-SHCHUKA_42'],
    ['Юлия Щука', 'Yuliya Shchuka'], ['Shadow_Щупальце99', 'Shadow_Shchupaltse99'],
    ['съёмщик', 'syomshchik'], ['Ілля Ґринь', 'Illya Grin'],
    ['Quincy', 'Quincy'], ['Knight', 'Knight'], ['123_ID', '123_ID'],
    ['René 日本 😀', 'René 日本 😀'], ['constructor', 'constructor'],
    ['<color=red>Журавлёв Тестовый</color>', 'Zhuravlyov Testovyy'],
    ['<b>Санитар</b>', 'Sanitar'], ['', 'Unknown'], [null, 'Unknown'], [undefined, 'Unknown'],
];
for (const [input, expected] of cases) assert.equal(name(input), expected, String(input));
assert.equal(name('', 'profile-123'), 'profile-123');
assert.equal(name(undefined, ''), '');
const recorded = Object.freeze({ profileId: 'unchanged-123', name: 'Журавлёв Тестовый' });
assert.equal(name(recorded.name), 'Zhuravlyov Testovyy');
assert.equal(recorded.name, 'Журавлёв Тестовый');
// Cache eviction must not alter display names or fallback semantics.
for (let i = 0; i < 2050; i++) name('Журавлёв_' + i);
assert.equal(name(recorded.name), 'Zhuravlyov Testovyy');
assert.equal(name(null, 'No trigger'), 'No trigger');
console.log(`${cases.length + 6} player-name checks passed`);
