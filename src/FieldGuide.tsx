import type {Translate} from './i18n';
export const GUIDE_TILES=['cell','nutrient','rich','empty','depleted','repellent','wall','goal'] as const;
export function TileRule({kind,t}:{kind:string;t:Translate}){
 return <><span className={`guide-tile guide-${kind}`} aria-hidden="true">{({cell:'◉',nutrient:'●',rich:'·',empty:'',depleted:'≋',consumed:'≋',repellent:'−',wall:'×',goal:'⚑'} as Record<string,string>)[kind]}</span><div className="tile-rule-copy"><strong>{t(`object_${kind}`)}</strong><p>{t(`explain_${kind}`)}</p>{kind==='wall'&&<div className="wall-example"><div className="wall-demo" aria-hidden="true"><span className="wall-demo-cell">◉</span><i>→</i><span className="wall-demo-stop">◎</span><i className="wall-demo-block">↛</i><span className="wall-demo-wall">×</span></div><small>{t('wallExample')}</small></div>}</div></>;
}
export default function FieldGuide({t}:{t:Translate}){
 return <div className="field-guide"><p className="guide-intro">{t('guideIntro')}</p><div className="guide-steps">{['roll','choose','repeat'].map((s,i)=><div key={s}><b>0{i+1}</b><strong>{t(`guide_${s}`)}</strong><p>{t(`guide_${s}_body`)}</p></div>)}</div><h3>{t('objectGuide')}</h3><div className="object-grid">{GUIDE_TILES.map(kind=><article key={kind}><TileRule kind={kind} t={t}/></article>)}</div><p className="zone-priority">{t('zonePriority')}</p></div>;
}
