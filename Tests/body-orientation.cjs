const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../Private/node_modules/typescript');
const load = path => {
    const context = { exports: {} };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve(path), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText, context);
    return context.exports;
};
const { bodyOrientationAngle } = load('../Private/src/helpers/bodyOrientation.ts');
const { positionAt } = load('../Private/src/helpers/floorFilter.ts');
let checks = 0;
const closeAngle = (actual, expected) => {
    assert.notEqual(actual, null);
    assert.ok(Math.abs(((actual - expected + 540) % 360) - 180) < 1e-6, `${actual} != ${expected}`);
    checks++;
};
const project = (x,z) => ({x,y:-z});
for (const x of [0,1000,-1000]) for (const z of [0,1000,-1000]) {
    for (const yaw of [0,45,90,180,270,315,359]) closeAngle(bodyOrientationAngle({x,z,bodyYaw:yaw},project),yaw);
}
for (const sample of [null, {}, {dir:90}, {bodyYaw:null}, {bodyYaw:undefined}, {bodyYaw:NaN},
    {bodyYaw:Infinity}, {bodyYaw:'90'}, {bodyYaw:0,ghost:true}, {bodyYaw:90,dormant:true}, {bodyYaw:90,x:NaN}]) {
    assert.equal(bodyOrientationAngle(sample && {x:0,z:0,...sample},project),null); checks++;
}
closeAngle(bodyOrientationAngle({x:0,z:0,bodyYaw:0,ghost:false,dormant:true},project),0);
assert.equal(bodyOrientationAngle({x:0,z:0,bodyYaw:90},()=>({x:0,y:0})),null); checks++;

// Map rotations, mirror axes, anisotropic scale and zoom all affect screen direction.
for (const rotation of [0,90,180,270]) for (const scaleX of [-2,0.38,1]) for (const scaleZ of [-1,0.38,3]) {
    const r=rotation*Math.PI/180;
    const projection=(x,z)=>({x:scaleX*(x*Math.cos(r)-z*Math.sin(r))+140,y:-scaleZ*(x*Math.sin(r)+z*Math.cos(r))+65});
    for (const [yaw,dx,dz] of [[0,0,1],[90,1,0],[180,0,-1],[270,-1,0]]) {
        const a=projection(0,0), b=projection(dx,dz);
        closeAngle(bodyOrientationAngle({x:900,z:-500,bodyYaw:yaw},projection),Math.atan2(b.x-a.x,a.y-b.y)*180/Math.PI);
    }
}
// Replay cursor, stationary turns, strafing/backpedalling and Ghost transitions:
// orientation always comes from this sample, never the trajectory or future data.
const samples = [
    {time:0,x:0,z:0,bodyYaw:0}, {time:200,x:0,z:0,bodyYaw:90},
    {time:400,x:-10,z:0,bodyYaw:90}, {time:600,x:-10,z:10,bodyYaw:90},
    {time:800,x:-10,z:20,bodyYaw:90,ghost:true}, {time:1000,x:-10,z:30,bodyYaw:270,ghost:false}
];
for (const [time,expected] of [[1000,270],[800,null],[600,90],[400,90],[200,90],[0,0],[-1,null],[850,null],[1000,270]]) {
    const actual=bodyOrientationAngle(positionAt(samples,time),project);
    if (expected==null) { assert.equal(actual,null); checks++; } else closeAngle(actual,expected);
}
console.log(`Body orientation: ${checks} checks passed`);
