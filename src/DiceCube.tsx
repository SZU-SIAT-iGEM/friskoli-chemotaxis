import type {CSSProperties} from 'react';
const PIPS=[[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]];
const ROTATIONS=[[0,0],[0,-90],[-90,0],[90,0],[0,90],[0,180]];
export default function DiceCube({face,index=0,rolling=false}:{face:number;index?:number;rolling?:boolean}){
 if(face<0)return <span className={`negated-die ${rolling?'negating':''}`}><DiceCube face={-face} index={index} rolling={rolling}/><span className="negation-cross" aria-hidden="true">×</span></span>;
 if(face===0)return <span className="physical-die locked-die" aria-hidden="true"><span className="lock-shackle"/><span className="lock-body">−</span></span>;
 const [x,y]=ROTATIONS[face-1]??ROTATIONS[0];
 return <span className={`physical-die ${rolling?'tumbling':''}`} style={{'--rx':`${x}deg`,'--ry':`${y}deg`,'--delay':`${index*90}ms`,'--toss':`${(index%2?1:-1)*(35+index*12)}px`,'--tilt':`${(index-1)*7}deg`} as CSSProperties} aria-hidden="true">
  <span className="cube-shadow"/><span className="cube-flight"><span className="cube-solid">{PIPS.map((pips,i)=><span className={`cube-side side-${i+1}`} key={i} style={{'--face-color':`var(--dir-${i+1})`} as CSSProperties}>{Array.from({length:9},(_,j)=><i key={j} className={pips.includes(j)?'cube-pip on':'cube-pip'}/>)}</span>)}</span></span>
 </span>;
}
