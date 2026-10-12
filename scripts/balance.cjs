const fs = require('node:fs');
const path = require('node:path');
const E = require('./engine-loader.cjs');
const count = Number(process.env.BALANCE_SEEDS || 200);
const offset = Number(process.env.BALANCE_OFFSET || 0);
const seedHash = n => { n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; return Math.imul(n, 0xc2b2ae35) >>> 0; };
function goalDistances(g) {
  const open = new Set(g.tiles.filter(t => t.kind !== 'wall').map(t => t.key));
  const result = new Map([[g.goal, 0]]), queue = [g.goal];
  for (let i=0;i<queue.length;i++) {
    const [q,r] = E.coords(queue[i]);
    for (const [dq,dr] of E.DIRECTIONS) {
      const id = E.key(q+dq,r+dr);
      if(open.has(id) && !result.has(id)) {result.set(id,result.get(queue[i])+1);queue.push(id);}
    }
  }
  return result;
}
const percentile = (a,p) => [...a].sort((a,b)=>a-b)[Math.min(a.length-1,Math.floor(a.length*p))];
const mean = a => +(a.reduce((s,n)=>s+n,0)/a.length).toFixed(2);
const rows=[];
for(const [mode,radius] of [['booth',3],['challenge',6],['challenge',8]]) for(const policy of ['random','goal','forager']) {
  const runs=[];
  for(let i=offset;i<offset+count;i++) {
    let g=E.createGame(mode,seedHash(i+712),false,false,radius,seedHash(i));
    const dist=goalDistances(g), visits=new Map([[g.pos,1]]); let waits=0,rescues=0,offered=0,decisionRng=seedHash(i+12345),actions=0;
    while(g.phase!=='won'&&g.phase!=='lost') {
      if(++actions>400) throw new Error('Unbounded game');
      if(g.phase==='ready')g=E.roll(g);
      if(E.canRescue?.(g)){g=E.rescue(g);rescues++;continue;}
      if(E.stuck(g)){g=E.waitTurn(g);waits++;continue;}
      const faces=[...new Set(g.dice)].filter(f=>E.pathFor(g,f).length);offered+=faces.length;
      if(policy==='random') { let v;[v,decisionRng]=E.random(decisionRng);g=E.move(g,faces[Math.floor(v*faces.length)]); }
      else {
        const candidates=faces.map(f=>{
          const n=E.move(g,f),progress=dist.get(g.pos)-dist.get(n.pos);
          const food=n.nutrients-g.nutrients,refuel=n.turn===g.turn;
          const score=n.phase==='won'?10000:progress*10-(visits.get(n.pos)||0)*2+(policy==='forager'?food*9+(refuel?4:0):food*.4);
          return {n,score};
        });
        candidates.sort((a,b)=>b.score-a.score);g=candidates[0].n;
      }
      visits.set(g.pos,(visits.get(g.pos)||0)+1);
    }
    runs.push({won:g.phase==='won',score:g.score,turns:g.turn,moves:g.moves,waits,rescues,food:g.nutrients,combo:g.bestCombo,choices:offered/Math.max(1,g.moves-waits)});
  }
  rows.push({mode,radius,policy,games:count,winPercent:mean(runs.map(r=>100*Number(r.won))),scoreMedian:percentile(runs.map(r=>r.score),.5),scoreP90:percentile(runs.map(r=>r.score),.9),meanTurns:mean(runs.map(r=>r.turns)),meanMoves:mean(runs.map(r=>r.moves)),meanFood:mean(runs.map(r=>r.food)),meanBestCombo:mean(runs.map(r=>r.combo)),waitPercent: +(100*runs.reduce((s,r)=>s+r.waits,0)/runs.reduce((s,r)=>s+r.moves,0)).toFixed(2),meanRescues:mean(runs.map(r=>r.rescues)),meanChoices:mean(runs.map(r=>r.choices))});
}
const result={version:E.RULE_VERSION,seedOffset:offset,seedsPerScenario:count,description:'Deterministic simulations. Agents see the board and rolled dice; no future RNG access. Not human playtest results.',rows};
const target=path.join(__dirname,'../',process.argv[2]||'balance-report.json');fs.writeFileSync(target,JSON.stringify(result,null,2));
console.table(rows.map(({mode,radius,policy,winPercent,meanTurns,meanBestCombo,waitPercent})=>({mode,radius,policy,winPercent,meanTurns,meanBestCombo,waitPercent})));
