import type {State} from '../domain';
import {growth} from '../domain/growth';
import {XpIcon} from './GameIcons';

/** One shared, native meter for the current star, including promotion gates. */
export function XpProgress({state,compact=false,visualOnly=false}:{state:State;compact?:boolean;visualOnly?:boolean}) {
  const rank=growth(state);
  const highest=rank.nextTier===null && rank.stars===rank.maxStars;
  const value=rank.gateReady || highest ? rank.step : Math.max(0,Math.min(rank.step,rank.xpInStar));
  const description=rank.gateReady?'待晋级 · 经验已满，溢出经验保留':highest?'最高段满星 · 经验继续累积':`${value} / ${rank.step} XP`;
  return <div className={`xp-progress${compact?' xp-progress-compact':''}${visualOnly?' xp-progress-visual':''}`}>
    {!visualOnly&&<div className="xp-progress-label"><span>{rank.gateReady?'准备晋级':highest?'全部星星已点亮':compact?'本星经验':'下一颗星的积累'}</span><span className="icon-amount" role="img" aria-label={`${value} / ${rank.step}经验`}><span aria-hidden="true"><XpIcon size={compact?15:18}/></span><strong>{value} / {rank.step}</strong></span></div>}
    {visualOnly?<><span className="xp-progress-mark" aria-hidden="true"><XpIcon size={18}/></span><progress max={rank.step} value={value} aria-label="本星经验" aria-valuetext={description}/></>:<progress max={rank.step} value={value} aria-label="本星经验" aria-valuetext={description}/>}
  </div>;
}
