import fs from 'node:fs/promises'
import ts from 'typescript'
import assert from 'node:assert/strict'
async function module(path,globals={}){const source=await fs.readFile(new URL(path,import.meta.url),'utf8');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;const exports={};new Function('exports',...Object.keys(globals),js)(exports,...Object.values(globals));return exports}
const {level,damage}=await module('../src/levels.ts')
for(let world=0;world<3;world++){
 const l=level(world);assert.ok(l.width>=6200);assert.equal(l.stars.length,30);assert.equal(l.lumas.length,3)
 for(let i=1;i<l.ground.length;i++){const a=l.ground[i-1],b=l.ground[i];assert.ok(b.x-b.width/2-(a.x+a.width/2)<=150,'Gap exceeds comfortable jump')}
 for(const p of l.ledges){const lower=l.ledges.find(q=>q!==p&&Math.abs(q.x-p.x)<150&&q.y>p.y);if(lower)assert.ok(lower.y-p.y<=155);else assert.ok(476-p.y<=155)}
 for(const x of l.checkpoints)assert.ok(l.ground.some(p=>Math.abs(x-p.x)<p.width/2))
 assert.ok(l.portal<l.width)
}
let lives=5,until=0
for(let now=100;now<=1000;now+=100){const hit=damage(lives,now,until);lives=hit.lives;if(hit.hit)until=now+1800}
assert.equal(lives,4,'Repeated overlap must consume only one heart')
assert.deepEqual(damage(4,200,1900,true),{lives:3,hit:true},'Falling consumes one heart')
assert.deepEqual(damage(1,2000,0),{lives:0,hit:true});assert.deepEqual(damage(0,4000,0),{lives:0,hit:false})
const storage=new Map();const {load,save}=await module('../src/progress.ts',{localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}})
storage.set('agnes-stars-v1',JSON.stringify({world:2,checkpoint:2,stars:['2:s1'],lumas:['2:l0'],completed:[0,1],sound:true}));assert.equal(load().lives,5);assert.equal(load().stars[0],'2:s1')
save({...load(),world:3,lives:0});assert.equal(load().world,3);assert.equal(load().lives,0)
console.log('PASS: extended level reachability, 90 stars, checkpoints, single-hit protection, last life and saved-progress migration.')
