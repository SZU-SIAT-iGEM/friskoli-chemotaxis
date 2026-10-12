const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../src/game/mapgen.ts'),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const loaded={exports:{}};
new Function('exports','module',compiled)(loaded.exports,loaded);
const {generateWorld}=loaded.exports;
const dirs=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const summary=[];
for(const radius of [4,6,8,10]) {
 const size=radius===6||radius===8?1000:100;
 const stats=[];
 for(let seed=0;seed<size;seed++) {
  const m=generateWorld(seed,radius),byKey=new Map(m.tiles.map(t=>[t.key,t]));
  const adjacent=t=>dirs.map(([q,r])=>byKey.get(`${t.q+q},${t.r+r}`)).filter(Boolean);
  assert.equal(m.tiles.length,1+3*radius*(radius+1));
  assert.equal(new Set(m.tiles.map(t=>t.key)).size,m.tiles.length);
  assert.equal(byKey.get(m.goal).kind,'goal');
  assert.equal(byKey.get(m.start).kind,'empty');
  const open=m.tiles.filter(t=>t.kind!=='wall');
  const visited=new Set([m.start]),queue=[byKey.get(m.start)];
  for(let i=0;i<queue.length;i++) for(const n of adjacent(queue[i])) if(n.kind!=='wall'&&!visited.has(n.key)) { visited.add(n.key);queue.push(n); }
  assert.equal(visited.size,open.length,`disconnected ${radius}/${seed}`);
  for(const t of open) {
   const boundary=Math.max(Math.abs(t.q),Math.abs(t.r),Math.abs(t.q+t.r))===radius;
   assert(adjacent(t).filter(t=>t.kind!=='wall').length>=(boundary?2:3),`degree ${radius}/${seed}/${t.key}`);
  }
  for(const a of m.anchors) assert(visited.has(a.key),`anchor unreachable ${a.key}`);
  for(const t of m.tiles) assert(!t.depleted||t.kind==='empty');
  assert.equal(m.frames.length,7);
  if(seed%100===0) assert.deepEqual(m,generateWorld(seed,radius));
  const direct=(()=>{const a=byKey.get(m.start),b=byKey.get(m.goal);return (Math.abs(a.q-b.q)+Math.abs(a.r-b.r)+Math.abs(a.q+a.r-b.q-b.r))/2;})();
  stats.push({walls:m.generation.wallCount,food:m.generation.foodCount,path:m.generation.shortestPath,direct,limit:m.turnLimit,depletion:m.tiles.filter(t=>t.depleted).length});
 }
 summary.push({radius,seeds:size,...Object.fromEntries(Object.keys(stats[0]).map(k=>[k,{min:Math.min(...stats.map(s=>s[k])),mean:+(stats.reduce((s,x)=>s+x[k],0)/size).toFixed(2),max:Math.max(...stats.map(s=>s[k]))}]))});
}
console.log(JSON.stringify(summary,null,2));
