import {useEffect,useState,type CSSProperties} from 'react';
import {RULES,type Game} from './game/engine';
import type {Translate} from './i18n';
export function CountUp({value,duration=650}:{value:number;duration?:number}){
 const [shown,setShown]=useState(value);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');if(media.matches){setShown(value);return;}let id=0;const start=performance.now(),from=shown;const frame=(now:number)=>{const p=Math.min(1,(now-start)/duration);setShown(Math.round(from+(value-from)*(1-Math.pow(1-p,3))));if(p<1)id=requestAnimationFrame(frame);};id=requestAnimationFrame(frame);const finish=()=>{if(media.matches){cancelAnimationFrame(id);setShown(value);}};media.addEventListener('change',finish);return()=>{cancelAnimationFrame(id);media.removeEventListener('change',finish);};},[value,duration]);
 return <>{shown}</>;
}
export function ComboBanner({game,t}:{game:Game;t:Translate}){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{if(!game.moves||(!game.lastGain&&!game.broke)){setVisible(false);return;}setVisible(true);const timer=setTimeout(()=>setVisible(false),2400);return()=>clearTimeout(timer);},[game.moves,game.seed,game.rolls]);
 if(!visible||game.phase==='won'||game.phase==='lost')return null;const broken=game.combo===0;
 return <div key={`${game.seed}-${game.moves}`} className={`combo-banner ${broken?'broken':game.combo>=3?'hot':''}`} role="status"><span className="combo-slash"/><div><small>{t(broken?'streakEnded':game.event==='refuel'?'refuelBanner':'streakGrowing')}</small><strong>{broken?t('comboBreakMark'):<>COMBO <b>×{game.combo}</b></>}</strong><span>{broken?t('comboTryAgain'):`+${game.lastGain} ${t('scoreUnit')}`}</span></div></div>;
}
export function ResultCelebration({game,t}:{game:Game;t:Translate}){
 const won=game.phase==='won',spare=won?Math.max(0,game.limit-game.turn)*RULES.spareTurnPoints:0,feeding=won?(game.score-spare)/RULES.finishMultiplier:game.score,finish=won?feeding*(RULES.finishMultiplier-1):0;const [target,setTarget]=useState(0);useEffect(()=>{setTarget(game.score);},[game.score]);
 return <div className={`result-celebration ${won?'victory':'journey-end'}`}>
  {won&&<div className="confetti" aria-hidden="true">{Array.from({length:22},(_,i)=><i key={i} style={{'--i':i,'--x':`${(i*37)%100}%`,'--spin':`${i*41}deg`} as CSSProperties}/>)}</div>}
  <span className="result-stamp">{t(won?'victoryStamp':'journeyStamp')}</span><div className="final-score" aria-label={`${t('score')} ${game.score}`}><CountUp value={target} duration={1400}/><small>{t('scoreUnit')}</small></div>
  <div className="score-breakdown"><span>{t('feedingScore')}<b>{game.score-finish-spare}</b></span><span>{t('finishScore')}<b>+{finish}</b></span><span>{t('timeScore')}<b>+{spare}</b></span></div><div className="result-highlights"><span><b>×{game.bestCombo}</b>{t('bestCombo')}</span><span><b>{game.nutrients}</b>{t('nutrients')}</span><span><b>{game.longRuns}</b>{t('longRunLabel')}</span></div>
 </div>;
}
