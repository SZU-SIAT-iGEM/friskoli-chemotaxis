import {generateWorld,type GeneratedWorld} from './mapgen';
export type Mode = 'booth' | 'challenge';
export const RULE_VERSION='1.0';
export const RULES = { dice: {normal:3,rich:4,depleted:3,repellent:3}, maxActions:3, nutrientPoints:10, comboIncrement:15, finishMultiplier:2, spareTurnPoints:5 } as const;
export type Zone = 'normal' | 'rich' | 'depleted' | 'repellent';
export type Tile = { q: number; r: number; key: string; kind: 'empty' | 'nutrient' | 'wall' | 'repellent' | 'goal'; depleted: boolean };
export type Game = {
 version: string; mode: Mode; radius: number; seed: number; rng: number; strain: boolean; lesson: boolean; lastGain: number; world?: GeneratedWorld;
 tiles: Tile[]; pos: string; start: string; goal: string; consumed: string[];
 phase: 'ready' | 'choose' | 'won' | 'lost'; dice: number[]; turn: number; limit: number; action: number; moves: number; crashed: boolean;
 score: number; comboGap: number; combo: number; bestCombo: number; nutrients: number; charge: number;
 trail: string[]; lastPath: string[]; event: string; eventN: number; broke: boolean;
 spentDepleted: number; longRuns: number; escaped: boolean; rolls: number;
 rescueUsed: boolean; rescues: number; waits: number;
};
export const DIRECTIONS = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]] as const;
export const LESSON_FACES=[1,1,2,6,2,1] as const;
export const ARROWS = ['→','↘','↙','←','↖','↗'];
export const key = (q: number, r: number) => `${q},${r}`;
export const coords = (id: string) => id.split(',').map(Number) as [number,number];
export const distance = (a: string, b: string) => { const [q,r]=coords(a),[s,t]=coords(b); return (Math.abs(q-s)+Math.abs(r-t)+Math.abs(q+r-s-t))/2; };
export function random(n: number): [number, number] { const next=(Math.imul(n,1664525)+1013904223)>>>0; return [next/4294967296,next]; }
export function createGame(mode: Mode='booth', seed=Date.now()>>>0, strain=false, lesson=false, mapRadius=6, mapSeed=seed): Game {
 const world=mode==='challenge'&&!lesson?generateWorld(mapSeed,mapRadius):undefined;
 const radius=world?.radius??3;
 const nutrients=new Set(lesson?['-2,0','-1,0','0,0','2,-1','2,0']:['-2,0','-1,-1','0,-2','1,-3','-1,2','0,2','1,1']);
 const walls=new Set(lesson?['-1,-1','1,-2']:['0,0','0,1','1,-2']); const repel=new Set(['-1,1']); const depleted=new Set(lesson?['0,-1','0,3']:['-1,0','1,0','2,0','2,-1','1,-1','0,-1']);
 const start=world?.start??key(-radius,0),goal=world?.goal??key(radius,0); const tiles: Tile[]=world?.tiles??[];
 if(!world)for(let q=-radius;q<=radius;q++)for(let r=-radius;r<=radius;r++)if(Math.abs(q+r)<=radius){const id=key(q,r);tiles.push({q,r,key:id,kind:id===goal?'goal':walls.has(id)?'wall':repel.has(id)?'repellent':nutrients.has(id)?'nutrient':'empty',depleted:depleted.has(id)});}
 return {version:RULE_VERSION,lastGain:0,mode,radius,seed,rng:seed,strain,lesson,world,tiles,pos:start,start,goal,consumed:[],phase:'ready',dice:[],turn:0,limit:lesson?8:world?.turnLimit??11,action:0,moves:0,crashed:false,score:0,comboGap:0,combo:0,bestCombo:0,nutrients:0,charge:0,trail:[start],lastPath:[],event:'start',eventN:0,broke:false,spentDepleted:0,longRuns:0,escaped:false,rolls:0,rescueUsed:false,rescues:0,waits:0};
}
const tileIndexes=new WeakMap<Tile[],Map<string,Tile>>();
export const tileAt = (g: Game, id: string) => {
 let index=tileIndexes.get(g.tiles);if(!index){index=new Map(g.tiles.map(t=>[t.key,t]));tileIndexes.set(g.tiles,index);}return index.get(id);
};
export const hasFood = (g: Game, id: string) => tileAt(g,id)?.kind==='nutrient'&&!g.consumed.includes(id);
export function field(g: Game, id: string): number {
 let food=0,repulsion=0;
 for(const t of g.tiles){if(t.kind!=='repellent'&&(t.kind!=='nutrient'||g.consumed.includes(t.key)))continue;const d=distance(t.key,id);if(t.kind==='nutrient')food=Math.max(food,d===0?1.5:d===1?1:d===2?.3:0);else repulsion+=d===0?1.5:d===1?.65:0;}
 return food-repulsion;
}
export function repulsion(g:Game,id:string):number {
 return g.tiles.reduce((sum,t)=>{if(t.kind!=='repellent')return sum;const d=distance(t.key,id);return sum+(d===0?1.5:d===1?.65:0);},0);
}
export function repulsionChange(g:Game,face:number):number {
 if(face<1||face>6)return -Infinity;
 const [q,r]=coords(g.pos),[dq,dr]=DIRECTIONS[face-1];return repulsion(g,key(q+dq,r+dr))-repulsion(g,g.pos);
}
/** Cancel one individual die with the greatest inward signal change. */
export function negateInwardDie(g:Game,dice:number[]):number[] {
 let index=0;for(let i=1;i<dice.length;i++)if(repulsionChange(g,dice[i])>repulsionChange(g,dice[index]))index=i;
 return dice.map((face,i)=>i===index?-face:face);
}
export function zone(g: Game, id=g.pos): Zone {
 if(g.tiles.some(t=>t.kind==='repellent'&&distance(t.key,id)<=1))return 'repellent';
 if(g.tiles.some(t=>t.kind==='nutrient'&&!g.consumed.includes(t.key)&&distance(t.key,id)<=1))return 'rich';
 if(tileAt(g,id)?.depleted||g.consumed.some(t=>distance(t,id)<=1))return 'depleted';
 return 'normal';
}
export const diceCount=(g: Game)=>RULES.dice[zone(g)];
/** A zero is the immobile die in depleted terrain; it never selects a direction. */
export const lockedDice=(g:Game)=>zone(g)==='depleted'?1:0;
export const runLength=(g:Game,face:number)=>g.dice.filter(n=>n===face).length;
export function pathFor(g: Game, face: number, steps=1): string[] {
 if(!Number.isInteger(face)||face<1||face>6||!Number.isInteger(steps)||steps<1)return [];let [q,r]=coords(g.pos);const [dq,dr]=DIRECTIONS[face-1],path:string[]=[];
 for(let i=0;i<steps;i++){q+=dq;r+=dr;const id=key(q,r),tile=tileAt(g,id);if(!tile||tile.kind==='wall')break;path.push(id);if(id===g.goal)break;}
 return path;
}
export function probabilities(g: Game): number[] {
 const [q,r]=coords(g.pos),here=field(g,g.pos);
 const weights=DIRECTIONS.map(([dq,dr])=>{const id=key(q+dq,r+dr),delta=field(g,id)-here;return Math.exp(Math.max(-.9,Math.min(.9,(g.strain?1:.7)*delta)));});
 const total=weights.reduce((a,b)=>a+b,0);return weights.map(w=>.55/6+.45*w/total);
}
export function roll(g: Game): Game {
 if(g.phase!=='ready')return g;let rng=g.rng;const p=probabilities(g);let dice:number[]=[];
 if(g.lesson&&g.moves<6)dice=[[1,2,5,6],[1,1,5,6],[-4,2,5],[-1,6,6],[2,3,4,5],[0,1,1]][g.moves];
 else {for(let i=0;i<diceCount(g);i++){if(i<lockedDice(g)){dice.push(0);continue;}let v;[v,rng]=random(rng);let n=0;for(;n<5&&v>p[n];n++)v-=p[n];dice.push(n+1);}if(zone(g)==='repellent')dice=negateInwardDie(g,dice);}
 return {...g,rng,dice,phase:'choose',rolls:g.rolls+1,event:'rolled',eventN:dice.length,lastPath:[],lastGain:0,broke:false};
}
export function move(g: Game, face: number, steps=runLength(g,face)): Game {
 if(g.phase!=='choose'||!Number.isInteger(face)||!g.dice.includes(face)||!Number.isInteger(steps)||steps<1||steps!==runLength(g,face))return g;
 if(g.lesson&&face!==LESSON_FACES[g.moves])return g;
 const path=pathFor(g,face,steps);if(!path.length)return g;
 const crashed=path.length<steps&&path[path.length-1]!==g.goal;
 const n:Game={...g,consumed:[...g.consumed],trail:[...g.trail],dice:[],lastPath:path,turn:g.turn,action:g.action+1,moves:g.moves+1,crashed,charge:0,phase:'ready',event:'moved',eventN:0,broke:false};
 const oldZone=zone(g);let ate=0;
 for(const id of path){if(hasFood(n,id)){n.consumed.push(id);n.nutrients++;ate++;n.combo++;n.comboGap=0;n.bestCombo=Math.max(n.bestCombo,n.combo);n.score+=RULES.nutrientPoints+RULES.comboIncrement*(n.combo-1);}else if(n.combo>0){n.comboGap++;if(n.comboGap>=2){n.broke=true;n.combo=0;n.comboGap=0;}}n.pos=id;n.trail.push(id);if(id===g.goal){n.phase='won';break;}}
 n.event=ate?'ate':n.broke?'break':'moved';n.eventN=ate;
 const refuel=hasFood(g,n.pos)&&!crashed&&n.action<RULES.maxActions&&n.phase!=='won';
 if(refuel)n.event='refuel';else{n.turn=g.turn+1;n.action=0;n.rescueUsed=false;}
 if(crashed)n.event='collision';
 if(n.phase==='won')n.score=n.score*RULES.finishMultiplier+RULES.spareTurnPoints*Math.max(0,n.limit-n.turn);
 if(oldZone==='depleted'||oldZone==='repellent'){n.spentDepleted++;if(zone(n)==='normal'||zone(n)==='rich')n.escaped=true;}
 if(path.length>1)n.longRuns++;
 if(n.phase!=='won'&&n.turn>=n.limit)n.phase='lost';if(n.phase==='won'||n.phase==='lost')n.event=n.phase;
 n.lastGain=n.score-g.score;
 return n;
}
export const stuck=(g:Game)=>g.phase==='choose'&&g.dice.length>0&&g.dice.every(face=>pathFor(g,face).length===0);
export const canRescue=(g:Game)=>!g.lesson&&stuck(g)&&!g.rescueUsed;
/** One retry per turn, only when ALL offered directions are blocked. RNG is never forced. */
export function rescue(g:Game):Game {
 if(!canRescue(g))return g;
 const n=roll({...g,phase:'ready',rescueUsed:true,rescues:g.rescues+1});
 return {...n,event:'rescue',eventN:n.dice.length};
}
export function waitTurn(g:Game):Game{if(!stuck(g)||canRescue(g))return g;const turn=g.turn+1;return {...g,turn,action:0,moves:g.moves+1,waits:g.waits+1,rescueUsed:false,crashed:false,phase:turn>=g.limit?'lost':'ready',dice:[],charge:0,combo:0,comboGap:0,broke:g.combo>0,event:turn>=g.limit?'lost':'wait',eventN:0,lastGain:0,lastPath:[]};}

/** The exact result of a visible choice, computed without advancing dice RNG. */
export function forecast(g:Game,face:number){
 const n=move(g,face);if(n===g)return null;
 return {path:n.lastPath,food:n.nutrients-g.nutrients,gain:n.score-g.score,combo:n.combo,comboGap:n.comboGap,broke:n.broke,crashed:n.crashed,refuel:n.turn===g.turn,zone:zone(n),won:n.phase==='won',lost:n.phase==='lost'};
}
