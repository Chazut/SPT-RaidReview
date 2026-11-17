const fs=require('fs'), vm=require('vm'), assert=require('node:assert/strict'), ts=require('../Private/node_modules/typescript');
const ctx={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('Private/src/helpers/cometStream.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,ctx);
const {newCometStream,appendCometPage}=ctx.exports;
const s=newCometStream();
const page=(id,more=true)=>({events:[{id,time:10}],hasMore:more,next:{time:10,id}});
assert.equal(appendCometPage(s,page(1)).publish,true);
assert.equal(appendCometPage(s,page(2)).publish,true);
assert.equal(appendCometPage(s,page(3)).publish,false);
assert.equal(s.cursor.id,3); // A cancelled request can resume after the last completed page.
assert.throws(()=>appendCometPage(s,page(3)),/cursor/);
assert.throws(()=>appendCometPage(s,{events:[],hasMore:true,next:{time:11,id:4}}),/cursor/);
assert.equal(s.rows.length,3); // Invalid pages cannot advance the cached stream.
assert.equal(appendCometPage(s,page(4,false)).done,true);
assert.equal(s.rows.length,4);
assert.equal(appendCometPage(newCometStream(),{events:[],hasMore:false,next:null}).done,true);
let work=0;const long=newCometStream();
for(let id=1;id<=10000;id++)if(appendCometPage(long,page(id,id<10000)).publish)work+=long.rows.length;
assert.ok(work<30000,'progressive prefix parsing remains linear in recording length');
console.log('COMET cursor/resume/progressive parsing: 11 checks passed');
