import type {State} from '../domain';
import {growth,RANKS} from '../domain/growth';
import {achievementProgress,equipTitle,MASTERY_RULE} from '../domain/achievements';
import {AchievementIcon,CoinIcon,LockIcon,RankBadge,StarIcon,XpIcon} from './GameIcons';
import {ExamPanel} from './ExamPanel';
import {XpProgress} from './XpProgress';
export function GrowthPage({state,onCommit,onError}:{state:State;onCommit:(next:State)=>boolean;onError:(message:string)=>void}) {
  const rank=growth(state);
  return <>
    <div className="page-head"><div><div className="eyebrow">每一点努力，都有回响</div><h1>我的成长档案</h1><p>经验陪你慢慢长大，猪头币帮你收藏喜欢的卡片。</p></div></div>
    <section className="panel growth-current">
      <RankBadge tier={rank.index} size={112}/>
      <div><h2>{rank.name} <span className="rank-stars" role="img" aria-label={`${rank.stars}星，共${rank.maxStars}星`}>{Array.from({length:rank.maxStars},(_,i)=><span aria-hidden="true" key={i}><StarIcon filled={i<rank.stars} size={20}/></span>)}</span></h2>
        <p className="growth-total">一路积累 <strong className="icon-amount" role="img" aria-label={`${state.xp}经验`}><span aria-hidden="true"><XpIcon/></span>{state.xp}</strong></p>
        <XpProgress state={state}/>
        <p>{rank.gateReady?'准备好迎接新段位啦！通过晋级测试，带着已积累的经验继续出发。':rank.nextTier===null&&rank.stars===rank.maxStars?'星星已经全部点亮，新的努力仍会留下记录。':'每一次认真练习，都离下一颗星更近一点。'}</p>
        <p className="growth-reward">独立答对，收获 <span className="icon-amount" role="img" aria-label="5经验"><span aria-hidden="true"><XpIcon size={18}/></span>5</span> 与 <span className="coin-amount" role="img" aria-label="1猪头币"><span aria-hidden="true"><CoinIcon size={19}/></span>1</span>。答错也没关系，再试一次。</p>
      </div>
    </section>
    <div className="rank-track" aria-label="六段成长轨道">{RANKS.map((r,i)=><div key={r.name} className={'rank-stop '+(i===rank.index?'current':i<rank.index?'reached':'')}><RankBadge tier={i} size={78}/><strong>{r.name}</strong><small className="rank-step"><span className="icon-amount" role="img" aria-label={`${r.stars}星`}><span aria-hidden="true"><StarIcon size={15}/></span>{r.stars}</span><span className="rank-step-divider">·</span><span className="icon-amount" role="img" aria-label={`每步${r.step}经验`}>每步 <span aria-hidden="true"><XpIcon size={16}/></span>{r.step}</span></small><span>{i===rank.index?'当前段位':i<rank.index?'已抵达':'未来的纪念'}</span></div>)}</div>
    <ExamPanel state={state} onCommit={onCommit} onError={onError}/>
    <div className="page-head"><div><h2>成就与称号</h2><p>把认真学习的小日子，变成属于你的纪念。</p></div></div>
    <div className="achievement-grid">{achievementProgress(state).map(a=><section className={'panel achievement rarity-'+a.rarity+' '+(a.unlocked&&!a.unlocked.baseline?'unlocked':'')} key={a.id}>
      <div className="achievement-heading"><span aria-hidden="true"><AchievementIcon rarity={a.rarity} size={34}/></span><h3>{a.title}</h3><span className="rarity-label">{{common:'朴素',uncommon:'进阶',rare:'珍稀',epic:'卓越',legendary:'传说'}[a.rarity]}</span></div>
      <div className="achievement-progress"><div className="achievement-progress-label"><span>{a.metric==='streak'?'连续学习':a.metric==='days'?'累计学习':a.metric==='learned'?'初识汉字':a.metric==='collection'?'卡片收藏':'掌握汉字'}</span><strong>{Math.min(a.progress,a.target)} / {a.target} {a.metric==='learned'||a.metric==='mastered'?'字':a.metric==='collection'?'张':'天'}</strong></div><progress max={a.target} value={Math.min(a.progress,a.target)} aria-label={`${a.title}成就进度`}/></div>
      <div className="achievement-meta"><span className="coin-amount" role="img" aria-label={`解锁奖励${a.coins}猪头币`}>奖励 <span aria-hidden="true"><CoinIcon size={19}/></span><strong>{a.coins}</strong></span><span className="achievement-status">{a.unlocked?(a.unlocked.baseline?'已记录':'已解锁'):<><span aria-hidden="true"><LockIcon size={15}/></span>待点亮</>}</span></div>
      {a.unlocked?<div className="achievement-footer"><small>{a.unlocked.date}{a.unlocked.baseline?' · 历史记录':''}</small>{!a.unlocked.baseline&&<button className={state.equippedTitle===a.id?'primary':'secondary'} onClick={()=>{try{onCommit(equipTitle(state,state.equippedTitle===a.id?null:a.id))}catch(e){onError(String(e))}}}>{state.equippedTitle===a.id?'卸下称号':'佩戴称号'}</button>}</div>:<p className="achievement-hint">再积累一点，纪念就会自动点亮。</p>}
    </section>)}</div>
    <details className="growth-rules"><summary>给大人的成长说明</summary><p>经验只累积，不扣减；猪头币的花费不影响段位。到晋级门后，溢出经验保留；最高段满星后仍记录经验。</p><p>有效无提示独立核验每次奖励 <span className="icon-amount" role="img" aria-label="5经验"><span aria-hidden="true"><XpIcon size={17}/></span>5</span> + <span className="coin-amount" role="img" aria-label="1猪头币"><span aria-hidden="true"><CoinIcon size={17}/></span>1</span>。同字同日共享最多 2 次独立奖励，每日最多 <span className="icon-amount" role="img" aria-label="150经验"><span aria-hidden="true"><XpIcon size={17}/></span>150</span> / <span className="coin-amount" role="img" aria-label="30猪头币"><span aria-hidden="true"><CoinIcon size={17}/></span>30</span>。达到额度仍可练习，答错不扣资产。</p><p>{MASTERY_RULE} 每项成就只解锁一次，历史基线不补发奖励或称号。</p><p>打卡需要有效无提示独立核验，辅助题不计入打卡。数据保存在本机，可备份恢复，但不是防篡改凭证。</p></details>
  </>;
}
