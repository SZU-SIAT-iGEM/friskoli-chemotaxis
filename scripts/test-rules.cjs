const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('./engine-loader.cjs');
const V=E.loadGameModule('viewport.ts');
let passed=0;
function test(name,fn){fn();passed++;console.log(`PASS ${name}`);}
function fixture(overrides={}){
 const g=E.createGame('booth',417);return {...g,pos:'-2,0',phase:'choose',dice:[1],tiles:g.tiles.map(t=>({...t,kind:t.key===g.goal?'goal':'empty',depleted:false})),...overrides};
}
function food(g,keys){return {...g,tiles:g.tiles.map(t=>keys.includes(t.key)?{...t,kind:'nutrient'}:t)};}
test('same seeds reproduce world and dice without mutation',()=>{
 const a=E.createGame('challenge',910,false,false,6,17),b=E.createGame('challenge',910,false,false,6,17);assert.deepEqual(a,b);
 const snapshot=JSON.stringify(a);assert.deepEqual(E.roll(a),E.roll(b));assert.equal(JSON.stringify(a),snapshot);
});
test('map RNG never consumes dice RNG',()=>{assert.equal(E.createGame('challenge',11,false,false,6,3).rng,E.createGame('challenge',11,false,false,8,45).rng);});
test('unoffered directions, partial runs and invalid moves do nothing',()=>{const g=fixture({dice:[1,1]});for(const [f,n] of [[1,1],[2,1],[7,1],[1,0],[NaN,2]])assert.equal(E.move(g,f,n),g);assert.deepEqual(E.pathFor(g,1,Infinity),[]);});
test('matching dice move the full distance and spend a turn',()=>{const g=fixture({dice:[1,1,2]});const n=E.move(g,1);assert.equal(n.pos,'0,0');assert.equal(n.turn,1);assert.equal(n.lastPath.length,2);});
test('food chaining awards 10 + 25 and refuels, capped at three actions',()=>{
 let g=food(fixture(),['-1,0','0,0','1,0']);g=E.move(g,1);assert.equal(g.score,10);assert.equal(g.turn,0);assert.equal(g.action,1);
 g=E.move({...g,phase:'choose',dice:[1]},1);assert.equal(g.score,35);assert.equal(g.action,2);
 g=E.move({...g,phase:'choose',dice:[1]},1);assert.equal(g.score,75);assert.equal(g.turn,1);assert.equal(g.action,0);
});
test('one empty tile preserves combo through the next nutrient',()=>{const g=food(fixture({dice:[1,1],combo:3}),['0,0']);const n=E.move(g,1);assert.equal(n.combo,4);assert.equal(n.score,55);assert(!n.broke);assert.equal(n.comboGap,0);assert.equal(n.turn,0);});
test('second foodless tile breaks the chain, including across moves',()=>{let g=fixture({combo:3});g=E.move(g,1);assert.equal(g.combo,3);assert.equal(g.comboGap,1);g=E.move({...g,phase:'choose',dice:[1]},1);assert.equal(g.combo,0);assert(g.broke);});
test('collected food cannot be farmed',()=>{const g=food(fixture({consumed:['-1,0']}),['-1,0']);const n=E.move(g,1);assert.equal(n.nutrients,0);assert.equal(n.score,0);assert.equal(n.turn,1);});
test('wall truncates movement and prevents refuel',()=>{let g=food(fixture({dice:[1,1]}),['-1,0']);g={...g,tiles:g.tiles.map(t=>t.key==='0,0'?{...t,kind:'wall'}:t)};const n=E.move(g,1);assert.equal(n.pos,'-1,0');assert(n.crashed);assert.equal(n.turn,1);assert.equal(n.event,'collision');});
test('goal interrupts a long run and wins on final allowed turn',()=>{const g=fixture({pos:'2,0',dice:[1,1,1],turn:10});const n=E.move(g,1);assert.equal(n.phase,'won');assert.equal(n.turn,11);assert.equal(n.score,0);assert.equal(n.lastPath.length,1);});
test('spare-turn bonus counts the finishing turn',()=>{const g=fixture({pos:'2,0',turn:5,score:75});assert.equal(E.move(g,1).score,175);});
test('turn exhaustion ends non-refuelling run',()=>{const n=E.move(fixture({turn:10}),1);assert.equal(n.phase,'lost');assert.equal(n.event,'lost');});
test('environment keeps three base dice; food adds one and repellent has priority',()=>{let g=fixture({phase:'ready'});assert.equal(E.diceCount(g),3);g=food(g,['-1,0']);assert.equal(E.diceCount(g),4);g={...g,tiles:g.tiles.map(t=>t.key==='-2,1'?{...t,kind:'repellent'}:t)};assert.equal(E.diceCount(g),3);assert.equal(E.zone({...fixture(),consumed:['-1,0']}),'depleted');});
test('all-blocked retry is free, preserves combo, advances RNG once',()=>{const g=fixture({pos:'-3,0',dice:[4,5],combo:2});assert(E.canRescue(g));const n=E.rescue(g);assert.equal(n.turn,g.turn);assert.equal(n.action,g.action);assert.equal(n.combo,2);assert.equal(n.rescues,1);assert(n.rescueUsed);assert.notEqual(n.rng,g.rng);assert.equal(E.rescue(n),n);assert.equal(E.waitTurn(g),g);});
test('retry is unavailable when even one offered direction is legal',()=>{const g=fixture({pos:'-3,0',dice:[4,1]});assert(!E.canRescue(g));assert.equal(E.rescue(g),g);});
test('second fully blocked roll waits and clears stale feedback',()=>{const g=fixture({pos:'-3,0',dice:[4,5],combo:2,rescueUsed:true,lastGain:50,eventN:4});const n=E.waitTurn(g);assert.equal(n.turn,1);assert.equal(n.waits,1);assert.equal(n.combo,0);assert.equal(n.lastGain,0);assert.equal(n.eventN,0);assert(!n.rescueUsed);});
test('free retry remains spent across refuel within the same turn',()=>{const g=food(fixture({rescueUsed:true}),['-1,0']);assert(E.move(g,1).rescueUsed);assert(!E.move({...g,action:2},1).rescueUsed);});
test('empty dice are not a stuck game',()=>{assert(!E.stuck(fixture({dice:[]})));});
test('forecast exactly matches move, never changes live state or RNG',()=>{const g=food(fixture({dice:[1,1],combo:2}),['-1,0','0,0']);const before=JSON.stringify(g),f=E.forecast(g,1),n=E.move(g,1);assert.deepEqual(f.path,n.lastPath);assert.equal(f.gain,n.score-g.score);assert.equal(f.combo,n.combo);assert.equal(JSON.stringify(g),before);assert.equal(E.forecast(g,6),null);});
test('tutorial teaches real runs, grace, cancellation, lock and goal multiplication',()=>{
 let g=E.createGame('booth',1,false,true);
 const scores=[10,75,75,85,110,250],combos=[1,3,3,1,2,2];
 for(let i=0;i<E.LESSON_FACES.length;i++){
  const expected=E.diceCount(g);g=E.roll(g);assert.equal(g.dice.length,expected);
  if(i===2||i===3)assert(g.dice.some(d=>d<0));if(i===5)assert(g.dice.includes(0));
  const n=E.move(g,E.LESSON_FACES[i]);assert.notEqual(n,g);g=n;assert.equal(g.score,scores[i]);assert.equal(g.combo,combos[i]);
 }
 assert.equal(g.phase,'won');assert.equal(g.longRuns,2);
});
test('depleted pool has one locked stay die and two mobile dice',()=>{
 const g=fixture({phase:'ready',tiles:fixture().tiles.map(t=>({...t,depleted:true}))});const n=E.roll(g);assert.equal(n.dice.length,3);assert.equal(n.dice.filter(d=>d===0).length,1);assert.equal(n.dice.filter(d=>d>0).length,2);assert.equal(E.move(n,0),n);
});
test('repellent cancels exactly one die, not its entire direction',()=>{
 const g=fixture({phase:'ready',tiles:fixture().tiles.map(t=>t.key==='-2,0'?{...t,kind:'repellent'}:t)});const n=E.roll(g);assert.equal(n.dice.length,3);assert.equal(n.dice.filter(d=>d<0).length,1);assert.equal(n.dice.filter(d=>d>0).length,2);
 const c={...n,dice:[-1,1,1]};assert.equal(E.runLength(c,1),2);assert.equal(E.move(c,-1),c);assert.equal(E.move(c,1).lastPath.length,2);
});
test('repellent signal weights movement away from its centre',()=>{
 const g=fixture({pos:'-1,0',tiles:fixture().tiles.map(t=>t.key==='-2,0'?{...t,kind:'repellent'}:t)});const p=E.probabilities(g);assert(p[0]>p[3]);
});
test('negation selects the deepest inward die regardless of its slot',()=>{
 const g=fixture({pos:'-1,0',tiles:fixture().tiles.map(t=>t.key==='-2,0'?{...t,kind:'repellent'}:t)});
 assert.deepEqual(E.negateInwardDie(g,[1,4,5]),[1,-4,5]);assert.deepEqual(E.negateInwardDie(g,[5,1,4]),[5,1,-4]);
 for(let seed=0;seed<60;seed++){const n=E.roll({...g,phase:'ready',rng:seed});const cancelled=Math.abs(n.dice.find(d=>d<0));assert(n.dice.filter(d=>d>0).every(d=>E.repulsionChange(g,cancelled)>=E.repulsionChange(g,d)));}
});
test('depleted lock disappears on the next roll outside depletion',()=>{
 let g=fixture({phase:'choose',dice:[0,1,2],tiles:fixture().tiles.map(t=>({...t,depleted:t.key==='-2,0'}))});g=E.move(g,1);assert.equal(E.zone(g),'normal');assert(E.roll(g).dice.every(d=>d>0));
});
test('goal does not alter local field probabilities',()=>{const g=fixture({pos:'2,0'}),p=E.probabilities(g);assert(p.every(x=>Math.abs(x-1/6)<1e-10));});
test('finish doubles all feeding points before spare-turn reward',()=>{const g=fixture({pos:'2,0',score:420,turn:10});assert.equal(E.move(g,1).score,840);});
test('probabilities remain positive and sum to one across both strains',()=>{for(const strain of [false,true])for(let seed=0;seed<100;seed++){const g=E.createGame('challenge',seed,strain,false,6,seed);for(const pos of [g.start,g.goal]){const p=E.probabilities({...g,pos});assert(p.every(n=>n>0&&n<1));assert(Math.abs(p.reduce((a,b)=>a+b)-1)<1e-12);}}});
const frame={left:0,top:0,width:640,height:520};
test('viewport fit and bounds keep the map reachable',()=>{assert.deepEqual(V.clampView({zoom:.4,center:[-900,2000]}),{zoom:1,center:[320,260]});const v=V.clampView({zoom:8,center:[-1000,1000]});assert.equal(v.zoom,2.8);assert(v.center[0]>0&&v.center[1]<520);});
test('pinch doubles zoom while preserving the central anchor',()=>{const v=V.pinchView({zoom:1,center:[320,260]},[{x:270,y:260},{x:370,y:260}],[{x:220,y:260},{x:420,y:260}],frame);assert.equal(v.zoom,2);assert.deepEqual(v.center,[320,260]);});
test('pan uses zoom scale and clamps at edges',()=>{assert.deepEqual(V.panView({zoom:2,center:[320,260]},40,20,frame),{zoom:2,center:[300,250]});assert.deepEqual(V.panView({zoom:1,center:[320,260]},40,20,frame),{zoom:1,center:[320,260]});});
test('off-centre zoom keeps the point beneath the cursor',()=>{const v=V.zoomView({zoom:1,center:[320,260]},2,{x:400,y:260},frame);assert.equal(v.center[0],360);});
test('two-finger translation and one-finger continuation are continuous',()=>{const v=V.pinchView({zoom:2,center:[320,260]},[{x:270,y:260},{x:370,y:260}],[{x:290,y:280},{x:390,y:280}],frame);assert.deepEqual(v.center,[310,250]);assert.deepEqual(V.panView(v,0,0,frame),v);});
test('bilingual keys and interpolation placeholders match',()=>{const zh=JSON.parse(fs.readFileSync(path.join(__dirname,'../src/lang/zh-CN.json'))).strings,en=JSON.parse(fs.readFileSync(path.join(__dirname,'../src/lang/en.json'))).strings;assert.deepEqual(Object.keys(zh).sort(),Object.keys(en).sort());for(const k in zh)assert.deepEqual([...zh[k].matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(),[...en[k].matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(),k);});
console.log(`${passed} rule, gesture geometry and language checks passed.`);
