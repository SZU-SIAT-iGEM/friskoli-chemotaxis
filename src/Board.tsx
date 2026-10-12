import {useEffect,useRef,useState,type CSSProperties,type ReactNode,type PointerEvent as ReactPointerEvent} from 'react';
import {ARROWS,LESSON_FACES,coords,distance,hasFood,pathFor,runLength,zone,type Game} from './game/engine';
import type {Translate} from './i18n';
import cell from './assets/cell.png';
import {clampView,panView,pinchView,zoomView,type View,type Point} from './game/viewport';
import {directionStyle} from './directions';

type Props={overlay?:ReactNode;game:Game;t:Translate;preview:string[];onMove:(face:number,steps?:number)=>void;onConfirm:(face:number)=>void;onInspect:(id:string|null)=>void;active:boolean;onBusy:(busy:boolean)=>void};
export default function Board({game,t,preview,onMove,onConfirm,onInspect,active,onBusy,overlay}:Props){
 const frames=game.world?.frames;
 const [frame,setFrame]=useState(0),[revealing,setRevealing]=useState(true);
 const [zoom,setZoom]=useState(1),[center,setCenter]=useState([320,260]),[follow,setFollow]=useState(true),[visualPos,setVisualPos]=useState(game.pos);
 const svgRef=useRef<SVGSVGElement>(null),points=useRef(new Map<number,Point>()),suppressed=useRef(false),lastTap=useRef<{key:string;at:number;move:number;roll:number}|null>(null);
 const viewRef=useRef<View>({zoom,center});viewRef.current={zoom,center};
 const gesture=useRef<{view:View;points:Point[]}|null>(null);
 const applyView=(v:View)=>{viewRef.current=v;setZoom(v.zoom);setCenter(v.center);};
 const scale=Math.min(42,228/(1.5*game.radius+1)),big=game.radius>3;
 const xy=(q:number,r:number)=>[320+Math.sqrt(3)*scale*(q+r/2),260+1.5*scale*r];
 const point=(id:string)=>xy(...coords(id)).join(',');
 const hexPoints=Array.from({length:6},(_,i)=>{const a=(i*60-30)*Math.PI/180;return `${(scale-1.5)*Math.cos(a)},${(scale-1.5)*Math.sin(a)}`;}).join(' ');
 const ready=!revealing,shown=frames?.[frame],isFinal=!frames||frame===frames.length-1;
 const previewFace=preview.length?game.dice.find(f=>f>0&&pathFor(game,f).includes(preview[0])):undefined;
 const clampCenter=(value:number[],z=zoom)=>[Math.max(320/z,Math.min(640-320/z,value[0])),Math.max(260/z,Math.min(520-260/z,value[1]))];
 useEffect(()=>{
  onBusy(true);
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const finish=()=>{setFrame((frames?.length??1)-1);setRevealing(false);onBusy(false);};
  if(preference.matches){finish();return;}
  const timers:Array<ReturnType<typeof setTimeout>>=[];
  if(frames)for(let i=1;i<frames.length;i++)timers.push(setTimeout(()=>setFrame(i),600+(i-1)*200));
  timers.push(setTimeout(()=>{setRevealing(false);onBusy(false);},frames?1900:700));
  const changed=()=>{if(preference.matches){timers.forEach(clearTimeout);finish();}};
  preference.addEventListener('change',changed);
  return()=>{timers.forEach(clearTimeout);preference.removeEventListener('change',changed);};
 },[frames,onBusy]);
 useEffect(()=>{
  const path=game.lastPath.length?game.lastPath:[game.pos];
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  if(preference.matches){setVisualPos(game.pos);return;}
  const timers=path.map((id,i)=>setTimeout(()=>setVisualPos(id),i*150));
  const changed=()=>{if(preference.matches){timers.forEach(clearTimeout);setVisualPos(game.pos);}};
  preference.addEventListener('change',changed);
  return()=>{timers.forEach(clearTimeout);preference.removeEventListener('change',changed);};
 },[game.moves,game.pos,game.lastPath]);
 useEffect(()=>{if(follow&&zoom>1)setCenter(clampCenter(xy(...coords(visualPos))));},[visualPos,follow,zoom]);
 const adjustZoom=(amount:number)=>{const next=Math.max(1,Math.min(2.8,Math.round((zoom+amount)*10)/10));setZoom(next);setCenter(clampCenter(follow?xy(...coords(visualPos)):center,next));};
 const rebase=()=>{gesture.current={view:viewRef.current,points:[...points.current.values()]};};
 const pointerDown=(e:ReactPointerEvent<SVGSVGElement>)=>{if(e.button!==0)return;if(!points.current.size)suppressed.current=false;points.current.set(e.pointerId,{x:e.clientX,y:e.clientY});rebase();if(points.current.size>1){suppressed.current=true;lastTap.current=null;for(const id of points.current.keys())e.currentTarget.setPointerCapture(id);}};
 const pointerMove=(e:ReactPointerEvent<SVGSVGElement>)=>{
  if(!points.current.has(e.pointerId)||!gesture.current)return;
  points.current.set(e.pointerId,{x:e.clientX,y:e.clientY});const current=[...points.current.values()],g=gesture.current;
  if(current.length>=2&&g.points.length>=2){setFollow(false);applyView(pinchView(g.view,g.points,current,e.currentTarget.getBoundingClientRect()));return;}
  const dx=current[0].x-g.points[0].x,dy=current[0].y-g.points[0].y;
  if(Math.hypot(dx,dy)>6){suppressed.current=true;lastTap.current=null;}
  if(suppressed.current&&g.view.zoom>1){e.currentTarget.setPointerCapture(e.pointerId);setFollow(false);applyView(panView(g.view,dx,dy,e.currentTarget.getBoundingClientRect()));}
 };
 const pointerEnd=(e:ReactPointerEvent<SVGSVGElement>)=>{if(e.type==='pointercancel')suppressed.current=true;points.current.delete(e.pointerId);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);if(points.current.size)rebase();else gesture.current=null;};
 useEffect(()=>{const svg=svgRef.current;if(!svg||!big)return;const wheel=(e:WheelEvent)=>{
  if(!e.ctrlKey&&!e.metaKey&&viewRef.current.zoom<=1)return;
  e.preventDefault();setFollow(false);const v=viewRef.current,rect=svg.getBoundingClientRect();
  const factor=e.deltaMode===1?16:e.deltaMode===2?rect.height:1;
  applyView(e.ctrlKey||e.metaKey?zoomView(v,v.zoom*Math.exp(-e.deltaY*factor*.008),{x:e.clientX,y:e.clientY},rect):panView(v,-e.deltaX*factor,-e.deltaY*factor,rect));
 };svg.addEventListener('wheel',wheel,{passive:false});return()=>svg.removeEventListener('wheel',wheel);},[big]);
 const status=!frames?t('generationReady',{count:game.tiles.length}):frame===0?t('generationAnchors'):!isFinal?t('generationGrowth',{count:frame}):t('generationReady',{count:game.tiles.length});
 return <>
 <div className="world-toolbar"><span className={`generation-status ${ready?'complete':''}`} role="status"><i/>{status}</span>{big&&<div className="map-zoom"><button type="button" onClick={()=>adjustZoom(-.6)} disabled={zoom<=1} aria-label={t('zoomOut')}>−</button><button type="button" onClick={()=>{setZoom(1);setCenter([320,260]);}} aria-label={t('fitMap')}>{Math.round(zoom*100)}%</button><button type="button" onClick={()=>adjustZoom(.6)} disabled={zoom>=2.8} aria-label={t('zoomIn')}>+</button><button type="button" className="follow-button" aria-label={t('focusCell')} aria-pressed={follow&&zoom>1} onClick={()=>{setFollow(true);if(zoom===1)setZoom(2.2);else setCenter(clampCenter(xy(...coords(game.pos))));}}>◎</button></div>}</div>
 <div className={`board-viewport ${revealing?'is-generating':''} ${zoom>1?'is-zoomed':''}`}>
 <svg ref={svgRef} className={`board ${big?'large-board':''}`} viewBox={`${center[0]-320/zoom} ${center[1]-260/zoom} ${640/zoom} ${520/zoom}`} role="group" tabIndex={big?0:undefined} aria-label={t('boardLabel')} aria-busy={revealing} style={{touchAction:'none'}}
 onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}
 onLostPointerCapture={e=>{if(points.current.has(e.pointerId)){points.current.delete(e.pointerId);suppressed.current=true;rebase();}}}
 onKeyDown={e=>{if(e.target!==e.currentTarget||!big)return;if(e.key==='+'||e.key==='='){e.preventDefault();adjustZoom(.3);}else if(e.key==='-'){e.preventDefault();adjustZoom(-.3);}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();setFollow(false);const v=viewRef.current;applyView(clampView({...v,center:[v.center[0]+(e.key==='ArrowLeft'?-25:e.key==='ArrowRight'?25:0)/v.zoom,v.center[1]+(e.key==='ArrowUp'?-25:e.key==='ArrowDown'?25:0)/v.zoom]}));}}}>
 <defs><pattern id="depleted-pattern" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="var(--depleted)"/><path d="M-2 2L2-2M0 8L8 0M6 10L10 6" stroke="var(--depleted-line)" strokeWidth="1"/></pattern></defs>
 {game.tiles.map(tile=>{
  const [x,y]=xy(tile.q,tile.r),anchor=game.world?.anchors.find(a=>a.key===tile.key);
  const kind=!isFinal?(tile.key===game.goal?'goal':anchor?.type==='repellent'?'repellent':shown?.walls.includes(tile.key)?'wall':shown?.nutrients.includes(tile.key)?'nutrient':'empty'):game.consumed.includes(tile.key)?'consumed':tile.kind;
  const z=isFinal?zone(game,tile.key):game.world?.anchors.some(a=>a.type==='repellent'&&distance(a.key,tile.key)<=1)?'repellent':shown?.nutrients.some(id=>distance(id,tile.key)<=1)?'rich':shown?.depleted.includes(tile.key)?'depleted':'normal';
  let face=active&&ready&&game.phase==='choose'?game.dice.find(f=>pathFor(game,f,runLength(game,f)).includes(tile.key)):undefined;if(game.lesson&&face!==LESSON_FACES[game.moves])face=undefined;
  const reachablePath=face?pathFor(game,face,runLength(game,face)):[],endpoint=reachablePath.at(-1)===tile.key;
  const delay=anchor?0:90+Math.min(...(game.world?.anchors.map(a=>distance(a.key,tile.key))??[distance(game.start,tile.key)]))*42;
  return <g key={tile.key} transform={`translate(${x},${y})`} role={face?'button':'group'} tabIndex={face?0:undefined} aria-label={t('tileLabel',{q:tile.q,r:tile.r,kind:t(kind),zone:t(z)})} onFocus={()=>{if(!face)onInspect(tile.key);}} onClick={()=>{if(suppressed.current)return;if(face){onInspect(null);const now=performance.now(),last=lastTap.current;if(last?.key===tile.key&&last.move===game.moves&&last.roll===game.rolls&&now-last.at<420){lastTap.current=null;onConfirm(face);}else{lastTap.current={key:tile.key,at:now,move:game.moves,roll:game.rolls};onMove(face);}}else{lastTap.current=null;onInspect(tile.key);}}} onKeyDown={e=>{if(face&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onConfirm(face);}}}>
   <title>{t('inspect',{kind:t(kind),zone:t(z)})}{anchor?` · ${t('anchor_'+anchor.type)}`:''}</title>
   <g className="hex-card" style={{...(face?directionStyle(face):{}),'--reveal-delay':`${delay}ms`} as CSSProperties}>
    <g key={kind==='consumed'?'consumed':'intact'} className={kind==='consumed'?'tile-consumed':''}>
     <polygon points={hexPoints} className={`hex ${kind==='wall'?'wall':z} ${face?'available':''} ${endpoint?'reachable-end':''} ${preview.includes(tile.key)?'preview':''} ${game.pos===tile.key?'occupied':''}`}/>
     {(isFinal?hasFood(game,tile.key):kind==='nutrient')&&<g className="nutrient-icon"><circle r={scale*.235} fill="#ffb72f" stroke="#bd7410" strokeWidth="1.2"/><circle cx={-scale*.07} cy={-scale*.07} r={scale*.05} fill="#fff4d2"/></g>}
     {kind==='repellent'&&<><circle className="repel-node" r={scale*.3} fill="#edc1bd" stroke="#b36b62"/><path d={`M${-scale*.13} 0h${scale*.26}`} stroke="#954b44" strokeWidth="2"/><path d={`M0 ${-scale*.45}v${-scale*.18}m${-scale*.08} ${scale*.08}l${scale*.08} ${-scale*.08}l${scale*.08} ${scale*.08}`} fill="none" stroke="#b36b62" strokeWidth="1.2"/></>}
     {kind==='wall'&&<path d={`M${-scale*.16} ${-scale*.16}l${scale*.32} ${scale*.32}m${-scale*.32} 0l${scale*.32} ${-scale*.32}`} stroke="#dfe8e7" strokeWidth="1.5"/>}
     {kind==='goal'&&<><circle r={scale*.64} fill="#d4ebe2" stroke="#0a7967" strokeWidth="1.5"/>{big?<path d={`M${-scale*.2} ${scale*.3}v${-scale*.6}l${scale*.48} ${scale*.15}l${-scale*.48} ${scale*.15}`} fill="#087c67" stroke="#087c67" strokeWidth="1.5"/>:<text y="5" textAnchor="middle" className="goal-label">{t('goal')}</text>}</>}
     {kind==='consumed'&&game.pos!==tile.key&&<circle r={scale*.07} fill="#a6b9ac"/>}
     {endpoint&&<circle className="endpoint-ring" r={scale*.76} pointerEvents="none"/>}
     {face&&kind!=='goal'&&<text x={scale*.38} y={-scale*.37} className="face-label" style={{fontSize:`${Math.max(9,scale*.29)}px`}}>{face}</text>}
     {tile.key===game.start&&game.pos!==tile.key&&(big?<circle r={scale*.21} fill="none" stroke="#566e63" strokeWidth="1.5"/>:<text y="5" textAnchor="middle" className="start-label">{t('start')}</text>)}
    </g>
    {anchor&&<polygon points={hexPoints} className={`anchor-outline ${frame===0&&revealing?'seed-pulse':''}`}><title>{t('anchor_'+anchor.type)}</title></polygon>}
   </g>
  </g>;
 })}
 {ready&&game.tiles.filter(tile=>tile.kind==='repellent').map(tile=>{const [x,y]=xy(tile.q,tile.r);return <g key={`field-${tile.key}`} transform={`translate(${x},${y})`} pointerEvents="none" className="repel-field"><circle className="repel-range" r={scale*2.55}/><circle className="repel-wave" r={scale*.7} style={{'--range':scale*2.55} as CSSProperties}/><circle className="repel-wave delayed" r={scale*.7} style={{'--range':scale*2.55} as CSSProperties}/></g>;})}
 {ready&&<>
 <polyline points={game.trail.map(point).join(' ')} fill="none" stroke="#417e81" opacity=".3" strokeWidth="2.5" strokeDasharray="4 5" pointerEvents="none"/>
 {preview.length>0&&<g key={`${game.moves}-${preview.join(';')}`} className="route-intent" style={directionStyle(previewFace??1)} pointerEvents="none"><polyline className="route-preview" points={[game.pos,...preview].map(point).join(' ')} fill="none" strokeWidth="3" strokeDasharray="6 5"/>{preview.map((id,i)=>{const [x,y]=xy(...coords(id));return <g key={id} transform={`translate(${x},${y})`}><circle className="route-arrival" r={scale*.6} style={{animationDelay:`${i*110}ms`}}/></g>;})}</g>}
 {game.lastPath.length>0&&(()=>{const [x,y]=xy(...coords(game.pos));return <g key={`landing-${game.moves}`} transform={`translate(${x},${y})`} pointerEvents="none"><circle className={`landing-ring ${game.lastGain>0?'fed':''}`} r={scale*.6}/>{game.lastGain>0&&Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return <circle key={i} className="nutrient-spark" r="2.5" style={{'--spark-x':`${Math.cos(a)*scale*1.35}px`,'--spark-y':`${Math.sin(a)*scale*1.35}px`} as CSSProperties}/>;})}</g>;})()}
 </>}
 {(()=>{const [x,y]=xy(...coords(visualPos));return <g pointerEvents="none" className={`player ${revealing?'player-seed':''}`} style={{transform:`translate(${x}px, ${y}px)`}}>{zone(game)==='depleted'&&<circle className="depletion-tether" r={scale*.94}/>}<g key={visualPos} className="cell-body"><circle r={scale*.65} fill="white" stroke="#14787c" strokeWidth="2"/><image href={cell} x={-scale*.58} y={-scale*.58} width={scale*1.16} height={scale*1.16}/></g>{ready&&active&&game.phase!=='won'&&game.phase!=='lost'&&<g className="cell-directions" aria-hidden="true">{ARROWS.map((_,i)=>{const a=i*Math.PI/3,r=scale*1.03;return <g key={i} className={previewFace===i+1?'chosen':''} transform={`translate(${Math.cos(a)*r},${Math.sin(a)*r})`} style={directionStyle(i+1)}><circle r={Math.max(7,scale*.2)}/><text textAnchor="middle" dominantBaseline="central" style={{fontSize:`${Math.max(10,scale*.29)}px`}}>{i+1}</text></g>;})}</g>}</g>;})()}
 {game.moves>0&&game.phase!=='won'&&game.phase!=='lost'&&(game.event==='refuel'||game.event==='ate'||game.broke)&&(()=>{const [x,y]=xy(...coords(game.pos)),broken=game.combo===0;return <g key={`${game.moves}-${game.combo}`} transform={`translate(${Math.max(center[0]-320/zoom+88/zoom,Math.min(center[0]+320/zoom-88/zoom,x))},${Math.max(center[1]-260/zoom+60/zoom,y-scale-15/zoom)}) scale(${1/zoom})`} pointerEvents="none"><g className={`combo-pop ${broken?'is-break':game.combo>=3?'is-hot':''}`}><rect x="-86" y="-37" width="172" height="52" rx="9"/><text className="combo-pop-number" x="0" y="-13" textAnchor="middle">{broken?t('comboBreakMark'):`COMBO ×${game.combo}`}</text><text className="combo-pop-label" x="0" y="5" textAnchor="middle">{broken?t('comboTryAgain'):t('comboStreak',{points:game.lastGain})}</text></g></g>;})()}
 </svg>
 {overlay}
 {revealing&&frames&&<div className="growth-progress" aria-hidden="true"><span style={{width:`${(frame+1)/frames.length*100}%`}}/></div>}
 </div>
 <div className="board-caption">{game.world&&<span>{t('worldInfo',{count:game.tiles.length,seed:game.world.mapSeed})}</span>}{big&&<span>{t('dragMap')}</span>}</div>
 <div className="compass" aria-hidden="true">{ARROWS.map((arrow,i)=><span key={arrow}><small>{i+1}</small> {arrow}</span>)}</div>
 </>;
}
